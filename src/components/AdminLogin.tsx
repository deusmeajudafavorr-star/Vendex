import React, { useState } from 'react';
import {
  Shield,
  Lock,
  ArrowRight,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { requestGoogleAccessToken } from '../lib/googleAuth.ts';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
  onNavigate: (route: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setLoading(true);
    setError(null);

    requestGoogleAccessToken(
      (token, user) => {
        setLoading(false);
        onLoginSuccess({ ...user, token });
        onNavigate('/admin');
      },
      (err) => {
        console.error('Google OAuth error:', err);
        setLoading(false);
        setError(
          err?.message ||
            'Não foi possível autenticar com o Google Drive. Verifique se o bloqueador de popups está desativado.'
        );
      }
    );
  };

  const handleGuestAdminLogin = () => {
    // Allows previewing admin with local database fallback even before connecting personal Google Drive
    onLoginSuccess({
      email: 'admin.local@vendex.app',
      name: 'Administrador Local (Fallback)',
      token: '',
    });
    onNavigate('/admin');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-xl shadow-rose-950/60 mb-1">
            <span className="font-black text-white text-2xl tracking-tighter">VX</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Vende<span className="text-rose-500">X</span> Admin
          </h1>
          <p className="text-xs text-zinc-400">
            Acesse o painel para gerenciar produtos, vídeos, links de afiliado e banco Google Drive.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Login Button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-98 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Conectando ao Google Drive...' : 'Conectar com Google Drive'}</span>
          </button>

          <button
            onClick={handleGuestAdminLogin}
            className="w-full py-3 px-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs border border-zinc-700/60 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Database className="w-4 h-4 text-zinc-400" />
            <span>Acessar Painel com Armazenamento Local</span>
          </button>
        </div>

        {/* Security & Drive Notice */}
        <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Conexão Segura e Oficial</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Ao conectar sua conta Google, o VendeX criará a pasta <code>VendeX/</code> e o arquivo <code>database.json</code> no seu Google Drive com backups automáticos. Nenhuma credencial secreta é compartilhada publicamente.
          </p>
        </div>

        {/* Return to Feed */}
        <button
          onClick={() => onNavigate('/')}
          className="text-xs text-zinc-500 hover:text-zinc-300 text-center transition-colors"
        >
          ← Voltar para o feed de vídeos
        </button>
      </div>
    </div>
  );
};
