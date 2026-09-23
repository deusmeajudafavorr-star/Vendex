export interface VideoItem {
  id: string;
  video_url: string;
  download_url?: string;
  product_url: string;
  affiliate_url: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  allow_download: boolean;
  active: boolean;
  position: number;
  tags?: string[];
  price?: string;
  discount?: string;
  views: number;
  clicks: number;
  downloads: number;
  shares?: number;
  priority_release?: boolean;
  priority_duration_hours?: number; // e.g. 0.5, 1, 3, 6, 12, 24
  priority_expires_at?: string; // ISO date string
  is_locked_priority?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitLog {
  visitor_session: string;
  timestamp: string;
  source?: string;
}

export interface ShareRecord {
  id: string; // share_id
  user_id: string;
  video_id: string;
  referral_code: string;
  platform: string;
  created_at: string;
  visits: number;
  visit_logs?: VisitLog[];
}

export interface PrioritySettings {
  enabled: boolean;
  shares_required: number; // default: 1
  frequency: 'daily';
  duration_hours: number; // default: 24
  default_priority_hours: number; // default: 24
  fresh_video_duration_hours?: number; // default: 24
  custom_message?: string;
  system_message?: string;
}

export interface UserPriorityProfile {
  user_id: string;
  referral_code: string;
  priority_active: boolean;
  priority_until: string | null;
  daily_share_count: number;
  daily_share_date: string; // YYYY-MM-DD
  share_streak: number;
  total_shares: number;
  total_visits: number;
  last_share_at?: string;
}

export interface DatabaseSchema {
  settings: {
    name: string;
    version: number;
    updated_at: string;
    description?: string;
  };
  priority_settings?: PrioritySettings;
  videos: VideoItem[];
  shares?: ShareRecord[];
  user_profiles?: Record<string, UserPriorityProfile>;
}

export interface AnalyticsEvent {
  videoId: string;
  type: 'view' | 'click' | 'download' | 'share';
  timestamp?: string;
}

export interface DriveConfig {
  folderId?: string;
  fileId?: string;
  lastSyncedAt?: string;
}

