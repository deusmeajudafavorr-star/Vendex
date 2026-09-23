import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Video,
  ExternalLink,
  Sparkles,
  Save,
  Check,
  Eye,
  AlertCircle,
  ShoppingBag,
  Download,
  Tag,
  Flame,
  Clock,
  Link as LinkIcon
} from 'lucide-react';
import { VideoItem } from '../types.ts';
import { createAdminVideo, updateAdminVideo, scrapeProductPreview } from '../lib/api.ts';

interface VideoFormProps {
  initialVideo?: VideoItem | null;
  currentVersion?: number;
  onNavigate: (route: string) => void;
  onSaved: () => void;
}

export const VideoForm: React.FC<VideoFormProps> = ({
  initialVideo,
  currentVersion,
  onNavigate,
  onSaved,
}) => {
  const isEditing = Boolean(initialVideo && initialVideo.id);

  const [videoUrl, setVideoUrl] = useState(initialVideo?.video_url || '');
  const [downloadUrl, setDownloadUrl] = useState(initialVideo?.download_url || '');
  const [affiliateUrl, setAffiliateUrl] = useState(
    initialVideo?.affiliate_url || initialVideo?.product_url || ''
  );
  const [title, setTitle] = useState(initialVideo?.title || '');
  const [description, setDescription] = useState(initialVideo?.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialVideo?.thumbnail_url || '');
  const [allowDownload, setAllowDownload] = useState<boolean>(
    initialVideo ? initialVideo.allow_download : true
  );
  const [active, setActive] = useState<boolean>(
    initialVideo ? initialVideo.active : true
  );
  const [position, setPosition] = useState<number>(initialVideo?.position || 1);
  const [tagsInput, setTagsInput] = useState<string>(
    initialVideo?.tags ? initialVideo.tags.join(', ') : ''
  );
  const [price, setPrice] = useState<string>(initialVideo?.price || '');
  const [discount, setDiscount] = useState<string>(initialVideo?.discount || '');

  // Priority / Fresh Video fields
  const [priorityRelease, setPriorityRelease] = useState<boolean>(
    initialVideo?.priority_release || false
  );
  const [priorityDurationHours, setPriorityDurationHours] = useState<number>(
    initialVideo?.priority_duration_hours || 24
  );

  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [productIframeFailed, setProductIframeFailed] = useState(false);

  // Auto scrape product preview when affiliateUrl changes and title is empty
  const handleScrapeProduct = async () => {
    if (!affiliateUrl) return;
    setScraping(true);
    try {
      const data = await scrapeProductPreview(affiliateUrl);
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.image && !thumbnailUrl) setThumbnailUrl(data.image);
    } catch {
      // ignore
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = async (publishAsActive = true) => {
    setError(null);
    setSuccess(null);

    if (!videoUrl.trim()) {
      setError('O link do vídeo é obrigatório.');
      return;
    }

    if (!title.trim()) {
      setError('O título do produto é obrigatório.');
      return;
    }

    if (!affiliateUrl.trim()) {
      setError('O link de afiliado é obrigatório.');
      return;
    }

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: Partial<VideoItem> = {
      video_url: videoUrl.trim(),
      download_url: downloadUrl.trim() || videoUrl.trim(),
      product_url: affiliateUrl.trim(),
      affiliate_url: affiliateUrl.trim(),
      title: title.trim(),
      description: description.trim(),
      thumbnail_url: thumbnailUrl.trim(),
      allow_download: allowDownload,
      active: publishAsActive,
      position: Number(position) || 1,
      tags: tagsArray,
      price: price.trim() || undefined,
      discount: discount.trim() || undefined,
      priority_release: priorityRelease,
      priority_duration_hours: Number(priorityDurationHours) || 24,
    };

    setSaving(true);
    try {
      if (isEditing && initialVideo) {
        await updateAdminVideo(initialVideo.id, payload, currentVersion);
        setSuccess('Vídeo atualizado com sucesso e salvo no banco oficial!');
      } else {
        await createAdminVideo(payload, currentVersion);
        setSuccess('Vídeo publicado com sucesso! Já disponível no feed.');
      }

      setTimeout(() => {
        onSaved();
        onNavigate('/admin/videos');
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Erro ao salvar vídeo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => onNavigate('/admin/videos')}
          className="flex items-center gap-2 text-zinc-300 hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Vídeos</span>
        </button>

        <h1 className="font-bold text-sm">
          {isEditing ? 'Editar Vídeo do Produto' : 'Cadastrar Novo Vídeo'}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors disabled:opacity-50"
          >
            Salvar Rascunho
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Gravando...' : 'Publicar Vídeo'}</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-3">
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Card: Video Links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm border-b border-zinc-800 pb-3">
              <Video className="w-4 h-4" />
              <span>1. Configuração do Vídeo</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Link do Vídeo (MP4, Shopee Video, URL direta) *
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://exemplo.com/video.mp4"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Cole o link direto do MP4 ou URL de compartilhamento.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Link de Download (Opcional)
                </label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="Se vazio, usará o link do vídeo"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Thumbnail / Capa (Opcional)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://exemplo.com/thumb.jpg"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div>
                <span className="text-xs font-bold text-white block">Permitir Download do Vídeo</span>
                <span className="text-[11px] text-zinc-400">
                  Exibe o botão de salvar vídeo para os visitantes no feed
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAllowDownload(!allowDownload)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  allowDownload ? 'bg-rose-600 justify-end' : 'bg-zinc-800 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
          </div>

          {/* Card: Affiliate Link */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm border-b border-zinc-800 pb-3">
              <ShoppingBag className="w-4 h-4" />
              <span>2. Link de Afiliado</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Link de Afiliado (Botão de Compra / Ver Oferta) *
                </label>
                <button
                  type="button"
                  onClick={handleScrapeProduct}
                  disabled={!affiliateUrl || scraping}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{scraping ? 'Extraindo dados...' : 'Buscar título e imagem'}</span>
                </button>
              </div>
              <input
                type="url"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="https://s.shopee.com.br/SEU_CODIGO ou https://mercadolivre.com/sec/..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Insira o seu link de afiliado. Todas as comissões e compras feitas pelos usuários irão diretamente para a sua conta de afiliado.
              </p>
            </div>
          </div>

          {/* Card: Details, Position & Tags */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b border-zinc-800 pb-3">
              <Tag className="w-4 h-4" />
              <span>3. Informações do Produto & Exibição</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Título / Nome do Produto *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Fone Bluetooth ANC Cancelamento de Ruído"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Descrição Curta
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição atrativa em até 2 linhas para o feed..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Preço</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="R$ 89,90"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Desconto</label>
                <input
                  type="text"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="-40%"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Posição no Feed</label>
                <input
                  type="number"
                  min="1"
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Eletrônicos, Fone, Shopee, Promoção"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div>
                <span className="text-xs font-bold text-white block">Status do Vídeo</span>
                <span className="text-[11px] text-zinc-400">
                  {active ? 'Ativo (Aparece no feed público)' : 'Inativo (Oculto do feed)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  active ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {active ? 'Ativo' : 'Rascunho'}
              </button>
            </div>

            {/* Priority Release / Vídeo Fresquinho Mode */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-950/20 to-zinc-950 border border-rose-500/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <Flame className="w-4 h-4 fill-rose-400" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      🔥 Modo Vídeo Fresquinho (Acesso Prioritário)
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Disponibilizar primeiro para usuários com acesso prioritário ativo.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPriorityRelease(!priorityRelease)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    priorityRelease
                      ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md shadow-rose-950/50'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {priorityRelease ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              {priorityRelease && (
                <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Duração da exclusividade:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={priorityDurationHours}
                      onChange={(e) => setPriorityDurationHours(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                    >
                      <option value={6}>6 horas</option>
                      <option value={12}>12 horas</option>
                      <option value={24}>24 horas (Recomendado)</option>
                      <option value={48}>48 horas</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Mobile Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-20 flex flex-col items-center w-full max-w-sm">
            <div className="flex items-center justify-between w-full mb-3 px-2">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-rose-500" />
                <span>Preview em Tempo Real</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                100vh Feed
              </span>
            </div>

            {/* Mobile Device Mockup Frame */}
            <div className="relative w-full aspect-[9/16] bg-black rounded-[2.5rem] border-[6px] border-zinc-800 overflow-hidden shadow-2xl flex flex-col justify-end">
              {/* Top speaker notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-900 rounded-full z-30" />

              {/* Video Preview */}
              {videoUrl ? (
                <video
                  src={videoUrl}
                  poster={thumbnailUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-zinc-600 bg-zinc-950">
                  <Video className="w-12 h-12 mb-2 stroke-[1.5]" />
                  <span className="text-xs font-semibold">Cole a URL do vídeo para ver a reprodução</span>
                </div>
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

              {/* Action Buttons Mockup */}
              <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900/60 backdrop-blur-md flex items-center justify-center text-white text-xs">
                  ❤️
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-900/60 backdrop-blur-md flex items-center justify-center text-white text-xs">
                  ↗
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-900/60 backdrop-blur-md flex items-center justify-center text-white text-xs">
                  🔊
                </div>
                {allowDownload && (
                  <div className="w-10 h-10 rounded-full bg-zinc-900/60 backdrop-blur-md flex items-center justify-center text-white text-xs">
                    ⬇
                  </div>
                )}
              </div>

              {/* Bottom Info Overlay */}
              <div className="relative z-20 p-4 flex flex-col gap-2">
                {tagsInput && (
                  <div className="flex flex-wrap gap-1">
                    {tagsInput.split(',').slice(0, 2).map((t, i) => (
                      <span key={i} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-zinc-300">
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                    {title || 'Título do produto de exemplo'}
                  </h4>
                  {price && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-400 font-extrabold text-xs">{price}</span>
                      {discount && (
                        <span className="text-[10px] bg-rose-600 px-1 py-0.2 rounded text-white font-bold">
                          {discount}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-zinc-300 line-clamp-2 leading-tight">
                  {description || 'Descrição curta do produto como aparecerá no feed de vídeos.'}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Ver produto</span>
                  </div>
                  {allowDownload && (
                    <div className="py-2.5 px-3 rounded-xl bg-zinc-900/80 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1 border border-white/10">
                      <Download className="w-3 h-3" />
                      <span>Baixar</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Affiliate Link Preview */}
            {affiliateUrl && (
              <div className="w-full mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Link de Afiliado</span>
                </span>
                <a
                  href={affiliateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-semibold"
                >
                  <span>Testar link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
