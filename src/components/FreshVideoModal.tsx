import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  MessageCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { VideoItem, UserPriorityProfile } from '../types.ts';
import { registerVideoShare } from '../lib/priority.ts';

interface FreshVideoModalProps {
  video: VideoItem;
  userProfile: UserPriorityProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess?: (updatedProfile: UserPriorityProfile) => void;
}

export const FreshVideoModal: React.FC<FreshVideoModalProps> = ({
  video,
  userProfile,
  isOpen,
  onClose,
  onShareSuccess,
}) => {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareResult, setShareResult] = useState<{
    unlockedNow: boolean;
    shareUrl: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleShareNow = async (platform = 'native') => {
    setSharing(true);
    try {
      const res = await registerVideoShare(video.id, platform);
      setShareResult({
        unlockedNow: res.unlockedNow,
        shareUrl: res.shareUrl,
        message: res.message,
      });

      if (onShareSuccess) {
        onShareSuccess(res.profile);
      }

      const shareText = `🔥 Olha esse lançamento que encontrei no VendeX: ${video.title}! Veja o vídeo exclusivo: ${res.shareUrl}`;

      if (platform === 'whatsapp') {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(waUrl, '_blank');
        return;
      }

      if (navigator.share && platform === 'native') {
        try {
          await navigator.share({
            title: `VendeX - ${video.title}`,
            text: shareText,
            url: res.shareUrl,
          });
        } catch {
          // If cancelled or rejected, copy to clipboard fallback
          await copyToClipboard(res.shareUrl);
        }
      } else {
        await copyToClipboard(res.shareUrl);
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar link de compartilhamento.');
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-rose-500/25 to-transparent blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {!shareResult ? (
          <div>
            {/* Header Badge & Title */}
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-900/50">
                <Flame className="w-5 h-5 fill-white text-transparent" />
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">
                  Acesso Prioritário
                </span>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  VÍDEO FRESQUINHO
                </h3>
              </div>
            </div>

            {/* Product summary card snippet */}
            <div className="mt-3 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
              {video.thumbnail_url && (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{video.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Compartilhe este vídeo para liberar acesso antecipado
                </p>
              </div>
            </div>

            {/* Value proposition message */}
            <div className="mt-4 space-y-2.5">
              <p className="text-sm font-semibold text-zinc-200">
                Compartilhe o link deste vídeo na sua rede social e ganhe acesso prioritário aos novos vídeos.
              </p>
              <p className="text-xs text-zinc-400">
                Saia na frente e veja as novas ofertas antes dos outros usuários.
              </p>

              {/* Benefit list */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2 text-xs">
                <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  Em troca, você ganha:
                </p>
                <div className="flex items-center gap-2 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Acesso prioritário a produtos e ofertas</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Novos vídeos antes de todo mundo</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Conteúdo fresquinho recém-publicado</span>
                </div>
              </div>
            </div>

            {/* Daily Mission reminder */}
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Missão diária: 1 oferta por dia</span>
              </div>
              <span className="font-bold">
                {userProfile?.daily_share_count ? '1/1 Concluída' : '0/1 Pendente'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => handleShareNow('native')}
                disabled={sharing}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>{sharing ? 'Gerando link...' : '🚀 Compartilhar e liberar acesso'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleShareNow('whatsapp')}
                  disabled={sharing}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleShareNow('copy')}
                  disabled={sharing}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        ) : (
          /* Success Screen */
          <div className="text-center py-2 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 mx-auto flex items-center justify-center shadow-xl shadow-rose-900/50 mb-3 animate-bounce">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">
              🎉 ACESSO PRIORITÁRIO LIBERADO!
            </h3>

            <p className="text-sm font-semibold text-zinc-300 mt-2">
              Você está na frente! Os novos vídeos poderão aparecer para você antes dos demais usuários.
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-zinc-900/80 border border-rose-500/30 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Status no perfil:</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40">
                  🔥 Prioritário Ativo
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Validade do benefício:</span>
                <span className="font-bold text-amber-400">24 horas de novidades</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Missão diária:</span>
                <span className="text-emerald-400 font-bold">✅ 1/1 Concluída hoje</span>
              </div>
            </div>

            {/* Share link box */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-400 truncate text-left font-mono">
                {shareResult.shareUrl}
              </span>
              <button
                onClick={() => copyToClipboard(shareResult.shareUrl)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>Continuar assistindo aos vídeos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
