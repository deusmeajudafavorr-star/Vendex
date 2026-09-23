/**
 * Firebase Realtime Database Client for VendeX
 * Connects directly to https://project-3c915cd8-d39f-4632-93e-default-rtdb.firebaseio.com/
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue
} from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';
import { DatabaseSchema, VideoItem, PrioritySettings } from '../types.ts';
import { INITIAL_DATABASE } from '../initialData.ts';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const rtdb = getDatabase(
  app,
  firebaseConfig.databaseURL || 'https://project-3c915cd8-d39f-4632-93e-default-rtdb.firebaseio.com'
);

const DB_NODE = 'vendex';

/**
 * Get entire database from Firebase Realtime Database
 */
export async function getFirebaseData(): Promise<DatabaseSchema> {
  try {
    const dbRef = ref(rtdb, DB_NODE);
    const snapshot = await get(dbRef);

    if (snapshot.exists()) {
      const data = snapshot.val() as DatabaseSchema;
      // Ensure arrays and objects exist
      if (!data.videos) data.videos = [];
      if (!Array.isArray(data.videos)) {
        data.videos = Object.values(data.videos);
      }
      if (!data.shares) data.shares = [];
      if (!Array.isArray(data.shares)) {
        data.shares = Object.values(data.shares);
      }
      if (!data.user_profiles) data.user_profiles = {};
      if (!data.priority_settings) {
        data.priority_settings = INITIAL_DATABASE.priority_settings;
      }
      return data;
    }

    // If node does not exist yet, seed with initial database
    await set(dbRef, INITIAL_DATABASE);
    return INITIAL_DATABASE;
  } catch (err) {
    console.warn('[Firebase RTDB] Error fetching data, falling back to local defaults:', err);
    return INITIAL_DATABASE;
  }
}

/**
 * Recursively remove any undefined properties to satisfy Firebase Realtime Database
 */
export function sanitizeForFirebase<T>(val: T): T {
  if (val === undefined) {
    return '' as unknown as T;
  }
  if (val === null) {
    return null as unknown as T;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirebase(item)) as unknown as T;
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        res[k] = sanitizeForFirebase(v);
      }
    }
    return res as unknown as T;
  }
  return val;
}

/**
 * Save entire database to Firebase Realtime Database
 */
export async function saveFirebaseData(data: DatabaseSchema): Promise<void> {
  data.settings.updated_at = new Date().toISOString();
  data.settings.version = (data.settings.version || 1) + 1;
  const cleanData = sanitizeForFirebase(data);
  const dbRef = ref(rtdb, DB_NODE);
  await set(dbRef, cleanData);
}

/**
 * Fetch videos with optional tag and search filters
 */
export async function getVideos(filter = 'all', search = '', isPriority = false): Promise<{
  videos: VideoItem[];
  stats: any;
  settings: any;
}> {
  const db = await getFirebaseData();
  let list = [...(db.videos || [])];

  // If priority request, sort fresh priority videos first
  if (isPriority) {
    list.sort((a, b) => {
      const aPriority = a.priority_release && (!a.priority_expires_at || new Date(a.priority_expires_at) > new Date());
      const bPriority = b.priority_release && (!b.priority_expires_at || new Date(b.priority_expires_at) > new Date());
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      return (a.position || 999) - (b.position || 999);
    });
  }

  // Filter
  if (filter === 'active') {
    list = list.filter((v) => v.active);
  } else if (filter === 'inactive') {
    list = list.filter((v) => !v.active);
  } else if (filter === 'fresh') {
    list = list.filter((v) => v.priority_release);
  }

  // Search
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (v) =>
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Compute stats
  const allVideos = db.videos || [];
  const totalViews = allVideos.reduce((acc, v) => acc + (v.views || 0), 0);
  const totalClicks = allVideos.reduce((acc, v) => acc + (v.clicks || 0), 0);
  const totalDownloads = allVideos.reduce((acc, v) => acc + (v.downloads || 0), 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '0.0%';

  return {
    videos: list,
    stats: {
      totalVideos: allVideos.length,
      activeVideos: allVideos.filter((v) => v.active).length,
      totalViews,
      totalClicks,
      totalDownloads,
      ctr,
    },
    settings: db.settings,
  };
}

/**
 * Create a new video in Firebase Realtime Database
 */
export async function createVideoInFirebase(videoData: Partial<VideoItem>): Promise<VideoItem> {
  const db = await getFirebaseData();
  const id = `video_${Date.now()}`;
  const now = new Date().toISOString();

  const newVideo: VideoItem = {
    id,
    video_url: videoData.video_url || '',
    download_url: videoData.download_url || videoData.video_url || '',
    product_url: videoData.affiliate_url || videoData.product_url || '',
    affiliate_url: videoData.affiliate_url || videoData.product_url || '',
    title: videoData.title || 'Produto VendeX',
    description: videoData.description || '',
    thumbnail_url: videoData.thumbnail_url || undefined,
    allow_download: videoData.allow_download ?? true,
    active: videoData.active ?? true,
    position: videoData.position || (db.videos.length + 1),
    tags: videoData.tags || [],
    price: videoData.price || '',
    discount: videoData.discount || '',
    views: 0,
    clicks: 0,
    downloads: 0,
    shares: 0,
    priority_release: videoData.priority_release || false,
    priority_duration_hours: videoData.priority_duration_hours || 24,
    priority_expires_at: videoData.priority_release
      ? new Date(Date.now() + (videoData.priority_duration_hours || 24) * 3600 * 1000).toISOString()
      : undefined,
    created_at: now,
    updated_at: now,
  };

  db.videos.unshift(newVideo);
  await saveFirebaseData(db);
  return newVideo;
}

/**
 * Update an existing video in Firebase Realtime Database
 */
export async function updateVideoInFirebase(id: string, updates: Partial<VideoItem>): Promise<VideoItem> {
  const db = await getFirebaseData();
  const index = db.videos.findIndex((v) => v.id === id);
  if (index === -1) {
    throw new Error(`Vídeo ${id} não encontrado no banco`);
  }

  const existing = db.videos[index];
  const updated: VideoItem = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.priority_release && !existing.priority_release) {
    const hours = updates.priority_duration_hours || existing.priority_duration_hours || 24;
    updated.priority_expires_at = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  }

  db.videos[index] = updated;
  await saveFirebaseData(db);
  return updated;
}

/**
 * Delete a video from Firebase Realtime Database
 */
export async function deleteVideoInFirebase(id: string): Promise<void> {
  const db = await getFirebaseData();
  db.videos = db.videos.filter((v) => v.id !== id);
  await saveFirebaseData(db);
}

/**
 * Record video analytics (views, clicks, downloads, shares) in Firebase
 */
export async function recordVideoAnalytics(videoId: string, type: 'view' | 'click' | 'download' | 'share'): Promise<void> {
  try {
    const db = await getFirebaseData();
    const video = db.videos.find((v) => v.id === videoId);
    if (video) {
      if (type === 'view') video.views = (video.views || 0) + 1;
      else if (type === 'click') video.clicks = (video.clicks || 0) + 1;
      else if (type === 'download') video.downloads = (video.downloads || 0) + 1;
      else if (type === 'share') video.shares = (video.shares || 0) + 1;
      await saveFirebaseData(db);
    }
  } catch (err) {
    console.warn('[Firebase RTDB] Failed to record analytics event:', err);
  }
}

/**
 * Batch import videos into Firebase Realtime Database
 */
export async function importBatchInFirebase(items: any[]): Promise<{ importedCount: number; totalVideos: number }> {
  const db = await getFirebaseData();
  const now = new Date().toISOString();

  let count = 0;
  for (const item of items) {
    const affiliate = item.affiliate_url || item.product_url;
    if (!item.video_url || !affiliate) continue;
    const newVideo: VideoItem = {
      id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      video_url: item.video_url,
      download_url: item.download_url || item.video_url,
      product_url: affiliate,
      affiliate_url: affiliate,
      title: item.title || 'Produto Importado',
      description: item.description || '',
      thumbnail_url: item.thumbnail_url || undefined,
      allow_download: item.allow_download ?? true,
      active: item.active ?? true,
      position: db.videos.length + 1,
      tags: Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === 'string'
        ? item.tags.split(',').map((t: string) => t.trim())
        : [],
      price: item.price || '',
      discount: item.discount || '',
      views: 0,
      clicks: 0,
      downloads: 0,
      shares: 0,
      created_at: now,
      updated_at: now,
    };
    db.videos.push(newVideo);
    count++;
  }

  await saveFirebaseData(db);
  return { importedCount: count, totalVideos: db.videos.length };
}

/**
 * Get Priority metrics from Firebase Realtime Database
 */
export async function getPriorityMetricsFromFirebase(): Promise<any> {
  const db = await getFirebaseData();
  const today = new Date().toISOString().split('T')[0];

  const profiles = Object.values(db.user_profiles || {});
  const now = new Date();

  const priorityUsersCount = profiles.filter(
    (p) => p.priority_active && p.priority_until && new Date(p.priority_until) > now
  ).length;

  const missionsCompletedToday = profiles.filter(
    (p) => p.daily_share_date === today && p.daily_share_count >= (db.priority_settings?.shares_required || 1)
  ).length;

  const shares = db.shares || [];
  const sharesToday = shares.filter((s) => s.created_at?.startsWith(today)).length;
  const visitsFromShares = shares.reduce((acc, s) => acc + (s.visits || 0), 0);

  // Top shared videos
  const sharedVideosMap: Record<string, { id: string; title: string; thumbnail_url?: string; shares: number; views: number; clicks: number }> = {};
  for (const s of shares) {
    if (!sharedVideosMap[s.video_id]) {
      const vid = db.videos.find((v) => v.id === s.video_id);
      sharedVideosMap[s.video_id] = {
        id: s.video_id,
        title: vid?.title || s.video_id,
        thumbnail_url: vid?.thumbnail_url,
        shares: 0,
        views: vid?.views || 0,
        clicks: vid?.clicks || 0,
      };
    }
    sharedVideosMap[s.video_id].shares += 1;
  }

  const topSharedVideos = Object.values(sharedVideosMap)
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 5);

  return {
    settings: db.priority_settings || INITIAL_DATABASE.priority_settings,
    metrics: {
      priorityUsersCount,
      missionsCompletedToday,
      sharesToday,
      totalShares: shares.length,
      visitsFromShares,
      topSharedVideos,
      recentShares: shares.slice(-10).reverse(),
    },
  };
}

/**
 * Save Priority settings in Firebase Realtime Database
 */
export async function savePrioritySettingsInFirebase(settings: Partial<PrioritySettings>): Promise<void> {
  const db = await getFirebaseData();
  db.priority_settings = {
    ...db.priority_settings,
    ...settings,
  } as PrioritySettings;
  await saveFirebaseData(db);
}
