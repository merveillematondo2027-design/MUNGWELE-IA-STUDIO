import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { StudioTabsHeader } from './components/studios/StudioTabsHeader';
import { ImageStudio } from './components/studios/ImageStudio';
import { VideoStudio } from './components/studios/VideoStudio';
import { MusicStudio } from './components/studios/MusicStudio';
import { HomeView } from './components/views/HomeView';
import { CreationsView } from './components/views/CreationsView';
import { SubscriptionView } from './components/views/SubscriptionView';
import { ProfileView } from './components/views/ProfileView';
import { AdminView } from './components/views/AdminView';
import { HelpView } from './components/views/HelpView';
import { NotificationToast } from './components/common/NotificationToast';
import { MediaViewerModal } from './components/common/MediaViewerModal';
import { AuthModal } from './components/views/AuthModal';
import { subscribeToFirebaseUser } from './services/authService';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FirebaseSessionBridge: React.FC = () => {
  const { setUser, resetUser, addNotification } = useApp();

  useEffect(() => {
    return subscribeToFirebaseUser(
      (profile) => {
        if (profile) setUser(profile);
        else resetUser();
      },
      (error) => {
        console.warn('Firebase auth session sync error:', error);
        resetUser();
        addNotification('warning', 'Synchronisation du compte', 'La session Firebase n’a pas pu être synchronisée.');
      },
    );
  }, []);

  return null;
};

const MainLayout: React.FC = () => {
  const {
    activeTab,
    activeMediaModal,
    setActiveMediaModal,
    appSettings,
    user,
  } = useApp();

  const isStudioTab = activeTab.startsWith('studio-');
  const canOpenAdmin = user.role === 'admin' && Boolean(user.id);

  return (
    <div className="relative min-h-screen bg-[#081226] text-gray-100 flex flex-col antialiased selection:bg-purple-600 selection:text-white font-sans overflow-x-hidden">
      <FirebaseSessionBridge />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-600/12 rounded-full blur-[150px]" />
        <div className="absolute top-2/3 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[130px]" />
      </div>

      {appSettings.announcementBanner && (
        <div className="relative z-30 bg-gradient-to-r from-purple-900/60 via-pink-900/50 to-blue-900/60 backdrop-blur-xl border-b border-white/10 px-4 py-2 text-center text-xs font-semibold text-white flex items-center justify-center space-x-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-pink-300" />
          <span>{appSettings.announcementBanner}</span>
        </div>
      )}

      {appSettings.maintenanceMode && (
        <div className="relative z-30 bg-amber-950/60 backdrop-blur-xl border-b border-amber-500/30 px-4 py-2 text-center text-xs font-semibold text-amber-200 flex items-center justify-center space-x-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Le studio est actuellement en maintenance programmée pour mise à niveau des serveurs.</span>
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-row overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-y-auto">
            {isStudioTab && <StudioTabsHeader />}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {activeTab === 'home' && <HomeView />}
                {activeTab === 'studio-image' && <ImageStudio />}
                {activeTab === 'studio-video' && <VideoStudio />}
                {activeTab === 'studio-music' && <MusicStudio />}
                {activeTab === 'creations' && <CreationsView />}
                {activeTab === 'subscription' && <SubscriptionView />}
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'admin' && (canOpenAdmin ? <AdminView /> : <ProfileView />)}
                {activeTab === 'help' && <HelpView />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <MobileNav />
      <NotificationToast />
      <MediaViewerModal media={activeMediaModal} onClose={() => setActiveMediaModal(null)} />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
