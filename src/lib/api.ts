import { VideoItem } from '../types.ts';
import { getStoredToken } from './googleAuth.ts';

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchFeedVideos(page = 1, limit = 5, tag?: string, search?: string, isPriority = false) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);
  if (isPriority) params.set('isPriority', 'true');

  const headers = getHeaders();
  if (isPriority) {
    headers['x-vendex-priority'] = 'true';
  }

  const res = await fetch(`/api/videos?${params.toString()}`, {
    headers,
  });
  if (!res.ok) {
    throw new Error('Falha ao carregar vídeos do feed');
  }
  return res.json();
}

export async function sendAnalytics(videoId: string, type: 'view' | 'click' | 'download' | 'share') {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, type }),
    });
  } catch (e) {
    console.warn('Analytics event dropped:', e);
  }
}

export async function fetchAdminVideos(filter = 'all', search = '') {
  const params = new URLSearchParams({ filter, search });
  const res = await fetch(`/api/admin/videos?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Falha ao carregar dados do admin');
  }
  return res.json();
}

export async function createAdminVideo(video: Partial<VideoItem>, expectedVersion?: number) {
  const res = await fetch('/api/admin/videos', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ video, expectedVersion }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao cadastrar vídeo');
  }
  return data;
}

export async function updateAdminVideo(id: string, video: Partial<VideoItem>, expectedVersion?: number) {
  const res = await fetch(`/api/admin/videos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ video, expectedVersion }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao atualizar vídeo');
  }
  return data;
}

export async function deleteAdminVideo(id: string, expectedVersion?: number) {
  const res = await fetch(`/api/admin/videos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ expectedVersion }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao remover vídeo');
  }
  return data;
}

export async function importBatchVideos(items: any[], expectedVersion?: number) {
  const res = await fetch('/api/admin/import', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ items, expectedVersion }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao importar lote');
  }
  return data;
}

export async function clearBackendCache() {
  const res = await fetch('/api/admin/cache/clear', {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.json();
}

export async function scrapeProductPreview(url: string) {
  const res = await fetch('/api/admin/scrape-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function fetchPriorityMetrics() {
  const res = await fetch('/api/admin/priority/metrics', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Falha ao obter métricas de prioridade');
  }
  return res.json();
}

export async function updatePrioritySettings(settings: any, expectedVersion?: number) {
  const res = await fetch('/api/admin/priority/settings', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ settings, expectedVersion }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao atualizar configurações de prioridade');
  }
  return data;
}

