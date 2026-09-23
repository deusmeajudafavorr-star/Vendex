import React, { useState, useEffect } from 'react';
import {
  Flame,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Sparkles,
  Award,
  Eye
} from 'lucide-react';
import { UserPriorityProfile, VideoItem } from '../types.ts';
import {
  fetchUserProfile,
  calculateTimeRemaining,
  registerVideoShare
} from '../lib/priority.ts';

interface UserProfileProps {
  onBackToFeed: () => void;
  onSelectVideoToWatch?: (videoId: string) => void;
  onNavigate?: (path: string) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  onBackToFeed,
  onSelectVideoToWatch,
  onNavigate,
}) => {
  const [profile, setProfile] = useState<UserPriorityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharingVideoId, setSharingVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await fetchUserProfile();
        setProfile(p);

        // Fetch videos list for quick sharing
        const res = await fetch('/api/videos?limit=10');
        if (res.ok) {
          const data = await res.json();
          setVideos(data.videos || []);
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isPriority = Boolean(
    profile?.priority_active &&
    profile?.priority_until &&
    new Date(profile.priority_until).getTime() > Date.now()
  );

  const countdown = calculateTimeRemaining(profile?.priority_until);

  const personalReferralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${profile?.referral_code || 'vendex'}`
    : '';

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(personalReferralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleShareVideo = async (video: VideoItem) => {
    setSharingVideoId(video.id);
    try {
      const res = await registerVideoShare(video.id, 'profile_share');
      setProfile(res.profile);

      const shareText = `🔥 Olha essa oferta imperdível: ${video.title}! Assista ao vídeo completo aqui: ${res.shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `VendeX - ${video.title}`,
            text: shareText,
            url: res.shareUrl,
          });
        } catch {
          await navigator.clipboard.writeText(res.shareUrl);
          alert('Link do vídeo copiado com seu código de indicação!');
        }
      } else {
        await navigator.clipboard.writeText(res.shareUrl);
        alert('Link do vídeo copiado com seu código de indicação!');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao compartilhar vídeo');
    } finally {
      setSharingVideoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center pb-12">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-md sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-900">
        <button
          onClick={onBackToFeed}
          className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Feed</span>
        </button>
        <h1 className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
          <span>Meu Perfil</span>
          <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
        </h1>
        <div className="w-16" />
      </header>

      <main className="w-full max-w-md px-4 py-5 space-y-4">
        {/* User Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
                <Flame className="w-7 h-7 fill-white text-transparent" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400">
                  ID: {profile?.user_id?.slice(0, 14) || 'Carregando...'}
                </span>
                <h2 className="text-base font-black text-white flex items-center gap-1.5">
                  Membro VendeX
                </h2>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isPriority
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {isPriority ? '🔥 Prioritário Ativo' : 'Membro Normal'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            {isPriority ? (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Benefício Ativo</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    Termina em {countdown.formatted}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  Você está vendo novos vídeos e ofertas exclusivas antes dos demais usuários.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300">Acesso Prioritário Inativo</span>
                  <span className="text-[10px] font-semibold text-rose-400">0/1 Compartilhamento</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Compartilhe 1 oferta hoje para desbloquear o acesso aos vídeos fresquinhos por 24 horas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Mission Section */}
        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 fill-rose-400 text-transparent" />
              <span>Sua Missão de Hoje</span>
            </h3>
            <span className="text-xs font-bold font-mono text-zinc-300">
              {profile?.daily_share_count ? '1/1 ✅' : '0/1'}
            </span>
          </div>

          <p className="text-xs text-zinc-200 font-medium">
            {profile?.daily_share_count
              ? 'Missão concluída com sucesso! Seu acesso prioritário está liberado.'
              : 'Compartilhe o link de uma oferta nas redes sociais e desbloqueie seu acesso.'}
          </p>

          <div className="mt-3 w-full h-2.5 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                profile?.daily_share_count
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 w-full'
                  : 'bg-rose-500 w-0'
              }`}
            />
          </div>

          <div className="mt-3 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-300">Sequência Diária:</span>
            </div>
            <span className="font-extrabold text-amber-400">
              🔥 {profile?.share_streak || 0} {(profile?.share_streak || 0) === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
            <Share2 className="w-5 h-5 text-rose-400 mx-auto mb-1 stroke-[2]" />
            <p className="text-xl font-black text-white">{profile?.total_shares || 0}</p>
            <p className="text-[11px] text-zinc-400 font-medium">Ofertas Compartilhadas</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
            <Eye className="w-5 h-5 text-emerald-400 mx-auto mb-1 stroke-[2]" />
            <p className="text-xl font-black text-white">{profile?.total_visits || 0}</p>
            <p className="text-[11px] text-zinc-400 font-medium">Visitas Geradas</p>
          </div>
        </div>

        {/* Personal Referral Link Card */}
        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1.5">
            <span>Seu Link de Indicação</span>
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            Amigos que acessarem o VendeX pelo seu link abrem o feed e você acumula estatísticas de indicação.
          </p>

          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-300 truncate font-mono">
              {personalReferralUrl}
            </span>
            <button
              onClick={copyReferral}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Video Showcase to share */}
        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Compartilhe para manter a sequência</span>
            </h3>
            <span className="text-[11px] text-zinc-400">{videos.length} produtos</span>
          </div>

          <div className="space-y-2">
            {videos.slice(0, 5).map((video) => (
              <div
                key={video.id}
                className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-2.5 hover:border-zinc-700 transition-colors"
              >
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  onClick={() => onSelectVideoToWatch?.(video.id)}
                >
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate max-w-[170px]">
                      {video.title}
                    </h4>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      {video.priority_release ? '🔥 Fresquinho' : (video.price || 'Oferta')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleShareVideo(video)}
                  disabled={sharingVideoId === video.id}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  <Share2 className="w-3 h-3 stroke-[2.5]" />
                  <span>{sharingVideoId === video.id ? 'Gerando...' : 'Compartilhar'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
