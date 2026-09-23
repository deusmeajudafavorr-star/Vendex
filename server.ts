import express from 'express';
import {
  getDriveDatabase,
  saveDriveDatabase,
  recordAnalyticsEvent,
  flushAnalytics,
  invalidateCache
} from './src/server/storage.ts';
import { VideoItem, ShareRecord, UserPriorityProfile, PrioritySettings } from './src/types.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to extract OAuth Bearer token
function getBearerToken(req: express.Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

// Helper to ensure database collections exist
function ensureDatabaseDefaults(data: any): void {
  if (!data.priority_settings) {
    data.priority_settings = {
      enabled: true,
      shares_required: 1,
      frequency: 'daily',
      duration_hours: 24,
      default_priority_hours: 24,
      system_message: 'Compartilhe 1 oferta por dia e desbloqueie os vídeos fresquinhos antes de todo mundo!'
    };
  }
  if (!data.shares) data.shares = [];
  if (!data.user_profiles) data.user_profiles = {};
}

// 1. GET /api/videos - Feed pagination, active only, search by tag, query, ordering, priority checks
app.get('/api/videos', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 5));
    const tag = (req.query.tag as string)?.trim().toLowerCase();
    const search = (req.query.search as string)?.trim().toLowerCase();
    const isPriorityUser = req.query.isPriority === 'true' || req.headers['x-vendex-priority'] === 'true';
    const token = getBearerToken(req);

    const { data, source } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);

    let videos = (data.videos || []).filter((v: VideoItem) => v.active === true);

    // Filter by tag if requested
    if (tag) {
      videos = videos.filter((v: VideoItem) => 
        v.tags?.some((t: string) => t.toLowerCase() === tag) ||
        v.title.toLowerCase().includes(tag) ||
        v.description.toLowerCase().includes(tag)
      );
    }

    // Filter by search query if requested
    if (search) {
      videos = videos.filter((v: VideoItem) =>
        v.title.toLowerCase().includes(search) ||
        v.description.toLowerCase().includes(search) ||
        v.tags?.some((t: string) => t.toLowerCase().includes(search))
      );
    }

    // Sort by position ascending
    videos.sort((a: VideoItem, b: VideoItem) => (a.position || 0) - (b.position || 0));

    // Handle priority release logic
    const now = Date.now();
    const processedVideos = videos.map((v: VideoItem) => {
      const isPriorityRelease = v.priority_release === true;
      const isStillPriorityWindow = Boolean(
        isPriorityRelease &&
        v.priority_expires_at &&
        new Date(v.priority_expires_at).getTime() > now
      );

      // If it is in priority window and user is not priority, mark as locked
      const isLocked = isStillPriorityWindow && !isPriorityUser;

      return {
        ...v,
        priority_release: isPriorityRelease && isStillPriorityWindow,
        is_locked_priority: isLocked,
      };
    });

    const total = processedVideos.length;
    const startIndex = (page - 1) * limit;
    const paginated = processedVideos.slice(startIndex, startIndex + limit);

    // Extract all distinct tags for quick exploration
    const allTags = Array.from(new Set(
      data.videos
        .filter((v: VideoItem) => v.active)
        .flatMap((v: VideoItem) => v.tags || [])
    )).filter(Boolean);

    res.json({
      videos: paginated,
      pagination: {
        page,
        limit,
        total,
        hasMore: startIndex + limit < total,
      },
      tags: allTags,
      priority_settings: data.priority_settings,
      version: data.settings?.version || 1,
      source
    });
  } catch (err: any) {
    console.error('[API /api/videos] Error:', err);
    res.status(500).json({ error: 'Erro ao carregar vídeos do feed', details: err?.message });
  }
});

// 2. GET /api/videos/:id - Single video info
app.get('/api/videos/:id', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const { data } = await getDriveDatabase(token);
    const video = data.videos.find((v: VideoItem) => v.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }
    res.json(video);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar vídeo', details: err?.message });
  }
});

// 3. POST /api/analytics - Record event (view, click, download, share) buffered
app.post('/api/analytics', (req, res) => {
  const { videoId, type } = req.body;
  if (!videoId || !type) {
    return res.status(400).json({ error: 'videoId and type are required' });
  }
  recordAnalyticsEvent(videoId, type);
  res.json({ success: true });
});

// 4. GET /api/admin/videos - Admin view with stats, all videos (drafts, inactives), filtering
app.get('/api/admin/videos', async (req, res) => {
  try {
    // Flush buffered analytics first so admin sees up to date numbers
    await flushAnalytics();

    const token = getBearerToken(req);
    const { data, source, driveFileId } = await getDriveDatabase(token);

    const filter = (req.query.filter as string) || 'all';
    const search = ((req.query.search as string) || '').toLowerCase();

    let list = [...data.videos];

    if (search) {
      list = list.filter((v: VideoItem) =>
        v.title.toLowerCase().includes(search) ||
        v.description.toLowerCase().includes(search) ||
        v.tags?.some((t: string) => t.toLowerCase().includes(search))
      );
    }

    if (filter === 'active') {
      list = list.filter((v: VideoItem) => v.active === true);
    } else if (filter === 'inactive') {
      list = list.filter((v: VideoItem) => v.active === false);
    } else if (filter === 'most_viewed') {
      list.sort((a: VideoItem, b: VideoItem) => (b.views || 0) - (a.views || 0));
    } else if (filter === 'most_clicked') {
      list.sort((a: VideoItem, b: VideoItem) => (b.clicks || 0) - (a.clicks || 0));
    } else if (filter === 'most_downloaded') {
      list.sort((a: VideoItem, b: VideoItem) => (b.downloads || 0) - (a.downloads || 0));
    } else {
      list.sort((a: VideoItem, b: VideoItem) => (a.position || 0) - (b.position || 0));
    }

    // Dashboard aggregated stats
    const totalViews = data.videos.reduce((sum: number, v: VideoItem) => sum + (v.views || 0), 0);
    const totalClicks = data.videos.reduce((sum: number, v: VideoItem) => sum + (v.clicks || 0), 0);
    const totalDownloads = data.videos.reduce((sum: number, v: VideoItem) => sum + (v.downloads || 0), 0);
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

    res.json({
      videos: list,
      stats: {
        totalVideos: data.videos.length,
        activeVideos: data.videos.filter((v: VideoItem) => v.active).length,
        totalViews,
        totalClicks,
        totalDownloads,
        ctr: `${ctr}%`,
      },
      settings: data.settings,
      source,
      driveFileId
    });
  } catch (err: any) {
    console.error('[API /api/admin/videos] Error:', err);
    res.status(500).json({ error: 'Erro ao carregar lista de administração', details: err?.message });
  }
});

// 5. POST /api/admin/videos - Create new video
app.post('/api/admin/videos', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const newVideoData: Partial<VideoItem> = req.body.video;
    const expectedVersion = req.body.expectedVersion;

    if (!newVideoData || !newVideoData.video_url || !newVideoData.title) {
      return res.status(400).json({ error: 'video_url e title são obrigatórios' });
    }

    const { data } = await getDriveDatabase(token);

    // Duplicate check on video_url
    const duplicate = data.videos.find((v: VideoItem) => v.video_url.trim().toLowerCase() === newVideoData.video_url!.trim().toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: 'Este vídeo já está cadastrado no VendeX.' });
    }

    // Auto generate ID
    const newId = `video_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    const position = Number(newVideoData.position) || (data.videos.length + 1);

    const isPriority = newVideoData.priority_release === true || newVideoData.priority_release === ('true' as any);
    const durationHours = Number(newVideoData.priority_duration_hours) || 24;
    const priorityExpiresAt = isPriority
      ? new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
      : undefined;

    const videoItem: VideoItem = {
      id: newId,
      video_url: newVideoData.video_url.trim(),
      download_url: newVideoData.download_url?.trim() || newVideoData.video_url.trim(),
      product_url: newVideoData.product_url?.trim() || '',
      affiliate_url: newVideoData.affiliate_url?.trim() || newVideoData.product_url?.trim() || '',
      title: newVideoData.title.trim(),
      description: newVideoData.description?.trim() || '',
      thumbnail_url: newVideoData.thumbnail_url?.trim() || '',
      allow_download: newVideoData.allow_download !== false,
      active: newVideoData.active !== false,
      position,
      tags: Array.isArray(newVideoData.tags) ? newVideoData.tags.map((t: string) => t.trim()).filter(Boolean) : [],
      price: newVideoData.price?.trim(),
      discount: newVideoData.discount?.trim(),
      priority_release: isPriority,
      priority_duration_hours: durationHours,
      priority_expires_at: priorityExpiresAt,
      views: 0,
      clicks: 0,
      downloads: 0,
      shares: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.videos.push(videoItem);

    const saveResult = await saveDriveDatabase(data, token, expectedVersion);
    if (!saveResult.success) {
      return res.status(409).json(saveResult);
    }

    res.status(201).json({ success: true, video: videoItem, version: saveResult.version });
  } catch (err: any) {
    console.error('[API POST /api/admin/videos] Error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar vídeo', details: err?.message });
  }
});

// 6. PUT /api/admin/videos/:id - Update video
app.put('/api/admin/videos/:id', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const videoId = req.params.id;
    const updates: Partial<VideoItem> = req.body.video;
    const expectedVersion = req.body.expectedVersion;

    const { data } = await getDriveDatabase(token);
    const index = data.videos.findIndex((v: VideoItem) => v.id === videoId);

    if (index === -1) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    // Check duplicate video_url if updated
    if (updates.video_url && updates.video_url.trim().toLowerCase() !== data.videos[index].video_url.toLowerCase()) {
      const duplicate = data.videos.find((v: VideoItem) => v.id !== videoId && v.video_url.toLowerCase() === updates.video_url!.trim().toLowerCase());
      if (duplicate) {
        return res.status(409).json({ error: 'Este vídeo já está cadastrado em outro produto.' });
      }
    }

    const current = data.videos[index];

    let priority_expires_at = current.priority_expires_at;
    let priority_release = current.priority_release;
    let priority_duration_hours = current.priority_duration_hours || 24;

    if (updates.priority_release !== undefined) {
      priority_release = updates.priority_release === true || updates.priority_release === ('true' as any);
      if (updates.priority_duration_hours !== undefined) {
        priority_duration_hours = Number(updates.priority_duration_hours) || 24;
      }
      if (priority_release) {
        priority_expires_at = new Date(Date.now() + priority_duration_hours * 3600 * 1000).toISOString();
      } else {
        priority_expires_at = undefined;
      }
    }

    const updatedVideo: VideoItem = {
      ...current,
      ...updates,
      id: current.id, // preserve id
      download_url: updates.download_url?.trim() || updates.video_url?.trim() || current.download_url,
      priority_release,
      priority_duration_hours,
      priority_expires_at,
      updated_at: new Date().toISOString()
    };

    data.videos[index] = updatedVideo;

    const saveResult = await saveDriveDatabase(data, token, expectedVersion);
    if (!saveResult.success) {
      return res.status(409).json(saveResult);
    }

    res.json({ success: true, video: updatedVideo, version: saveResult.version });
  } catch (err: any) {
    console.error('[API PUT /api/admin/videos/:id] Error:', err);
    res.status(500).json({ error: 'Erro ao atualizar vídeo', details: err?.message });
  }
});

// 7. DELETE /api/admin/videos/:id - Delete video
app.delete('/api/admin/videos/:id', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const videoId = req.params.id;
    const expectedVersion = req.body?.expectedVersion;

    const { data } = await getDriveDatabase(token);
    const index = data.videos.findIndex((v: VideoItem) => v.id === videoId);

    if (index === -1) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    data.videos.splice(index, 1);

    const saveResult = await saveDriveDatabase(data, token, expectedVersion);
    if (!saveResult.success) {
      return res.status(409).json(saveResult);
    }

    res.json({ success: true, version: saveResult.version });
  } catch (err: any) {
    console.error('[API DELETE /api/admin/videos/:id] Error:', err);
    res.status(500).json({ error: 'Erro ao remover vídeo', details: err?.message });
  }
});

// 8. POST /api/admin/import - Batch import (CSV or JSON)
app.post('/api/admin/import', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const { items, expectedVersion } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nenhum registro para importar' });
    }

    const { data } = await getDriveDatabase(token);
    const existingUrls = new Set(data.videos.map((v: VideoItem) => v.video_url.toLowerCase().trim()));

    const imported: VideoItem[] = [];
    const skipped: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const video_url = (item.video_url || '').trim();
      const title = (item.title || item.name || '').trim();

      if (!video_url || !title) {
        skipped.push({ item, reason: 'URL do vídeo e título são obrigatórios' });
        continue;
      }

      if (existingUrls.has(video_url.toLowerCase())) {
        skipped.push({ item, reason: 'Vídeo já cadastrado' });
        continue;
      }

      existingUrls.add(video_url.toLowerCase());

      const newVideo: VideoItem = {
        id: `video_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        video_url,
        download_url: (item.download_url || video_url).trim(),
        product_url: (item.product_url || '').trim(),
        affiliate_url: (item.affiliate_url || item.product_url || '').trim(),
        title,
        description: (item.description || '').trim(),
        thumbnail_url: (item.thumbnail_url || '').trim(),
        allow_download: item.allow_download !== false && item.allow_download !== 'false',
        active: item.active !== false && item.active !== 'false',
        position: Number(item.position) || (data.videos.length + imported.length + 1),
        tags: Array.isArray(item.tags)
          ? item.tags
          : typeof item.tags === 'string'
          ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [],
        price: item.price?.toString().trim(),
        discount: item.discount?.toString().trim(),
        views: 0,
        clicks: 0,
        downloads: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      imported.push(newVideo);
    }

    if (imported.length > 0) {
      data.videos.push(...imported);
      const saveResult = await saveDriveDatabase(data, token, expectedVersion);
      if (!saveResult.success) {
        return res.status(409).json(saveResult);
      }
    }

    res.json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped
    });
  } catch (err: any) {
    console.error('[API POST /api/admin/import] Error:', err);
    res.status(500).json({ error: 'Erro ao importar lote', details: err?.message });
  }
});

// 9. POST /api/admin/cache/clear - Invalidate cache manually
app.post('/api/admin/cache/clear', (req, res) => {
  invalidateCache();
  res.json({ success: true, message: 'Cache invalidado com sucesso' });
});

// 10. Metadata / Proxy preview fetcher for product links (OG tags fallback)
app.post('/api/admin/scrape-preview', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    clearTimeout(timeout);

    const html = await resp.text();
    // Simple regex extraction for og:title, og:image, og:description
    const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i);
    const imageMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    const descMatch = html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i);

    res.json({
      title: titleMatch ? titleMatch[1] : '',
      image: imageMatch ? imageMatch[1] : '',
      description: descMatch ? descMatch[1] : '',
    });
  } catch (e: any) {
    res.json({ title: '', image: '', description: '', error: 'Could not fetch external preview' });
  }
});

// ==========================================
// PRIORITY ACCESS / VÍDEO FRESQUINHO ROUTES
// ==========================================

// 11. GET /api/priority/config - Config & System time
app.get('/api/priority/config', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const { data } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);
    res.json({
      settings: data.priority_settings,
      server_time: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar configurações de prioridade', details: err?.message });
  }
});

// 12. GET /api/priority/user/:userId - User priority profile & status
app.get('/api/priority/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = getBearerToken(req);
    const { data } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);

    let profile = data.user_profiles?.[userId];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (!profile) {
      profile = {
        user_id: userId,
        referral_code: `ref_${Math.random().toString(36).substring(2, 8)}`,
        priority_active: false,
        priority_until: null,
        daily_share_count: 0,
        daily_share_date: today,
        share_streak: 0,
        total_shares: 0,
        total_visits: 0,
      };
      data.user_profiles![userId] = profile;
    } else {
      // Check priority expiration
      if (profile.priority_until && new Date(profile.priority_until).getTime() < Date.now()) {
        profile.priority_active = false;
      }
      // Check streak status if date changed
      if (profile.daily_share_date !== today) {
        if (profile.daily_share_date !== yesterday) {
          // Sequence interrupted
          profile.share_streak = 0;
        }
        profile.daily_share_count = 0;
        profile.daily_share_date = today;
      }
    }

    res.json({ profile });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar perfil do usuário', details: err?.message });
  }
});

// 13. POST /api/priority/share - Register a share, compute streak & unlock priority
app.post('/api/priority/share', async (req, res) => {
  try {
    const { user_id, video_id, platform } = req.body;
    if (!user_id || !video_id) {
      return res.status(400).json({ error: 'user_id e video_id são obrigatórios' });
    }

    const token = getBearerToken(req);
    const { data } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);

    const video = data.videos.find((v: VideoItem) => v.id === video_id);
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (!data.user_profiles![user_id]) {
      data.user_profiles![user_id] = {
        user_id,
        referral_code: `ref_${Math.random().toString(36).substring(2, 8)}`,
        priority_active: false,
        priority_until: null,
        daily_share_count: 0,
        daily_share_date: today,
        share_streak: 0,
        total_shares: 0,
        total_visits: 0,
      };
    }

    const profile = data.user_profiles![user_id];

    // Calculate streak
    if (profile.daily_share_date !== today) {
      if (profile.daily_share_date === yesterday && profile.daily_share_count >= 1) {
        profile.share_streak = (profile.share_streak || 0) + 1;
      } else {
        profile.share_streak = 1;
      }
      profile.daily_share_date = today;
      profile.daily_share_count = 1;
    } else {
      profile.daily_share_count = (profile.daily_share_count || 0) + 1;
      if (profile.share_streak === 0) {
        profile.share_streak = 1;
      }
    }

    profile.total_shares = (profile.total_shares || 0) + 1;
    profile.last_share_at = new Date().toISOString();

    // Unlock priority access if required count reached
    const sharesRequired = data.priority_settings?.shares_required || 1;
    let unlockedNow = false;
    if (profile.daily_share_count >= sharesRequired) {
      profile.priority_active = true;
      const durationHours = data.priority_settings?.duration_hours || 24;
      profile.priority_until = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
      unlockedNow = true;
    }

    // Create share record
    const shareId = `s_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const shareRecord: ShareRecord = {
      id: shareId,
      user_id,
      video_id,
      referral_code: profile.referral_code,
      platform: platform || 'web_share',
      created_at: new Date().toISOString(),
      visits: 0,
      visit_logs: [],
    };
    data.shares!.push(shareRecord);

    // Increment video share count
    video.shares = (video.shares || 0) + 1;
    recordAnalyticsEvent(video_id, 'share');

    // Save database
    await saveDriveDatabase(data, token, data.settings.version);

    // Build traceable share URL
    const host = req.get('host') || 'vendex.app';
    const protocol = req.protocol || 'https';
    const shareUrl = `${protocol}://${host}/v/${video_id}?ref=${profile.referral_code}&s=${shareId}`;

    res.json({
      success: true,
      profile,
      share_id: shareId,
      referral_code: profile.referral_code,
      share_url: shareUrl,
      unlockedNow,
      message: unlockedNow
        ? '🎉 ACESSO PRIORITÁRIO LIBERADO! Você está na frente e verá os novos vídeos antes.'
        : `Compartilhamento registrado! (${profile.daily_share_count}/${sharesRequired})`
    });
  } catch (err: any) {
    console.error('[API POST /api/priority/share] Error:', err);
    res.status(500).json({ error: 'Erro ao registrar compartilhamento', details: err?.message });
  }
});

// 14. POST /api/priority/visit - Register a legitimate visit from shared link
app.post('/api/priority/visit', async (req, res) => {
  try {
    const { share_id, referral_code, video_id, visitor_session, source } = req.body;
    if (!share_id && !referral_code) {
      return res.status(400).json({ error: 'share_id ou referral_code obrigatório' });
    }

    const token = getBearerToken(req);
    const { data } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);

    let shareRecord: ShareRecord | undefined;
    if (share_id) {
      shareRecord = data.shares!.find((s: ShareRecord) => s.id === share_id);
    }
    if (!shareRecord && referral_code && video_id) {
      shareRecord = data.shares!.find((s: ShareRecord) => s.referral_code === referral_code && s.video_id === video_id);
    }

    if (shareRecord) {
      if (!shareRecord.visit_logs) shareRecord.visit_logs = [];
      const sessionKey = visitor_session || req.ip || 'visitor';
      const alreadyVisited = shareRecord.visit_logs.some((l) => l.visitor_session === sessionKey);

      if (!alreadyVisited) {
        shareRecord.visits = (shareRecord.visits || 0) + 1;
        shareRecord.visit_logs.push({
          visitor_session: sessionKey,
          timestamp: new Date().toISOString(),
          source: source || 'direct'
        });

        // Credit referrer user total visits
        if (data.user_profiles && data.user_profiles[shareRecord.user_id]) {
          data.user_profiles[shareRecord.user_id].total_visits =
            (data.user_profiles[shareRecord.user_id].total_visits || 0) + 1;
        }

        await saveDriveDatabase(data, token, data.settings.version);
      }

      return res.json({ success: true, visits: shareRecord.visits });
    }

    res.json({ success: false, message: 'Compartilhamento não encontrado' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registrar visita', details: err?.message });
  }
});

// 15. GET /api/admin/priority/metrics - Admin analytics for Priority Access
app.get('/api/admin/priority/metrics', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const { data } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);

    const today = new Date().toISOString().split('T')[0];
    const userProfiles = Object.values(data.user_profiles || {}) as UserPriorityProfile[];
    const shares = data.shares || [];

    const missionsCompletedToday = userProfiles.filter(
      (u) => u.daily_share_date === today && u.daily_share_count >= (data.priority_settings?.shares_required || 1)
    ).length;

    const sharesToday = shares.filter((s) => s.created_at.startsWith(today)).length;

    const now = Date.now();
    const priorityUsersCount = userProfiles.filter(
      (u) => u.priority_active && u.priority_until && new Date(u.priority_until).getTime() > now
    ).length;

    const visitsFromShares = shares.reduce((sum, s) => sum + (s.visits || 0), 0);

    // Top shared videos
    const topSharedVideos = [...data.videos]
      .filter((v: VideoItem) => (v.shares || 0) > 0)
      .sort((a: VideoItem, b: VideoItem) => (b.shares || 0) - (a.shares || 0))
      .slice(0, 5)
      .map((v: VideoItem) => ({
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        shares: v.shares || 0,
        views: v.views || 0,
        clicks: v.clicks || 0,
      }));

    // Funnel stats
    const totalViews = data.videos.reduce((sum: number, v: VideoItem) => sum + (v.views || 0), 0);
    const totalClicks = data.videos.reduce((sum: number, v: VideoItem) => sum + (v.clicks || 0), 0);
    const totalShares = shares.length;

    res.json({
      settings: data.priority_settings,
      metrics: {
        missionsCompletedToday,
        sharesToday,
        priorityUsersCount,
        visitsFromShares,
        totalShares,
        totalVisits: visitsFromShares,
        topSharedVideos,
        funnel: {
          shares: totalShares,
          visits: visitsFromShares,
          views: totalViews,
          clicks: totalClicks,
        },
        recentShares: shares.slice(-10).reverse()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar métricas de prioridade', details: err?.message });
  }
});

// 16. POST /api/admin/priority/settings - Update priority system configuration
app.post('/api/admin/priority/settings', async (req, res) => {
  try {
    const token = getBearerToken(req);
    const { settings, expectedVersion } = req.body;
    const { data } = await getDriveDatabase(token);
    ensureDatabaseDefaults(data);

    data.priority_settings = {
      ...data.priority_settings,
      ...settings,
    };

    const saveResult = await saveDriveDatabase(data, token, expectedVersion);
    if (!saveResult.success) {
      return res.status(409).json(saveResult);
    }

    res.json({ success: true, settings: data.priority_settings, version: saveResult.version });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar configurações de prioridade', details: err?.message });
  }
});

// Vite middleware mounting in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('node:path');
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VendeX Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
