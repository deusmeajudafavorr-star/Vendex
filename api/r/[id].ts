import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'node:fs/promises';
import path from 'node:path';

function decodeTarget(id: string): string | null {
  try {
    const normalized = id.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');

    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch {}

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id || '');

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return res.status(400).send('Link invalido');
  }

  let target = decodeTarget(id);

  if (!target) {
    try {
      const mapPath = path.join(process.cwd(), 'redirect-links.json');
      const raw = await fs.readFile(mapPath, 'utf8');
      const data = JSON.parse(raw);
      target = data?.links?.[id]?.target || null;
    } catch {}
  }

  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(404).send('Link nao encontrado');
  }

  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.setHeader('Location', target);
  return res.status(302).end();
}
