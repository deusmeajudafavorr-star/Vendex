/**
 * Backend Storage Controller for VendeX
 * Direct sync with Firebase Realtime Database:
 * https://project-3c915cd8-d39f-4632-93e-default-rtdb.firebaseio.com/
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSchema, VideoItem } from '../types.ts';
import { INITIAL_DATABASE } from '../initialData.ts';

const FIREBASE_RTDB_URL = 'https://project-3c915cd8-d39f-4632-93e-default-rtdb.firebaseio.com/vendex.json';
const DATA_DIR = path.resolve(process.cwd(), '.vendex_data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Ensure local directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// In-memory cache with TTL
interface MemoryCache {
  data: DatabaseSchema | null;
  lastFetchedAt: number;
}

const cache: MemoryCache = {
  data: null,
  lastFetchedAt: 0,
};

const CACHE_TTL_MS = 10 * 1000; // 10 seconds cache TTL

// Event buffer for analytics (views, clicks, downloads, shares)
const analyticsBuffer: { [videoId: string]: { views: number; clicks: number; downloads: number; shares: number } } = {};
let analyticsFlushTimer: NodeJS.Timeout | null = null;

export function getLocalFallbackDatabase(): DatabaseSchema {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const db: DatabaseSchema = JSON.parse(raw);
      if (!db.priority_settings) {
        db.priority_settings = INITIAL_DATABASE.priority_settings;
      }
      if (!db.shares) {
        db.shares = [];
      }
      if (!db.user_profiles) {
        db.user_profiles = {};
      }
      return db;
    } catch (e) {
      console.error('[VendeX DB] Error reading local db file:', e);
    }
  }
  saveLocalDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

export function saveLocalDatabase(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[VendeX DB] Error saving local db file:', e);
  }
}

export function createLocalBackup(data: DatabaseSchema): string {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `database_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupName);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    return backupName;
  } catch (e) {
    console.error('[VendeX DB] Error creating local backup:', e);
    return '';
  }
}

export function invalidateCache(): void {
  cache.lastFetchedAt = 0;
}

/**
 * Fetch database from Firebase Realtime Database
 */
export async function getDriveDatabase(accessToken?: string): Promise<{ data: DatabaseSchema; source: 'firebase' | 'cache' | 'local'; driveFileId?: string }> {
  const now = Date.now();

  // If memory cache is valid and not expired, return immediately
  if (cache.data && now - cache.lastFetchedAt < CACHE_TTL_MS) {
    return { data: cache.data, source: 'cache' };
  }

  try {
    const res = await fetch(FIREBASE_RTDB_URL);
    if (res.ok) {
      const rtdbData = await res.json();
      if (rtdbData && Array.isArray(rtdbData.videos)) {
        if (!rtdbData.shares) rtdbData.shares = [];
        if (!rtdbData.user_profiles) rtdbData.user_profiles = {};
        if (!rtdbData.priority_settings) rtdbData.priority_settings = INITIAL_DATABASE.priority_settings;

        cache.data = rtdbData;
        cache.lastFetchedAt = now;
        saveLocalDatabase(rtdbData); // Sync local copy
        return { data: rtdbData, source: 'firebase' };
      }
    }
  } catch (err) {
    console.error('[VendeX RTDB] Failed to read from Firebase RTDB, falling back to local cache:', err);
  }

  // Fallback to local file
  const local = getLocalFallbackDatabase();
  cache.data = local;
  cache.lastFetchedAt = now;
  return { data: local, source: 'local' };
}

/**
 * Save database to Firebase Realtime Database
 */
export async function saveDriveDatabase(data: DatabaseSchema, accessToken?: string, expectedVersion?: number): Promise<{ success: boolean; version: number; error?: string }> {
  const currentDb = cache.data || getLocalFallbackDatabase();
  if (expectedVersion !== undefined && currentDb.settings.version !== expectedVersion) {
    return {
      success: false,
      version: currentDb.settings.version,
      error: `O banco foi alterado por outro processo (Versão atual: ${currentDb.settings.version}, Esperada: ${expectedVersion}). Recarregue os dados antes de salvar.`
    };
  }

  // Create local backup
  createLocalBackup(currentDb);

  // Increment version
  const newVersion = (currentDb.settings?.version || 1) + 1;
  const updatedData: DatabaseSchema = {
    ...data,
    settings: {
      ...data.settings,
      version: newVersion,
      updated_at: new Date().toISOString()
    }
  };

  // Update local file and memory cache
  saveLocalDatabase(updatedData);
  cache.data = updatedData;
  cache.lastFetchedAt = Date.now();

  // Save to Firebase Realtime Database
  try {
    const res = await fetch(FIREBASE_RTDB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    if (!res.ok) {
      console.warn('[VendeX RTDB] PUT returned status:', res.status);
    }
  } catch (rtdbErr) {
    console.error('[VendeX RTDB] Failed saving to Firebase RTDB:', rtdbErr);
  }

  return { success: true, version: newVersion };
}

/**
 * Analytics buffering
 */
export function recordAnalyticsEvent(videoId: string, type: 'view' | 'click' | 'download' | 'share'): void {
  if (!analyticsBuffer[videoId]) {
    analyticsBuffer[videoId] = { views: 0, clicks: 0, downloads: 0, shares: 0 };
  }

  if (type === 'view') analyticsBuffer[videoId].views += 1;
  if (type === 'click') analyticsBuffer[videoId].clicks += 1;
  if (type === 'download') analyticsBuffer[videoId].downloads += 1;
  if (type === 'share') analyticsBuffer[videoId].shares += 1;

  if (!analyticsFlushTimer) {
    analyticsFlushTimer = setTimeout(() => {
      flushAnalytics().catch(console.error);
    }, 15000); // Flush every 15s to batch updates
  }
}

export async function flushAnalytics(): Promise<void> {
  if (analyticsFlushTimer) {
    clearTimeout(analyticsFlushTimer);
    analyticsFlushTimer = null;
  }

  const entries = Object.entries(analyticsBuffer);
  if (entries.length === 0) return;

  const currentDb = cache.data || getLocalFallbackDatabase();
  let hasChanges = false;

  for (const [videoId, counts] of entries) {
    const video = currentDb.videos.find(v => v.id === videoId);
    if (video) {
      video.views = (video.views || 0) + counts.views;
      video.clicks = (video.clicks || 0) + counts.clicks;
      video.downloads = (video.downloads || 0) + counts.downloads;
      video.shares = (video.shares || 0) + counts.shares;
      hasChanges = true;
    }
    delete analyticsBuffer[videoId];
  }

  if (hasChanges) {
    await saveDriveDatabase(currentDb);
  }
}

/**
 * Ensure priority demo data exists
 */
export async function ensurePrioritySeedVideo(): Promise<void> {
  const { data } = await getDriveDatabase();
  const hasPriorityVideo = data.videos.some(v => v.id === 'video_007');
  if (!hasPriorityVideo) {
    const priorityVideo = INITIAL_DATABASE.videos.find(v => v.id === 'video_007');
    if (priorityVideo) {
      data.videos.unshift(priorityVideo);
      await saveDriveDatabase(data);
    }
  }
}
