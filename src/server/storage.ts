/**
 * Backend Storage and Drive Controller for VendeX
 * Manages cache, Drive sync, backups, tag searching, and batch operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSchema, VideoItem } from '../types.ts';
import { INITIAL_DATABASE } from '../initialData.ts';

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

// In-memory cache with TTL and dirty tracking
interface MemoryCache {
  data: DatabaseSchema | null;
  lastFetchedAt: number;
  driveFileId: string | null;
  driveFolderId: string | null;
  etag?: string;
}

const cache: MemoryCache = {
  data: null,
  lastFetchedAt: 0,
  driveFileId: null,
  driveFolderId: null,
};

const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache TTL for high performance

// Event buffer for analytics (views, clicks, downloads, shares) to prevent excessive DB writes
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
      // Ensure the fresh priority demo video exists in db if it's new
      if (INITIAL_DATABASE.videos.some(v => v.id === 'video_007') && !db.videos.some(v => v.id === 'video_007')) {
        const priorityVideo = INITIAL_DATABASE.videos.find(v => v.id === 'video_007')!;
        db.videos.unshift(priorityVideo);
        saveLocalDatabase(db);
      }
      return db;
    } catch (e) {
      console.error('[VendeX DB] Error reading local db file:', e);
    }
  }
  // Initialize with initial data
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
 * Drive API Helpers when access token is provided
 */
export async function getDriveDatabase(accessToken?: string): Promise<{ data: DatabaseSchema; source: 'drive' | 'cache' | 'local'; driveFileId?: string }> {
  const now = Date.now();

  // If memory cache is valid and not expired, return immediately
  if (cache.data && now - cache.lastFetchedAt < CACHE_TTL_MS) {
    return { data: cache.data, source: 'cache', driveFileId: cache.driveFileId || undefined };
  }

  // If no access token provided, use local storage fallback
  if (!accessToken) {
    const local = getLocalFallbackDatabase();
    cache.data = local;
    cache.lastFetchedAt = now;
    return { data: local, source: 'local' };
  }

  try {
    // 1. Locate or create VendeX folder in Google Drive
    const folderId = await ensureDriveFolder(accessToken);
    cache.driveFolderId = folderId;

    // 2. Locate or create database.json in folder
    const fileId = await ensureDriveDatabaseFile(accessToken, folderId);
    cache.driveFileId = fileId;

    // 3. Read database.json content from Drive
    const driveContent = await readDriveFileContent(accessToken, fileId);

    if (driveContent && Array.isArray(driveContent.videos)) {
      cache.data = driveContent;
      cache.lastFetchedAt = now;
      saveLocalDatabase(driveContent); // Keep local in sync
      return { data: driveContent, source: 'drive', driveFileId: fileId };
    }
  } catch (err) {
    console.error('[VendeX Drive] Failed to read from Google Drive, falling back to local cache:', err);
  }

  // Fallback to local
  const local = getLocalFallbackDatabase();
  cache.data = local;
  cache.lastFetchedAt = now;
  return { data: local, source: 'local' };
}

export async function saveDriveDatabase(data: DatabaseSchema, accessToken?: string, expectedVersion?: number): Promise<{ success: boolean; version: number; error?: string }> {
  // Check concurrency version if requested
  const currentDb = cache.data || getLocalFallbackDatabase();
  if (expectedVersion !== undefined && currentDb.settings.version !== expectedVersion) {
    return {
      success: false,
      version: currentDb.settings.version,
      error: `O banco foi alterado por outro processo (Versão atual: ${currentDb.settings.version}, Esperada: ${expectedVersion}). Recarregue os dados antes de salvar.`
    };
  }

  // Create backup before updating
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

  // Update local
  saveLocalDatabase(updatedData);
  cache.data = updatedData;
  cache.lastFetchedAt = Date.now();

  // If token available, sync to Drive and create Drive backup
  if (accessToken) {
    try {
      const folderId = cache.driveFolderId || (await ensureDriveFolder(accessToken));
      const fileId = cache.driveFileId || (await ensureDriveDatabaseFile(accessToken, folderId));

      await updateDriveFileContent(accessToken, fileId, updatedData);

      // Create backup file in Drive VendeX/backups folder
      const backupsFolderId = await ensureDriveSubfolder(accessToken, folderId, 'backups');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `database_${timestamp}.json`;
      await createDriveFile(accessToken, backupsFolderId, backupFileName, JSON.stringify(updatedData, null, 2));
    } catch (driveErr) {
      console.error('[VendeX Drive] Failed saving to Drive:', driveErr);
      // Still return success because local was safely committed
    }
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

  const keys = Object.keys(analyticsBuffer);
  if (keys.length === 0) return;

  const db = cache.data || getLocalFallbackDatabase();
  let modified = false;

  for (const videoId of keys) {
    const counts = analyticsBuffer[videoId];
    delete analyticsBuffer[videoId];

    const video = db.videos.find((v: VideoItem) => v.id === videoId);
    if (video) {
      video.views = (video.views || 0) + (counts.views || 0);
      video.clicks = (video.clicks || 0) + (counts.clicks || 0);
      video.downloads = (video.downloads || 0) + (counts.downloads || 0);
      video.shares = (video.shares || 0) + (counts.shares || 0);
      modified = true;
    }
  }

  if (modified) {
    saveLocalDatabase(db);
    cache.data = db;
  }
}

/**
 * Google Drive API v3 fetch wrappers
 */
async function ensureDriveFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent("name = 'VendeX' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'VendeX',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function ensureDriveSubfolder(accessToken: string, parentFolderId: string, name: string): Promise<string> {
  const query = encodeURIComponent(`name = '${name}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      parents: [parentFolderId],
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function ensureDriveDatabaseFile(accessToken: string, parentFolderId: string): Promise<string> {
  const query = encodeURIComponent(`name = 'database.json' and '${parentFolderId}' in parents and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create initial database.json
  const initialContent = JSON.stringify(getLocalFallbackDatabase(), null, 2);
  return await createDriveFile(accessToken, parentFolderId, 'database.json', initialContent, 'application/json');
}

async function readDriveFileContent(accessToken: string, fileId: string): Promise<DatabaseSchema | null> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to read file ${fileId}: status ${res.status}`);
  }
  return await res.json();
}

async function createDriveFile(accessToken: string, parentFolderId: string, name: string, content: string, mimeType = 'application/json'): Promise<string> {
  const metadata = {
    name,
    parents: [parentFolderId],
    mimeType,
  };

  const boundary = '-------vendexboundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  const file = await res.json();
  return file.id;
}

async function updateDriveFileContent(accessToken: string, fileId: string, data: DatabaseSchema): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: content,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive update error: ${res.status} - ${errorText}`);
  }
}
