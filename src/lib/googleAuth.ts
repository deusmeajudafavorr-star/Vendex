/**
 * Google OAuth helper for Google Drive integration
 * Uses Google Identity Services token client
 */

const CLIENT_ID = '983394911308-g49om5b4e72v446g486n78r0kll4562k.apps.googleusercontent.com'; // Standard project client ID
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const STORAGE_KEY = 'vendex_google_token';
const EXPIRY_KEY = 'vendex_token_expires_at';
const USER_KEY = 'vendex_google_user';

declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleAuthUser {
  email?: string;
  name?: string;
  picture?: string;
  token: string;
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token) return null;
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
  return token;
}

export function getStoredUser(): GoogleAuthUser | null {
  const token = getStoredToken();
  if (!token) return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (userJson) {
    try {
      const parsed = JSON.parse(userJson);
      return { ...parsed, token };
    } catch {
      // ignore
    }
  }
  return { token, email: 'Admin Conectado' };
}

export function clearGoogleAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(USER_KEY);
}

export function requestGoogleAccessToken(onSuccess: (token: string, user?: any) => void, onError: (err: any) => void) {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    onError(new Error('Google Identity Services script ainda carregando. Tente novamente em instantes.'));
    return;
  }

  try {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          onError(tokenResponse);
          return;
        }

        const accessToken = tokenResponse.access_token;
        const expiresIn = (tokenResponse.expires_in || 3500) * 1000;
        localStorage.setItem(STORAGE_KEY, accessToken);
        localStorage.setItem(EXPIRY_KEY, (Date.now() + expiresIn).toString());

        // Attempt to fetch profile info
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userRes.ok) {
            const profile = await userRes.json();
            const userData = { email: profile.email, name: profile.name, picture: profile.picture };
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
            onSuccess(accessToken, userData);
            return;
          }
        } catch {
          // ignore profile fetch error
        }

        onSuccess(accessToken, { email: 'Admin Google Drive' });
      },
    });

    client.requestAccessToken();
  } catch (err) {
    onError(err);
  }
}
