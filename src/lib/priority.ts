/**
 * Client-side Priority Access & Mission State Controller
 * Manages user identity, share tracking, mission streak, and priority access cache.
 */

import { UserPriorityProfile, PrioritySettings } from '../types.ts';

const USER_ID_STORAGE_KEY = 'vendex_user_id';
const PROFILE_CACHE_KEY = 'vendex_user_profile';
const ONBOARDING_STORAGE_KEY = 'vendex_fresh_onboarding_shown';

// Generate or retrieve persistent anonymous user id
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'user_guest';
  let userId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!userId) {
    userId = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }
  return userId;
}

// Check onboarding shown state
export function hasSeenFreshOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
}

export function setFreshOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}

// Local cache for profile
export function getCachedUserProfile(): UserPriorityProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PROFILE_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedUserProfile(profile: UserPriorityProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  // Broadcast event for live updates
  window.dispatchEvent(new CustomEvent('vendex-profile-updated', { detail: profile }));
}

// Fetch user profile from backend
export async function fetchUserProfile(): Promise<UserPriorityProfile> {
  const userId = getOrCreateUserId();
  try {
    const res = await fetch(`/api/priority/user/${userId}`);
    if (!res.ok) throw new Error('Erro ao buscar perfil');
    const data = await res.json();
    setCachedUserProfile(data.profile);
    return data.profile;
  } catch (err) {
    console.warn('[Priority] Falling back to cached profile:', err);
    const cached = getCachedUserProfile();
    if (cached) return cached;
    // Default fallback profile
    const defaultProfile: UserPriorityProfile = {
      user_id: userId,
      referral_code: `ref_${userId.slice(-6)}`,
      priority_active: false,
      priority_until: null,
      daily_share_count: 0,
      daily_share_date: new Date().toISOString().split('T')[0],
      share_streak: 0,
      total_shares: 0,
      total_visits: 0,
    };
    return defaultProfile;
  }
}

// Register a share on the backend and update profile
export async function registerVideoShare(
  videoId: string,
  platform = 'web_share'
): Promise<{
  success: boolean;
  profile: UserPriorityProfile;
  shareUrl: string;
  unlockedNow: boolean;
  message: string;
}> {
  const userId = getOrCreateUserId();
  const res = await fetch('/api/priority/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, video_id: videoId, platform }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao registrar compartilhamento');
  }

  setCachedUserProfile(data.profile);
  return {
    success: true,
    profile: data.profile,
    shareUrl: data.share_url,
    unlockedNow: data.unlockedNow,
    message: data.message,
  };
}

// Record visit if visitor came from a referral share link
export async function trackReferralVisit(): Promise<void> {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('s');
  const refCode = urlParams.get('ref');

  // Also check pathname /v/:id
  const pathParts = window.location.pathname.split('/');
  let videoIdFromPath: string | undefined;
  if (pathParts[1] === 'v' && pathParts[2]) {
    videoIdFromPath = pathParts[2];
  }

  if (!shareId && !refCode) return;

  const sessionKey = `vis_${getOrCreateUserId()}`;
  const trackedKey = `vendex_tracked_${shareId || refCode}`;
  if (sessionStorage.getItem(trackedKey)) {
    return; // Already tracked for this session
  }

  try {
    sessionStorage.setItem(trackedKey, 'true');
    await fetch('/api/priority/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        share_id: shareId,
        referral_code: refCode,
        video_id: videoIdFromPath,
        visitor_session: sessionKey,
        source: document.referrer || 'direct',
      }),
    });
  } catch (err) {
    console.warn('[Priority] Track referral visit error:', err);
  }
}

// Calculate countdown remaining time until priority expires
export interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
}

export function calculateTimeRemaining(untilIso: string | null | undefined): TimeRemaining {
  if (!untilIso) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true, formatted: '00:00:00' };
  }

  const target = new Date(untilIso).getTime();
  const diff = target - Date.now();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true, formatted: '00:00:00' };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    formatted,
  };
}

// Hook-like subscription for profile updates
export function subscribeToProfile(callback: (profile: UserPriorityProfile) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<UserPriorityProfile>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };
  window.addEventListener('vendex-profile-updated', handler);
  return () => window.removeEventListener('vendex-profile-updated', handler);
}

// Frequency-capping for non-intrusive notification:
// Max 2 times per day, minimum 20 minutes between appearances
export interface FreshNotifyHistory {
  date: string; // YYYY-MM-DD
  count: number;
  lastShownAt: number; // timestamp ms
}

const NOTIFY_STORAGE_KEY = 'vendex_fresh_notify_history';
const TWENTY_MINUTES_MS = 20 * 60 * 1000;

export function canShowFreshNotification(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (!raw) return true;

    const history: FreshNotifyHistory = JSON.parse(raw);
    if (history.date !== today) {
      // New calendar day -> allowed (resets count for today)
      return true;
    }

    // Limit to max 2 times per day
    if (history.count >= 2) {
      return false;
    }

    // At least 20 minutes interval
    const timeSinceLast = Date.now() - (history.lastShownAt || 0);
    return timeSinceLast >= TWENTY_MINUTES_MS;
  } catch {
    return true;
  }
}

export function recordFreshNotificationShown(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
    let history: FreshNotifyHistory = { date: today, count: 0, lastShownAt: 0 };

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) {
          history = parsed;
        }
      } catch {}
    }

    history.date = today;
    history.count = (history.count || 0) + 1;
    history.lastShownAt = Date.now();
    localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(history));
  } catch {}
}
