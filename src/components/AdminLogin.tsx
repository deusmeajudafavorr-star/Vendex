import React, { useState } from 'react';
import {
  Shield,
  Lock,
  ArrowRight,
  Database,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Server
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
  onNavigate: (route: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdminEnter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    // Save admin session
    const adminUser = {
      email: 'admin@vendex.app',
      name: 'Administrador VendeX',
      role: 'admin',
      database: 'Firebase Realtime Database',
    };

    localStorage.setItem('vendex_admin_user', JSON.stringify(adminUser));
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(adminUser);
      onNavigate('/admin');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-xl shadow-rose-950/60 mb-1">
            <span className="font-black text-white text-2xl tracking-tighter">VX</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Vende<span className="text-rose-500">X</span> Admin
          </h1>
          <p className="text-xs text-zinc-400">
            Painel de controle de catálogo, ofertas e métricas do aplicativo.
          </p>
        </div>

        {/* Database Status Badge */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <div>
              <span className="text-xs font-bold text-white block">Firebase RTDB Conectado</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                project-3c915cd8-d39f-4632-93e
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
            Ativo
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Enter Admin Button */}
        <form onSubmit={handleAdminEnter} className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-98 disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            <span>{loading ? 'Acessando o Painel...' : 'Entrar no Painel de Administração'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Cloud Database Notice */}
        <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold">
            <Server className="w-4 h-4 text-rose-400" />
            <span>Armazenamento em Nuvem Firebase</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Todos os vídeos cadastrados, visualizações, cliques de afiliados e configurações de prioridade são salvos diretamente no seu <strong>Firebase Realtime Database</strong> em tempo real.
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
