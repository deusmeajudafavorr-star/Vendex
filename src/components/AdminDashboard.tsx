import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Search,
  Upload,
  BarChart3,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  MousePointer,
  Download,
  Percent,
  CheckCircle,
  XCircle,
  Database,
  RefreshCw,
  LogOut,
  FolderSync,
  Layers,
  ArrowUpDown,
  Flame,
  Share2,
  Users,
  TrendingUp,
  Sparkles,
  Clock,
  Sliders,
  Settings
} from 'lucide-react';
import { VideoItem, PrioritySettings } from '../types.ts';
import {
  fetchAdminVideos,
  updateAdminVideo,
  deleteAdminVideo,
  clearBackendCache,
  fetchPriorityMetrics,
  updatePrioritySettings
} from '../lib/api.ts';

interface AdminDashboardProps {
  user: any;
  onNavigate: (route: string) => void;
  onSelectEditVideo: (video: VideoItem) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onNavigate,
  onSelectEditVideo,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'priority'>('videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<any>({
    totalVideos: 0,
    activeVideos: 0,
    totalViews: 0,
    totalClicks: 0,
    totalDownloads: 0,
    ctr: '0.0%',
  });
  const [settings, setSettings] = useState<any>({});
  const [source, setSource] = useState<string>('firebase');

  // Priority metrics & settings
  const [priorityData, setPriorityData] = useState<any>(null);
  const [priorityForm, setPriorityForm] = useState<PrioritySettings>({
    enabled: true,
    frequency: 'daily',
    duration_hours: 24,
    default_priority_hours: 24,
    shares_required: 1,
    fresh_video_duration_hours: 24,
    custom_message: 'Você está na frente! Os novos vídeos poderão aparecer para você antes dos demais usuários.',
  });
  const [savingPriority, setSavingPriority] = useState(false);

  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPriorityData = async () => {
    try {
      const data = await fetchPriorityMetrics();
      setPriorityData(data);
      if (data.settings) {
        setPriorityForm(data.settings);
      }
    } catch (err: any) {
      console.warn('Failed to load priority metrics:', err);
    }
  };

  const loadData = async (f = filter, s = search) => {
    setLoading(true);
    try {
      const data = await fetchAdminVideos(f, s);
      setVideos(data.videos || []);
      setStats(data.stats || {});
      setSettings(data.settings || {});
      setSource(data.source || 'firebase');
      await loadPriorityData();
    } catch (err: any) {
      console.error('Failed to load admin videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filter, search);
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(filter, search);
  };

  const handleToggleActive = async (video: VideoItem) => {
    setActionLoading(video.id);
    try {
      await updateAdminVideo(video.id, { active: !video.active }, settings.version);
      setFeedback(`Vídeo "${video.title}" ${!video.active ? 'ativado' : 'desativado'}.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (video: VideoItem) => {
    if (!window.confirm(`Tem certeza que deseja remover o vídeo "${video.title}"? Esta ação criará backup antes de remover.`)) {
      return;
    }

    setActionLoading(video.id);
    try {
      await deleteAdminVideo(video.id, settings.version);
      setFeedback('Vídeo removido com sucesso!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearCache = async () => {
    try {
      await clearBackendCache();
      setFeedback('Cache invalidado! Dados sincronizados.');
      await loadData();
    } catch {
      // ignore
    }
  };

  const handleSavePrioritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPriority(true);
    try {
      await updatePrioritySettings(priorityForm, settings.version);
      setFeedback('Configurações do Acesso Prioritário salvas no banco com sucesso!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações de prioridade');
    } finally {
      setSavingPriority(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center font-black text-sm">
            VX
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base leading-none">
              Painel de Controle <span className="text-rose-500">VendeX</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-zinc-400 font-medium">
                {user.email || 'Admin'}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Firebase RTDB Ativo</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/')}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Ver Feed</span>
          </button>

          <button
            onClick={handleClearCache}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800"
            title="Sincronizar e Invalidar Cache"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onLogout();
            }}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 hover:text-rose-400 text-zinc-400 border border-zinc-800 transition-colors"
            title="Sair do Painel"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-6">
        {/* Feedback alert */}
        {feedback && (
          <div className="p-3 rounded-2xl bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-white text-xs">
              Fechar
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'videos'
                ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Video className="w-4 h-4 text-rose-500" />
            <span>Catálogo de Vídeos ({videos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('priority')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'priority'
                ? 'bg-gradient-to-r from-rose-600/30 to-amber-500/30 text-white border border-rose-500/50 shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>🔥 Vídeo Fresquinho & Métricas</span>
            {priorityData?.metrics?.priorityUsersCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-sm">
                {priorityData.metrics.priorityUsersCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'priority' ? (
          /* =======================================
             TAB: VÍDEO FRESQUINHO & PRIORIDADE
             ======================================= */
          <div className="space-y-6 animate-fade-in">
            {/* Priority KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Missões Hoje (1/1)
                </span>
                <span className="text-2xl font-black text-emerald-400 mt-1">
                  {priorityData?.metrics?.missionsCompletedToday || 0}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Usuários completaram</span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Compartilhamentos Hoje
                </span>
                <span className="text-2xl font-black text-rose-400 mt-1">
                  {priorityData?.metrics?.sharesToday || 0}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Nas redes sociais</span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Prioritários Ativos
                </span>
                <span className="text-2xl font-black text-amber-400 mt-1">
                  {priorityData?.metrics?.priorityUsersCount || 0}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Acesso antecipado liberado</span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Visitas por Indicação
                </span>
                <span className="text-2xl font-black text-white mt-1">
                  {priorityData?.metrics?.visitsFromShares || 0}
                </span>
                <span className="text-[10px] text-emerald-400 mt-0.5">Cliques reais rastreados</span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Total de Compartilhamentos
                </span>
                <span className="text-2xl font-black text-white mt-1">
                  {priorityData?.metrics?.totalShares || 0}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Histórico completo</span>
              </div>
            </div>

            {/* Funnel of Engagement */}
            <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Funil de Engajamento por Compartilhamento</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">1. Compartilhamentos</p>
                  <p className="text-xl font-black text-white mt-0.5">{priorityData?.metrics?.funnel?.shares || 0}</p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">2. Visitas Geradas</p>
                  <p className="text-xl font-black text-amber-400 mt-0.5">{priorityData?.metrics?.funnel?.visits || 0}</p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">3. Views de Vídeos</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{priorityData?.metrics?.funnel?.views || 0}</p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">4. Cliques Afiliado</p>
                  <p className="text-xl font-black text-rose-400 mt-0.5">{priorityData?.metrics?.funnel?.clicks || 0}</p>
                </div>
              </div>
            </div>

            {/* Top Shared Videos & Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Shared Products (7 cols) */}
              <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  <span>Produtos Mais Compartilhados</span>
                </h3>

                {(!priorityData?.metrics?.topSharedVideos || priorityData.metrics.topSharedVideos.length === 0) ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Nenhum compartilhamento registrado ainda. Os dados aparecerão conforme os usuários compartilharem as ofertas.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {priorityData.metrics.topSharedVideos.map((item: any, idx: number) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-extrabold text-zinc-500 w-4">
                            #{idx + 1}
                          </span>
                          {item.thumbnail_url && (
                            <img
                              src={item.thumbnail_url}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate max-w-xs">{item.title}</h4>
                            <p className="text-[10px] text-zinc-400">
                              {item.views} visualizações • {item.clicks} cliques
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-400 font-extrabold text-xs border border-rose-500/30 flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            <span>{item.shares} compartilhamentos</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent Shares Log */}
                {priorityData?.metrics?.recentShares?.length > 0 && (
                  <div className="pt-4 border-t border-zinc-800">
                    <h4 className="text-[11px] font-bold uppercase text-zinc-400 mb-2">
                      Compartilhamentos Recentes
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {priorityData.metrics.recentShares.map((s: any) => (
                        <div
                          key={s.id}
                          className="text-[11px] p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 flex items-center justify-between"
                        >
                          <span className="text-zinc-300 font-mono truncate max-w-[180px]">
                            {s.video_id}
                          </span>
                          <span className="text-zinc-500">
                            {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            {s.visits || 0} visitas
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Priority Settings Form (5 cols) */}
              <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Configurações do Acesso Prioritário</span>
                </h3>

                <form onSubmit={handleSavePrioritySettings} className="space-y-3.5">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <div>
                      <span className="text-xs font-bold text-white block">Sistema de Acesso Prioritário</span>
                      <span className="text-[10px] text-zinc-400">Ativa badges e missões diárias no feed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPriorityForm({ ...priorityForm, enabled: !priorityForm.enabled })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        priorityForm.enabled
                          ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {priorityForm.enabled ? 'Ativado' : 'Desativado'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Duração do Acesso Prioritário (Horas)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={priorityForm.duration_hours}
                      onChange={(e) => setPriorityForm({ ...priorityForm, duration_hours: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">Tempo que o usuário fica prioritário após compartilhar (padrão: 24h)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Compartilhamentos Necessários (Missão Diária)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={priorityForm.shares_required}
                      onChange={(e) => setPriorityForm({ ...priorityForm, shares_required: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">Quantidade de ofertas compartilhadas por dia (padrão: 1)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Exclusividade Padrão do Vídeo Fresco (Horas)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={priorityForm.fresh_video_duration_hours}
                      onChange={(e) => setPriorityForm({ ...priorityForm, fresh_video_duration_hours: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">Janela que novos vídeos ficam visíveis primeiro para prioritários</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Mensagem de Liberação Personalizada
                    </label>
                    <textarea
                      rows={2}
                      value={priorityForm.custom_message}
                      onChange={(e) => setPriorityForm({ ...priorityForm, custom_message: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPriority}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>{savingPriority ? 'Salvando no Firebase...' : 'Salvar Configurações no Firebase'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* =======================================
             TAB: CATÁLOGO DE VÍDEOS (EXISTING VIEW)
             ======================================= */
          <>
        {/* Top Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Total Vídeos
            </span>
            <span className="text-2xl font-black text-white mt-1">{stats.totalVideos}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">{stats.activeVideos} ativos</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Visualizações
            </span>
            <span className="text-2xl font-black text-white mt-1">
              {stats.totalViews?.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-400 mt-0.5">Plays no feed</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Cliques no Produto
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1">
              {stats.totalClicks?.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Afiliado acessado</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Downloads
            </span>
            <span className="text-2xl font-black text-rose-400 mt-1">
              {stats.totalDownloads?.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">MP4 baixados</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Taxa CTR
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1">{stats.ctr}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Cliques / Views</span>
          </div>

          <div className="bg-gradient-to-br from-rose-950/40 to-zinc-900 border border-rose-500/30 p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">
              Banco VendeX
            </span>
            <span className="text-sm font-extrabold text-white mt-1 truncate">
              v{settings.version || 1}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 truncate font-mono">
              Firebase RTDB Cloud
            </span>
          </div>
        </div>

        {/* Action Row & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/admin/videos/novo')}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Vídeo</span>
            </button>

            <button
              onClick={() => onNavigate('/admin/importar')}
              className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Importar Lote (CSV/JSON)</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por produto, tag..."
                className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 w-full sm:w-48"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            </form>

            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">Todos os Vídeos</option>
              <option value="active">Somente Ativos</option>
              <option value="inactive">Somente Inativos / Rascunhos</option>
              <option value="most_viewed">Mais Visualizados</option>
              <option value="most_clicked">Mais Clicados</option>
              <option value="most_downloaded">Mais Baixados</option>
            </select>
          </div>
        </div>

        {/* Video Table List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Thumbnail</th>
                  <th className="py-3 px-4">Produto & Links</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Posição</th>
                  <th className="py-3 px-4 text-center">Views</th>
                  <th className="py-3 px-4 text-center">Cliques</th>
                  <th className="py-3 px-4 text-center">CTR</th>
                  <th className="py-3 px-4 text-center">Downloads</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                      <span>Carregando dados...</span>
                    </td>
                  </tr>
                ) : videos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-rose-400">
                          <Video className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">
                          {search || filter !== 'all'
                            ? 'Nenhum vídeo encontrado com esses filtros'
                            : 'Catálogo de Vídeos Zerado'}
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-xs">
                          {search || filter !== 'all'
                            ? 'Tente alterar os termos de busca ou remover os filtros aplicados.'
                            : 'O banco de dados no Firebase está limpo e pronto para você cadastrar seus vídeos e links de afiliado.'}
                        </p>
                        <button
                          onClick={() => onNavigate('/admin/videos/novo')}
                          className="mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Adicionar Primeiro Vídeo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  videos.map((video) => {
                    const ctr =
                      video.views > 0
                        ? `${((video.clicks / video.views) * 100).toFixed(1)}%`
                        : '0.0%';

                    return (
                      <tr key={video.id} className="hover:bg-zinc-800/40 transition-colors">
                        {/* Thumb */}
                        <td className="py-3 px-4">
                          <div className="w-12 h-16 rounded-lg bg-black overflow-hidden relative border border-zinc-800">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <Video className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Title & Links */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-white line-clamp-1">{video.title}</div>
                          <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                            {video.description || 'Sem descrição'}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px]">
                            {video.affiliate_url && (
                              <a
                                href={video.affiliate_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <span>Link Afiliado</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleActive(video)}
                            disabled={actionLoading === video.id}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              video.active
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {video.active ? 'Ativo' : 'Rascunho'}
                          </button>
                        </td>

                        {/* Position */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-zinc-300">
                          #{video.position || 0}
                        </td>

                        {/* Views */}
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {video.views?.toLocaleString()}
                        </td>

                        {/* Clicks */}
                        <td className="py-3 px-4 text-center font-mono font-medium text-amber-400">
                          {video.clicks?.toLocaleString()}
                        </td>

                        {/* CTR */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                          {ctr}
                        </td>

                        {/* Downloads */}
                        <td className="py-3 px-4 text-center font-mono font-medium text-rose-400">
                          {video.downloads?.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                onSelectEditVideo(video);
                                onNavigate(`/admin/videos/${video.id}`);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                              title="Editar Produto"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(video)}
                              disabled={actionLoading === video.id}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  );
};
