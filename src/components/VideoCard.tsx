import React, { useRef, useEffect, useState } from 'react';
import {
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Download,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Check,
  Tag,
  Flame,
  Lock
} from 'lucide-react';
import { VideoItem } from '../types.ts';
import { sendAnalytics } from '../lib/api.ts';

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectTag?: (tag: string) => void;
  onOpenFreshModal?: (video: VideoItem) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  isMuted,
  onToggleMute,
  onSelectTag,
  onOpenFreshModal,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(video.views * 0.18) + 12);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  // Play / pause strictly when isActive changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (video.is_locked_priority) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    if (isActive) {
      el.muted = isMuted;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            sendAnalytics(video.id, 'view');
          })
          .catch((err) => {
            console.warn('[Video playback autoplay interrupted]', err);
            setIsPlaying(false);
          });
      }
    } else {
      el.pause();
      el.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, video.is_locked_priority]);

  // Keep mute state in sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Progress bar tracking
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const handleShare = async () => {
    sendAnalytics(video.id, 'share');
    const shareUrl = window.location.href;
    const shareData = {
      title: `VendeX: ${video.title}`,
      text: `${video.title} - Veja no VendeX!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    } catch {
      alert('Link copiado para a área de transferência!');
    }
  };

  const handleDownload = async () => {
    if (!video.allow_download) return;

    sendAnalytics(video.id, 'download');
    setDownloadStatus('Preparando vídeo...');

    const targetUrl = (video.download_url || video.video_url || '').trim();
    if (!targetUrl) {
      setDownloadStatus('Vídeo indisponível');
      setTimeout(() => setDownloadStatus(null), 3000);
      return;
    }

    const cleanTitle = video.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const filename = (cleanTitle || 'vendex-video') + '.mp4';

    // Mobile browsers often block cross-origin fetch() because of CORS.
    // Try a Blob download first, then fall back to opening the real MP4 URL.
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    try {
      const response = await fetch(targetUrl, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);

      const blob = await response.blob();
      if (!blob.size) throw new Error('Empty video');

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Keep the blob alive long enough for mobile browsers to start saving it.
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);

      setDownloadStatus('Download iniciado!');
      setTimeout(() => setDownloadStatus(null), 3000);
      return;
    } catch (error) {
      console.warn('[VendeX download] Blob download unavailable:', error);
    }

    // Cross-origin MP4 fallback. The native browser media viewer can save it.
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (!isMobile) link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setDownloadStatus(
      isMobile
        ? 'Vídeo aberto. Toque em ⋮ e escolha Baixar/Salvar vídeo.'
        : 'Download iniciado!'
    );
    setTimeout(() => setDownloadStatus(null), 5000);
  };
  const handleProductClick = () => {
    sendAnalytics(video.id, 'click');
    const url = video.affiliate_url || video.product_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] bg-black snap-start snap-always overflow-hidden flex items-center justify-center select-none">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url}
        playsInline
        loop
        preload={isActive ? 'auto' : 'metadata'}
        onLoadedData={() => setVideoLoaded(true)}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlayPause}
        className={`w-full h-full object-cover cursor-pointer ${
          video.is_locked_priority ? 'blur-md brightness-50' : ''
        }`}
      />

      {/* Locked Priority Preview Overlay */}
      {video.is_locked_priority && (
        <div className="absolute inset-0 z-35 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-rose-950/70 mb-3 animate-bounce">
            <Flame className="w-9 h-9 fill-white text-transparent" />
          </div>

          <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-extrabold text-[10px] uppercase tracking-widest mb-2">
            Acesso Antecipado Exclusivo
          </span>

          <h3 className="text-xl font-black text-white leading-tight max-w-xs">
            🔥 VÍDEO FRESQUINHO
          </h3>

          <p className="text-xs text-zinc-300 mt-2 max-w-xs leading-relaxed">
            Este produto acabou de chegar! Usuários com acesso prioritário podem assistir antes de todo mundo.
          </p>

          <div className="my-4 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 w-full max-w-xs text-left flex items-center gap-3 shadow-xl">
            {video.thumbnail_url && (
              <img
                src={video.thumbnail_url}
                alt=""
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{video.title}</p>
              <p className="text-xs text-emerald-400 font-extrabold mt-0.5">
                {video.price || 'Oferta Exclusiva'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenFreshModal?.(video)}
            className="w-full max-w-xs py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <span>🚀 Compartilhar e liberar agora</span>
          </button>

          <p className="text-[10px] text-zinc-400 mt-3 max-w-xs">
            Compartilhe 1 oferta nas suas redes e desbloqueie todos os vídeos fresquinhos por 24 horas!
          </p>
        </div>
      )}

      {/* Play/Pause overlay indicator when tapped */}
      {!isPlaying && videoLoaded && isActive && (
        <div
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-auto cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-110 shadow-2xl">
            <div className="w-0 h-0 border-y-8 border-y-transparent border-l-[14px] border-l-white ml-1" />
          </div>
        </div>
      )}

      {/* Top subtle gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Bottom gradient overlay for maximum readability */}
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none z-10" />

      {/* Right Side Action Bar */}
      <div className="absolute right-3.5 bottom-28 z-20 flex flex-col items-center gap-4 text-white">
        {/* Like */}
        <button
          onClick={handleLike}
          className="group flex flex-col items-center gap-1 focus:outline-none transition-transform active:scale-90"
          title="Curtir produto"
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
              liked
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40'
                : 'bg-zinc-900/60 hover:bg-zinc-800/80 text-white'
            }`}
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                liked ? 'fill-current scale-110' : 'stroke-[2]'
              }`}
            />
          </div>
          <span className="text-[11px] font-semibold tracking-wide drop-shadow-md">
            {likeCount}
          </span>
        </button>

        {/* Fresquinho trigger */}
        <button
          onClick={() => onOpenFreshModal?.(video)}
          className="group flex flex-col items-center gap-1 focus:outline-none transition-transform active:scale-90"
          title="🔥 Vídeo Fresquinho - Liberar acesso antecipado"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 backdrop-blur-md flex items-center justify-center text-white shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/30">
            <Flame className="w-6 h-6 fill-white text-transparent animate-pulse" />
          </div>
          <span className="text-[10px] font-extrabold text-amber-300 tracking-tight drop-shadow-md text-center leading-tight">
            Fresquinho
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="group flex flex-col items-center gap-1 focus:outline-none transition-transform active:scale-90"
          title="Compartilhar produto"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 backdrop-blur-md flex items-center justify-center text-white">
            {shareSuccess ? (
              <Check className="w-6 h-6 text-emerald-400" />
            ) : (
              <Share2 className="w-6 h-6 stroke-[2]" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-wide drop-shadow-md">
            {shareSuccess ? 'Copiado!' : 'Compartilhar'}
          </span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleMute}
          className="group flex flex-col items-center gap-1 focus:outline-none transition-transform active:scale-90"
          title={isMuted ? 'Ativar som' : 'Desativar som'}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
              !isMuted
                ? 'bg-amber-500/80 text-white'
                : 'bg-zinc-900/60 hover:bg-zinc-800/80 text-white'
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 stroke-[2]" />
            ) : (
              <Volume2 className="w-6 h-6 stroke-[2]" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-wide drop-shadow-md">
            {isMuted ? 'Mudo' : 'Som'}
          </span>
        </button>

        {/* Download video button (if allowed) */}
        {video.allow_download && (
          <button
            onClick={handleDownload}
            className="group flex flex-col items-center gap-1 focus:outline-none transition-transform active:scale-90"
            title="Baixar vídeo MP4 do produto"
          >
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-700 hover:from-emerald-300 hover:via-green-400 hover:to-emerald-600 backdrop-blur-md flex items-center justify-center text-white shadow-lg shadow-emerald-900/60 ring-2 ring-emerald-300/50 animate-pulse">
              <Download className="w-6 h-6 stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-300 ring-2 ring-black animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-300 ring-2 ring-black" />
            </div>
            <span className="text-[11px] font-black tracking-wide text-emerald-300 drop-shadow-md">
              BAIXAR
            </span>
          </button>
        )}
      </div>

      {/* Bottom Information and Product CTA */}
      <div className="absolute left-0 right-16 bottom-6 z-20 px-4 flex flex-col gap-2.5 text-white">
        {/* Priority / Fresh Video Badge */}
        {video.priority_release && (
          <div className="flex items-center gap-1.5 flex-wrap animate-fade-in">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-[10px] tracking-wide uppercase shadow-lg shadow-rose-950/50 flex items-center gap-1 animate-pulse border border-white/20">
              <Flame className="w-3 h-3 fill-white text-transparent" />
              <span>🔥 FRESQUINHO</span>
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm border border-amber-500/30">
              ⚡ ACABOU DE CHEGAR
            </span>
          </div>
        )}

        {/* Tags / Badges */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 max-w-full">
            {video.tags.slice(0, 3).map((tag, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(tag);
                }}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-zinc-200 border border-white/10 flex items-center gap-1 transition-colors"
              >
                <Tag className="w-3 h-3 text-rose-400" />
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Title and Price */}
        {(video.title || (!video.priority_release && video.price)) && (
          <div>
            {video.title && (
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold line-clamp-2 leading-snug drop-shadow-lg text-white">
                  {video.title}
                </h2>
              </div>
            )}
            {!video.priority_release && video.price && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 font-extrabold text-base tracking-tight drop-shadow">
                  {video.price}
                </span>
                {video.discount && (
                  <span className="text-[11px] font-bold bg-rose-600/90 text-white px-1.5 py-0.5 rounded-md">
                    {video.discount}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {video.description && (
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed drop-shadow max-w-[95%]">
            {video.description}
          </p>
        )}

        {/* Action Buttons: Ver Produto & Baixar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 max-w-md">
          {/* Main CTA: Ver Produto */}
          <button
            onClick={handleProductClick}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all duration-200 border border-white/15"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>Ver produto</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* Download button secondary if allowed */}
          {video.allow_download && (
            <button
              onClick={handleDownload}
              className="py-3 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-xs backdrop-blur-md border border-white/10 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadStatus || 'Baixar vídeo'}</span>
            </button>
          )}
        </div>

        {/* Download toast notification */}
        {downloadStatus && (
          <div className="mt-1 px-3 py-1.5 rounded-lg bg-zinc-900/95 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{downloadStatus}</span>
          </div>
        )}
      </div>

      {/* Continuous progress indicator at very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
        <div
          className="h-full bg-rose-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
