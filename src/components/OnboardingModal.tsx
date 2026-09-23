import React from 'react';
import { Flame, Sparkles, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { setFreshOnboardingSeen } from '../lib/priority.ts';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleStart = () => {
    setFreshOnboardingSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-sm bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-rose-500/30 to-transparent blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 mx-auto flex items-center justify-center shadow-xl shadow-rose-900/50 mb-4">
          <Flame className="w-9 h-9 fill-white text-transparent" />
        </div>

        <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400">
          Bem-vindo ao VendeX
        </span>
        <h2 className="text-xl font-black text-white tracking-tight mt-1">
          Acesso Prioritário & Vídeos Fresquinhos
        </h2>

        <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
          Descubra os produtos mais virais da internet e veja lançamentos antes de todo mundo!
        </p>

        {/* 3 Value Pillars */}
        <div className="mt-5 space-y-2.5 text-left text-xs">
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 fill-rose-400" />
            </div>
            <div>
              <p className="font-bold text-white">Compartilhe 1 oferta por dia</p>
              <p className="text-[11px] text-zinc-400">Ajude seus amigos a encontrar achadinhos incríveis.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Veja os vídeos fresquinhos antes</p>
              <p className="text-[11px] text-zinc-400">Acesso antecipado a novos produtos recém-publicados.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Saia na frente nas novidades</p>
              <p className="text-[11px] text-zinc-400">Garanta as melhores promoções e estoques limitados.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="mt-6 w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <span>Começar agora</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
