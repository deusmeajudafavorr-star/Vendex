import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  RefreshCw,
  Compass,
  DollarSign,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { VideoItem, UserPriorityProfile } from '../types.ts';
import { fetchFeedVideos } from '../lib/api.ts';
import { VideoCard } from './VideoCard.tsx';
import { PriorityHeaderBadge } from './PriorityHeaderBadge.tsx';
import { FreshVideoModal } from './FreshVideoModal.tsx';
import { FreshVideoBanner } from './FreshVideoBanner.tsx';
import {
  fetchUserProfile,
  subscribeToProfile,
  trackReferralVisit,
  canShowFreshNotification,
  recordFreshNotificationShown
} from '../lib/priority.ts';

interface FeedProps {
  onNavigate: (route: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ onNavigate }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [sourceInfo, setSourceInfo] = useState<string>('carregando...');

  // Priority Access & Modal States
  const [userProfile, setUserProfile] = useState<UserPriorityProfile | null>(null);
  const [freshModalVideo, setFreshModalVideo] = useState<VideoItem | null>(null);
  const [showFreshNotification, setShowFreshNotification] = useState<boolean>(false);
  const hasTriggeredNotificationRef = useRef<boolean>(false);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Check priority status helper
  const isPriorityUser = Boolean(
    userProfile?.priority_active &&
    userProfile?.priority_until &&
    new Date(userProfile.priority_until).getTime() > Date.now()
  );

  // Initial load
  const loadVideos = useCallback(
    async (pageNum: number, reset = false, tag = selectedTag, search = searchQuery, priorityOverride?: boolean) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const checkPriority = priorityOverride !== undefined ? priorityOverride : isPriorityUser;

      try {
        const data = await fetchFeedVideos(pageNum, 5, tag, search, checkPriority);
        if (reset) {
          setVideos(data.videos || []);
          setActiveIndex(0);
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        } else {
          setVideos((prev) => {
            const existingIds = new Set(prev.map((v) => v.id));
            const fresh = (data.videos || []).filter((v: VideoItem) => !existingIds.has(v.id));
            return [...prev, ...fresh];
          });
        }

        setHasMore(data.pagination?.hasMore ?? false);
        setPage(pageNum);
        if (data.tags) {
          setAvailableTags(data.tags);
        }
        setSourceInfo(data.source === 'firebase' ? 'Firebase RTDB' : 'Base VendeX');
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedTag, searchQuery, isPriorityUser]
  );

  // Mount initialization: track referrals, fetch user profile, check onboarding
  useEffect(() => {
    trackReferralVisit();

    fetchUserProfile().then((p) => {
      setUserProfile(p);
      const isPri = Boolean(p.priority_active && p.priority_until && new Date(p.priority_until).getTime() > Date.now());
      loadVideos(1, true, selectedTag, searchQuery, isPri);
    });

    const unsubscribe = subscribeToProfile((updated) => {
      setUserProfile(updated);
    });

    return () => unsubscribe();
  }, []);

  // Check and trigger discreet fresh video notification while scrolling videos:
  // Frequency cap: max 2x a day, at least 20 min interval between appearances
  useEffect(() => {
    if (activeIndex >= 1 && !hasTriggeredNotificationRef.current && !isPriorityUser) {
      if (canShowFreshNotification()) {
        hasTriggeredNotificationRef.current = true;
        setShowFreshNotification(true);
        recordFreshNotificationShown();
      }
    }
  }, [activeIndex, isPriorityUser]);

  // Handle URL referral or deep linked video (/v/:id or ?v=:id)
  useEffect(() => {
    if (videos.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetVideoId = urlParams.get('v') || (window.location.pathname.startsWith('/v/') ? window.location.pathname.split('/')[2] : null);

    if (targetVideoId) {
      const idx = videos.findIndex((v) => v.id === targetVideoId);
      if (idx !== -1 && idx !== activeIndex) {
        scrollToIndex(idx);
      }
    }
  }, [videos]);

  // IntersectionObserver to detect strictly visible video for auto-play and paging
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== activeIndex) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: [0.6],
      }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [videos, activeIndex]);

  // Infinite scroll trigger when reaching near the end (index >= length - 2)
  useEffect(() => {
    if (activeIndex >= videos.length - 2 && hasMore && !loadingMore && !loading) {
      loadVideos(page + 1, false);
    }
  }, [activeIndex, videos.length, hasMore, loadingMore, loading, page, loadVideos]);

  // Keyboard navigation on desktop (ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'j', 'J'].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (['ArrowUp', 'PageUp', 'k', 'K'].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, videos.length]);

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= videos.length) return;
    const targetEl = itemRefs.current[index];
    if (targetEl && containerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
      setActiveIndex(index);
    }
  };

  const handleSelectTag = (tag: string) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    loadVideos(1, true, newTag, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSearchModal(false);
    loadVideos(1, true, selectedTag, searchQuery);
  };

  const clearFilters = () => {
    setSelectedTag('');
    setSearchQuery('');
    loadVideos(1, true, '', '');
  };

  return (
    <div className="relative w-full h-[100dvh] bg-zinc-950 overflow-hidden flex flex-col items-center">
      {/* Top Header / Branding Bar */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between pointer-events-none">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              if (selectedTag || searchQuery) clearFilters();
              scrollToIndex(0);
            }}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-900/50">
              <span className="font-black text-white text-base tracking-tighter">VX</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base tracking-wide text-white leading-none">
                  Vende<span className="text-rose-500">X</span>
                </h1>
                <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Ao Vivo
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium leading-tight">
                Descubra. Assista. Compre.
              </p>
            </div>
          </button>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Priority Status Badge */}
          <PriorityHeaderBadge
            userProfile={userProfile}
            onNavigateToProfile={() => onNavigate('/perfil')}
            onOpenFreshModal={() => setFreshModalVideo(videos[activeIndex] || videos[0])}
          />

          {/* Tag / Search toggle */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md border border-white/10 transition-colors"
            title="Buscar produtos e tags"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Profile link */}
          <button
            onClick={() => onNavigate('/perfil')}
            className="p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md border border-white/10 transition-colors"
            title="Meu Perfil e Missões"
          >
            <User className="w-4 h-4" />
          </button>

          {/* Simulator link */}
          <button
            onClick={() => onNavigate('/comece')}
            className="px-2.5 py-1.5 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-amber-400 text-xs font-semibold backdrop-blur-md border border-amber-500/20 flex items-center gap-1 transition-colors"
            title="Simulador de Ganhos VendeX"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ganhar</span>
          </button>

          {/* Admin link */}
          <button
            onClick={() => onNavigate('/admin')}
            className="p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 backdrop-blur-md border border-white/10 transition-colors"
            title="Painel Administrativo"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Filter / Active Tag Pill Banner */}
      {(selectedTag || searchQuery) && (
        <div className="absolute top-14 z-40 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs backdrop-blur-md shadow-lg animate-fade-in">
          <span>
            Filtrando por: <strong>{selectedTag ? `#${selectedTag}` : `"${searchQuery}"`}</strong>
          </span>
          <button onClick={clearFilters} className="p-0.5 hover:text-white" title="Limpar filtro">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Vertical Feed Container */}
      <div
        ref={containerRef}
        className="w-full max-w-md h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar relative shadow-2xl bg-black"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
            <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
            <p className="text-sm font-semibold tracking-wide">Carregando feed VendeX...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400 gap-4">
            <Sparkles className="w-12 h-12 text-rose-500 stroke-[1.5]" />
            <h3 className="text-lg font-bold text-white">Nenhum produto encontrado</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Não encontramos vídeos com o filtro selecionado. Tente buscar por outros termos ou limpar a busca.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Ver todos os vídeos
            </button>
          </div>
        ) : (
          videos.map((video, idx) => (
            <div
              key={video.id}
              data-index={idx}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className="w-full h-[100dvh] snap-start snap-always"
            >
              <VideoCard
                video={video}
                isActive={idx === activeIndex}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((m) => !m)}
                onSelectTag={handleSelectTag}
                onOpenFreshModal={(v) => setFreshModalVideo(v)}
              />
            </div>
          ))
        )}

        {loadingMore && (
          <div className="py-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
            <span>Carregando mais produtos...</span>
          </div>
        )}
      </div>

      {/* Floating Fresh Video Notification Capsule (Appears while scrolling, max 2x/day, 20min interval) */}
      {showFreshNotification && videos[activeIndex] && (
        <FreshVideoBanner
          video={videos[activeIndex]}
          userProfile={userProfile}
          onOpenShareModal={() => setFreshModalVideo(videos[activeIndex])}
          onNavigateToProfile={() => onNavigate('/perfil')}
          onDismiss={() => setShowFreshNotification(false)}
        />
      )}

      {/* Desktop Up/Down Scroll Floating Buttons */}
      <div className="hidden md:flex fixed right-8 bottom-12 flex-col gap-2 z-40">
        <button
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="p-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-30 text-white shadow-xl backdrop-blur-md border border-white/10 transition-all active:scale-95"
          title="Vídeo Anterior (Seta Cima)"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex >= videos.length - 1}
          className="p-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-30 text-white shadow-xl backdrop-blur-md border border-white/10 transition-all active:scale-95"
          title="Próximo Vídeo (Seta Baixo)"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Search / Tag Filter Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-lg">Buscar no VendeX</h3>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: smartwatch, fone, liquidificador..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                autoFocus
              />
              <Search className="w-5 h-5 text-zinc-500 absolute left-3.5 top-3.5" />
            </form>

            {/* Popular tags */}
            {availableTags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-2">Tags Populares:</p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTag(tag);
                        setShowSearchModal(false);
                        loadVideos(1, true, tag, searchQuery);
                      }}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        selectedTag === tag
                          ? 'bg-rose-600 text-white font-bold'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Limpar Tudo
              </button>
              <button
                onClick={handleSearchSubmit}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fresh Video Share / Unlock Modal */}
      {freshModalVideo && (
        <FreshVideoModal
          video={freshModalVideo}
          userProfile={userProfile}
          isOpen={Boolean(freshModalVideo)}
          onClose={() => setFreshModalVideo(null)}
          onShareSuccess={(updatedProfile) => {
            setUserProfile(updatedProfile);
            const priActive = Boolean(
              updatedProfile.priority_active &&
              updatedProfile.priority_until &&
              new Date(updatedProfile.priority_until).getTime() > Date.now()
            );
            if (priActive) {
              // Reload feed videos with unlocked status
              loadVideos(1, true, selectedTag, searchQuery, true);
            }
          }}
        />
      )}
    </div>
  );
};
