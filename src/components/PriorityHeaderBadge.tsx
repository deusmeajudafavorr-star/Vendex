import React, { useState, useEffect } from 'react';
import { Flame, Clock, Sparkles, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserPriorityProfile } from '../types.ts';
import { calculateTimeRemaining } from '../lib/priority.ts';

interface PriorityHeaderBadgeProps {
  userProfile: UserPriorityProfile | null;
  onNavigateToProfile: () => void;
  onOpenFreshModal?: () => void;
}

export const PriorityHeaderBadge: React.FC<PriorityHeaderBadgeProps> = ({
  userProfile,
  onNavigateToProfile,
  onOpenFreshModal,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [countdownStr, setCountdownStr] = useState('00:00:00');

  const isPriority = Boolean(
    userProfile?.priority_active &&
    userProfile?.priority_until &&
    new Date(userProfile.priority_until).getTime() > Date.now()
  );

  useEffect(() => {
    if (!isPriority || !userProfile?.priority_until) return;

    const tick = () => {
      const remaining = calculateTimeRemaining(userProfile.priority_until);
      setCountdownStr(remaining.formatted);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isPriority, userProfile?.priority_until]);

  return (
    <>
      {/* Top Header Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border flex items-center gap-1.5 transition-all active:scale-95 shadow-lg ${
          isPriority
            ? 'bg-gradient-to-r from-rose-600/30 to-amber-500/30 border-rose-500/50 text-white'
            : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-white/10 text-zinc-300'
        }`}
        title="Status do Acesso Prioritário"
      >
        <Flame className={`w-3.5 h-3.5 ${isPriority ? 'fill-rose-500 text-rose-500 animate-pulse' : 'text-zinc-400'}`} />
        <span className="hidden xs:inline">
          {isPriority ? '🔥 Prioritário' : '🔥 Fresquinho'}
        </span>
        {isPriority && (
          <span className="font-mono text-[10px] text-amber-300 ml-0.5">
            {countdownStr}
          </span>
        )}
      </button>

      {/* Explainer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white">
                <Flame className="w-5 h-5 fill-white text-transparent" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-rose-400 font-extrabold">
                  Sistema VendeX
                </span>
                <h3 className="text-base font-black text-white">Acesso Prioritário</h3>
              </div>
            </div>

            {isPriority ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">🔥 Acesso Prioritário Ativo</span>
                    <span className="text-[11px] font-mono font-bold text-amber-400">{countdownStr}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Você está vendo novidades e vídeos recém-publicados antes do restante dos usuários!
                  </p>
                </div>

                {userProfile?.share_streak ? (
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-zinc-300">
                      Você está há <strong className="text-white">{userProfile.share_streak} {userProfile.share_streak === 1 ? 'dia' : 'dias'}</strong> recebendo acesso antecipado!
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-300">🔥 Missão de Hoje: 0/1</span>
                  <p className="text-xs text-zinc-400 mt-1">
                    Compartilhe o link de 1 oferta nas suas redes sociais para desbloquear vídeos fresquinhos por 24 horas.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Como funciona?</p>
                  <p>1. Escolha qualquer produto no feed.</p>
                  <p>2. Toque em <strong>🔥 Vídeo Fresquinho</strong> ou Compartilhar.</p>
                  <p>3. Envie para seus amigos ou grupos e pronto: acesso liberado!</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {!isPriority && onOpenFreshModal && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    onOpenFreshModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                >
                  <span>🚀 Compartilhar oferta agora</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowModal(false);
                  onNavigateToProfile();
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Ver meu perfil e missões</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
