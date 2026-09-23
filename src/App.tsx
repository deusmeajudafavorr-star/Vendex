import React, { useState, useEffect } from 'react';
import { Feed } from './components/Feed.tsx';
import { Simulator } from './components/Simulator.tsx';
import { UserProfile } from './components/UserProfile.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { VideoForm } from './components/VideoForm.tsx';
import { ImportBatch } from './components/ImportBatch.tsx';
import { getStoredUser, clearGoogleAuth, GoogleAuthUser } from './lib/googleAuth.ts';
import { VideoItem } from './types.ts';

export default function App() {
  // Support both standard paths (/admin) and hash paths (/#/admin)
  const getCurrentRoute = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('/')) {
      return hash;
    }
    if (hash.length > 0 && !hash.startsWith('?')) {
      return '/' + hash;
    }
    return window.location.pathname || '/';
  };

  const [currentPath, setCurrentPath] = useState<string>(() => {
    return getCurrentRoute();
  });

  const [adminUser, setAdminUser] = useState<GoogleAuthUser | null>(() => {
    return getStoredUser();
  });

  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  // Sync state on popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getCurrentRoute());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Route: /perfil (User profile & daily mission streak)
  if (currentPath === '/perfil') {
    return (
      <UserProfile
        onBackToFeed={() => navigate('/')}
        onSelectVideoToWatch={(videoId) => navigate(`/?v=${videoId}`)}
        onNavigate={navigate}
      />
    );
  }

  // Route: /comece (Earnings simulator and presentation)
  if (currentPath === '/comece') {
    return <Simulator onNavigate={navigate} />;
  }

  // Route: /admin/login
  if (currentPath === '/admin/login') {
    return (
      <AdminLogin
        onLoginSuccess={(user) => {
          setAdminUser(user);
          navigate('/admin');
        }}
        onNavigate={navigate}
      />
    );
  }

  // Admin routes protection: if accessing any /admin route without login, show login
  if (currentPath.startsWith('/admin')) {
    if (!adminUser) {
      return (
        <AdminLogin
          onLoginSuccess={(user) => {
            setAdminUser(user);
            navigate(currentPath === '/admin/login' ? '/admin' : currentPath);
          }}
          onNavigate={navigate}
        />
      );
    }

    // Sub-route: /admin/videos/novo
    if (currentPath === '/admin/videos/novo') {
      return (
        <VideoForm
          initialVideo={null}
          onNavigate={navigate}
          onSaved={() => {}}
        />
      );
    }

    // Sub-route: /admin/videos/:id (Edit)
    if (currentPath.startsWith('/admin/videos/') && currentPath !== '/admin/videos') {
      return (
        <VideoForm
          initialVideo={editingVideo}
          onNavigate={navigate}
          onSaved={() => {}}
        />
      );
    }

    // Sub-route: /admin/importar
    if (currentPath === '/admin/importar') {
      return (
        <ImportBatch
          onNavigate={navigate}
          onImportComplete={() => {}}
        />
      );
    }

    // Route: /admin or /admin/videos
    return (
      <AdminDashboard
        user={adminUser}
        onNavigate={navigate}
        onSelectEditVideo={(video) => setEditingVideo(video)}
        onLogout={() => {
          clearGoogleAuth();
          setAdminUser(null);
          navigate('/');
        }}
      />
    );
  }

  // Default Route: / (TikTok / Reels / Shorts style vertical feed)
  return <Feed onNavigate={navigate} />;
}
