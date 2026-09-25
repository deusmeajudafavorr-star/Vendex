import { VideoItem } from '../types.ts';
import {
  getVideos,
  createVideoInFirebase,
  updateVideoInFirebase,
  deleteVideoInFirebase,
  importBatchInFirebase,
  recordVideoAnalytics,
  getPriorityMetricsFromFirebase,
  savePrioritySettingsInFirebase,
  getFirebaseData
} from './firebaseDb.ts';

/**
 * Fetch videos for the user Feed (direct from Firebase RTDB)
 */
const GITHUB_DATABASE_URL =
  'https://raw.githubusercontent.com/deusmeajudafavorr-star/Vendex/main/project-3c915cd8-d39f-4632-93e-default-rtdb-export.json';

/**
 * Fetch videos for the user Feed directly from the JSON stored in GitHub.
 *
 * The exported Firebase database has this shape:
 * { vendex: { videos: [...], priority_settings: {...}, settings: {...} } }
 *
 * Firebase is intentionally NOT used here. Analytics/admin writes can continue
 * using the existing Firebase API while the public catalog is read from GitHub.
 */
export async function fetchFeedVideos(
  page = 1,
  limit = 5,
  tag?: string,
  search?: string,
  isPriority = false
) {
  try {
    const response = await fetch(GITHUB_DATABASE_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub JSON HTTP ${response.status}`);
    }

    const exportedDatabase = await response.json();
    const vendexData = exportedDatabase?.vendex || {};

    let videos: VideoItem[] = Array.isArray(vendexData.videos)
      ? vendexData.videos
      : [];

    // Public feed: active videos only.
    videos = videos.filter((v: VideoItem) => v.active === true);

    const normalizedTag = tag?.trim().toLowerCase();
    const normalizedSearch = search?.trim().toLowerCase();

    if (normalizedTag && normalizedTag !== 'todos' && normalizedTag !== 'tudo') {
      videos = videos.filter((v: VideoItem) =>
        v.tags?.some((t) => t.toLowerCase() === normalizedTag) ||
        v.title.toLowerCase().includes(normalizedTag) ||
        v.description.toLowerCase().includes(normalizedTag)
      );
    }

    if (normalizedSearch) {
      videos = videos.filter((v: VideoItem) =>
        v.title.toLowerCase().includes(normalizedSearch) ||
        v.description.toLowerCase().includes(normalizedSearch) ||
        v.tags?.some((t) => t.toLowerCase().includes(normalizedSearch))
      );
    }

    // Same ordering used by the existing backend.
    videos.sort(
      (a: VideoItem, b: VideoItem) =>
        (a.position || 0) - (b.position || 0) ||
        new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
    );

    // Preserve the priority-release behavior from the existing feed.
    const now = Date.now();
    videos = videos.map((video: VideoItem) => {
      const priorityRelease = video.priority_release === true;
      const expiresAt = video.priority_expires_at
        ? new Date(video.priority_expires_at).getTime()
        : 0;
      const stillPriority = priorityRelease && expiresAt > now;

      return {
        ...video,
        priority_release: stillPriority,
        is_locked_priority: stillPriority && !isPriority,
      };
    });

    const allTags = Array.from(
      new Set(
        (vendexData.videos || [])
          .filter((v: VideoItem) => v.active)
          .flatMap((v: VideoItem) => v.tags || [])
      )
    ).filter(Boolean);

    const startIndex = (page - 1) * limit;
    const paginatedVideos = videos.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(videos.length / limit) || 1;

    return {
      videos: paginatedVideos,
      page,
      totalPages,
      totalVideos: videos.length,
      pagination: {
        page,
        limit,
        total: videos.length,
        hasMore: startIndex + limit < videos.length,
      },
      tags: allTags,
      source: 'github-json',
      version: vendexData.settings?.version || 1,
      priority_settings: vendexData.priority_settings,
    };
  } catch (err) {
    console.error('Failed to fetch feed videos from GitHub JSON:', err);
    throw err;
  }
}

/**
 * Send real-time analytics events to Firebase Realtime Database
 */
export async function sendAnalytics(videoId: string, type: 'view' | 'click' | 'download' | 'share') {
  try {
    await recordVideoAnalytics(videoId, type);
  } catch (e) {
    console.warn('Analytics event dropped:', e);
  }
}

/**
 * Fetch video list and dashboard analytics for Admin
 */
export async function fetchAdminVideos(filter = 'all', search = '') {
  try {
    const data = await getVideos(filter, search);
    return {
      ...data,
      source: 'firebase',
      databaseUrl: 'https://project-3c915cd8-d39f-4632-93e-default-rtdb.firebaseio.com/',
    };
  } catch (err) {
    console.error('Failed to fetch admin videos from Firebase:', err);
    throw err;
  }
}

/**
 * Create a new video in Firebase Realtime Database
 */
export async function createAdminVideo(video: Partial<VideoItem>, expectedVersion?: number) {
  const created = await createVideoInFirebase(video);
  return { success: true, video: created };
}

/**
 * Update an existing video in Firebase Realtime Database
 */
export async function updateAdminVideo(id: string, video: Partial<VideoItem>, expectedVersion?: number) {
  const updated = await updateVideoInFirebase(id, video);
  return { success: true, video: updated };
}

/**
 * Delete a video from Firebase Realtime Database
 */
export async function deleteAdminVideo(id: string, expectedVersion?: number) {
  await deleteVideoInFirebase(id);
  return { success: true };
}

/**
 * Import batch of videos into Firebase Realtime Database
 */
export async function importBatchVideos(items: any[], expectedVersion?: number) {
  return await importBatchInFirebase(items);
}

/**
 * Sync and reload latest data from Firebase Realtime Database
 */
export async function importRedirectLinks(expectedVersion?: number) {
  const res = await fetch('/api/admin/import-redirect-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.details || 'Erro ao importar links redirecionados');
  return data;
}

export async function clearBackendCache() {
  const data = await getFirebaseData();
  return { success: true, version: data.settings.version };
}

/**
 * Scrape preview helper
 */
export async function scrapeProductPreview(url: string) {
  try {
    const res = await fetch('/api/admin/scrape-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return { success: false };
}

/**
 * Fetch Priority metrics and settings from Firebase Realtime Database
 */
export async function fetchPriorityMetrics() {
  return await getPriorityMetricsFromFirebase();
}

/**
 * Update Priority settings in Firebase Realtime Database
 */
export async function updatePrioritySettings(settings: any, expectedVersion?: number) {
  await savePrioritySettingsInFirebase(settings);
  return { success: true };
}
