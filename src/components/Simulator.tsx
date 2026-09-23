import React, { useState } from 'react';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Sparkles,
  Zap,
  ShoppingBag,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface SimulatorProps {
  onNavigate: (route: string) => void;
}

export const Simulator: React.FC<SimulatorProps> = ({ onNavigate }) => {
  const [commission, setCommission] = useState<number>(15); // R$ per sale
  const [salesPerDay, setSalesPerDay] = useState<number>(5); // sales/day
  const [averageViews, setAverageViews] = useState<number>(1000); // views/day

  const dailyPotential = commission * salesPerDay;
  const monthlyPotential = dailyPotential * 30;
  const estimatedClicks = Math.floor(averageViews * 0.12);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-y-auto pb-16 selection:bg-rose-500 selection:text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 text-zinc-300 hover:text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Feed</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-black text-xs text-white">
            VX
          </div>
          <span className="font-extrabold text-sm tracking-wide">
            Vende<span className="text-rose-500">X</span> Afiliados
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transforme visualizações em comissões diárias</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          Monetize com <span className="bg-gradient-to-r from-rose-500 via-amber-400 to-amber-500 bg-clip-text text-transparent">Vídeos Verticais</span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Com o VendeX, seus visitantes assistem ao vídeo curto e clicam diretamente no seu link de afiliado da Shopee, Amazon ou Mercado Livre.
        </p>
      </div>

      {/* Simulator Card */}
      <div className="max-w-xl mx-auto px-4 mt-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-white">Simule seu potencial de ganhos</h2>
          </div>

          <div className="flex flex-col gap-6">
            {/* Input 1: Comissão */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-zinc-300 font-medium">Comissão média por produto:</span>
                <span className="text-rose-400 font-extrabold text-sm">
                  R$ {commission.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="100"
                step="1"
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                className="w-full accent-rose-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>R$ 3</span>
                <span>R$ 50</span>
                <span>R$ 100</span>
              </div>
            </div>

            {/* Input 2: Vendas por dia */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-zinc-300 font-medium">Vendas estimadas por dia:</span>
                <span className="text-amber-400 font-extrabold text-sm">{salesPerDay} vendas/dia</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={salesPerDay}
                onChange={(e) => setSalesPerDay(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>1 venda</span>
                <span>25 vendas</span>
                <span>50 vendas</span>
              </div>
            </div>

            {/* Input 3: Visualizações estimadas */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-zinc-300 font-medium">Visualizações estimadas de vídeos:</span>
                <span className="text-zinc-300 font-bold text-xs">{averageViews.toLocaleString()} views/dia</span>
              </div>
              <input
                type="range"
                min="200"
                max="15000"
                step="100"
                value={averageViews}
                onChange={(e) => setAverageViews(Number(e.target.value))}
                className="w-full accent-rose-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Estimativa com base no CTR médio de ~{((salesPerDay / (estimatedClicks || 1)) * 100).toFixed(1)}% de conversão de cliques.
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                  Potencial Diário
                </span>
                <span className="text-2xl font-black text-white mt-1">
                  R$ {dailyPotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  {(salesPerDay).toFixed(0)} pedidos confirmados
                </span>
              </div>

              <div className="bg-gradient-to-br from-rose-950/60 to-zinc-950 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-300">
                  Potencial Mensal
                </span>
                <span className="text-2xl font-black text-rose-400 mt-1">
                  R$ {monthlyPotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                  Projeção 30 dias contínuos
                </span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-400">
              <HelpCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Estes valores são uma <em>simulação</em> ilustrativa baseada nos dados fornecidos e não representam garantia de rendimentos. Os resultados reais dependem da sua audiência, catálogo de produtos e engajamento.
              </span>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onNavigate('/admin')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>Quero começar no VendeX</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="max-w-3xl mx-auto px-4 mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="bg-zinc-900/50 border border-zinc-800/70 p-5 rounded-2xl flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-white">Feed Viciante</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Navegação instantânea por swipe, sem barreiras de compra e com carregamento progressivo otimizado.
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/70 p-5 rounded-2xl flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-white">Qualquer Afiliado</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Compatível com Shopee, Shein, Amazon, Mercado Livre, AliExpress, Braip, Monetizze e Hotmart.
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/70 p-5 rounded-2xl flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-white">Firebase Realtime Database</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Seus vídeos, métricas e catálogo sincronizados em tempo real com alta performance no Firebase.
          </p>
        </div>
      </div>
    </div>
  );
};
