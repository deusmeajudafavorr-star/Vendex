import { DatabaseSchema, VideoItem } from './types.ts';

export const INITIAL_VIDEOS: VideoItem[] = [];

export const INITIAL_DATABASE: DatabaseSchema = {
  settings: {
    name: "VendeX",
    version: 1,
    updated_at: new Date().toISOString(),
    description: "Base de dados oficial do VendeX"
  },
  priority_settings: {
    enabled: true,
    shares_required: 1,
    frequency: 'daily',
    duration_hours: 24,
    default_priority_hours: 24,
    system_message: 'Compartilhe 1 oferta por dia e desbloqueie os vídeos fresquinhos antes de todo mundo!'
  },
  videos: [],
  shares: [],
  user_profiles: {}
};
