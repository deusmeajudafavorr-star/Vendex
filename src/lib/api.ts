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
export async function fetchFeedVideos(
  page = 1,
  limit = 5,
  tag?: string,
  search?: string,
  isPriority = false
) {
  try {
    // Try backend proxy if available, otherwise direct Firebase RTDB
    const { videos } = await getVideos('active', search, isPriority);

    let filtered = videos;
    if (tag && tag !== 'Todos' && tag !== 'Tudo') {
      filtered = filtered.filter((v) =>
        v.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedVideos = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(filtered.length / limit) || 1;

    // Extract all distinct tags from all active videos
    const allTags = Array.from(
      new Set(videos.flatMap((v) => v.tags || []))
    ).filter(Boolean);

    return {
      videos: paginatedVideos,
      page,
      totalPages,
      totalVideos: filtered.length,
      pagination: {
        page,
        limit,
        total: filtered.length,
        hasMore: startIndex + limit < filtered.length,
      },
      tags: allTags,
      source: 'firebase',
    };
  } catch (err) {
    console.error('Failed to fetch feed videos from Firebase:', err);
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
