import React, { useEffect, useState } from 'react';
import { Flame, X, ArrowRight, Sparkles } from 'lucide-react';
import { VideoItem, UserPriorityProfile } from '../types.ts';

interface FreshVideoBannerProps {
  video: VideoItem;
  userProfile: UserPriorityProfile | null;
  onOpenShareModal: () => void;
  onNavigateToProfile?: () => void;
  onDismiss?: () => void;
}

export const FreshVideoBanner: React.FC<FreshVideoBannerProps> = ({
  video,
  userProfile,
  onOpenShareModal,
  onNavigateToProfile,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // If user already has active priority, no need to show the prompt
  const isPriority = Boolean(
    userProfile?.priority_active &&
    userProfile?.priority_until &&
    new Date(userProfile.priority_until).getTime() > Date.now()
  );

  // Auto-dismiss smoothly after 10 seconds if not clicked
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible || isPriority) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm pointer-events-auto animate-slide-up">
      <div className="bg-zinc-950/90 hover:bg-zinc-950/95 backdrop-blur-md border border-rose-500/40 rounded-2xl p-2.5 px-3 shadow-2xl shadow-rose-950/40 text-white flex items-center justify-between gap-2.5 transition-all">
        {/* Flame Icon */}
        <div
          onClick={onOpenShareModal}
          className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-rose-950/50 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 fill-white text-transparent animate-pulse" />
        </div>

        {/* Small Notice Text */}
        <div
          onClick={onOpenShareModal}
          className="min-w-0 flex-1 cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-tight text-white truncate">
              Vídeos Fresquinhos
            </span>
            <span className="text-[9px] font-extrabold text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded">
              Lançamentos
            </span>
          </div>
          <p className="text-[10px] text-zinc-300 leading-tight truncate">
            Compartilhe 1 oferta e veja novidades em 1ª mão
          </p>
        </div>

        {/* Small Action Button */}
        <button
          onClick={onOpenShareModal}
          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-[10px] font-bold shrink-0 shadow-sm active:scale-95 transition-all"
        >
          Liberar
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          title="Fechar aviso"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
