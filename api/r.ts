import fs from 'node:fs/promises';
import path from 'node:path';

function decodeTarget(token: string): string | null {
  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return /^https?:\/\//i.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  const token = String(req.query?.u || '');

  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(400).send('Token invalido');
  }

  let target = decodeTarget(token);

  // Mantém compatibilidade com links antigos.
  if (!target) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), 'redirect-links.json'), 'utf8');
      const data = JSON.parse(raw);
      for (const item of Object.values(data?.links || {}) as any[]) {
        if (item?.target) {
          const normalized = Buffer.from(String(item.target), 'utf8')
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
          if (normalized === token) {
            target = item.target;
            break;
          }
        }
      }
    } catch {}
  }

  if (!target) {
    return res.status(404).send('Video nao encontrado');
  }

  res.setHeader('Location', target);
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(302).end();
}
