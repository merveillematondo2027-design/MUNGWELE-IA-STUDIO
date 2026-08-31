import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShellHeader } from './components/layout/AppShellHeader';
import { ImageStudio } from './components/studios/ImageStudio';
import { VideoStudio } from './components/studios/VideoStudio';
import { ClipStudio } from './components/studios/ClipStudio';
import { MusicStudio } from './components/studios/MusicStudio';
import { HomeView } from './components/views/HomeView';
import { CommunityView } from './components/views/CommunityView';
import { MDigiView } from './components/views/MDigiView';
import { LibraryView } from './components/views/LibraryView';
import { GalleryView } from './components/views/GalleryView';
import { SubscriptionView } from './components/views/SubscriptionView';
import { ProfileView } from './components/views/ProfileView';
import { NotificationsView } from './components/views/NotificationsView';
import { MessagesView } from './components/views/MessagesView';
import { AdminView } from './components/views/AdminView';
import { AdminWorkspaceView } from './components/views/AdminWorkspaceView';
import { HelpView } from './components/views/HelpView';
import { NotificationToast } from './components/common/NotificationToast';
import { MediaViewerModal } from './components/common/MediaViewerModal';
import { AuthModal } from './components/views/AuthModal';
import { subscribeToFirebaseUser } from './services/authService';
import { ensureOfficialMDigiAccount } from './services/mdigiService';
import { auth } from './lib/firebase';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type AdminSection = 'home' | 'users' | 'credits' | 'subscriptions' | 'library' | 'logs' | 'usage';
const ADMIN_UNLIMITED_CREDITS = Number.MAX_SAFE_INTEGER;

const MainLayout: React.FC = () => {
  const { activeTab, activeMediaModal, setActiveMediaModal, appSettings, user, setUser, resetUser, addNotification, setAuthMode, setIsAuthModalOpen } = useApp();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeToFirebaseUser(
      (profile) => {
        if (!mounted) return;
        if (profile) {
          const effectiveProfile = profile.role === 'admin' ? { ...profile, credits: ADMIN_UNLIMITED_CREDITS, plan: 'studio' as const } : profile;
          setUser(effectiveProfile);
          setAuthStatus('authenticated');
          if (effectiveProfile.role === 'admin') void ensureOfficialMDigiAccount(effectiveProfile).catch((error) => console.warn('Official M.Digi bootstrap warning:', error));
        } else { resetUser(); setAuthStatus('unauthenticated'); }
      },
      (error) => {
        if (!mounted) return;
        console.warn('Firebase profile/session sync warning:', error);
        if (auth.currentUser) { setAuthStatus('authenticated'); addNotification('warning', 'Profil à synchroniser', 'Votre connexion Firebase est active, mais certaines données Firestore doivent encore être synchronisées.'); }
        else { resetUser(); setAuthStatus('unauthenticated'); }
      },
    );
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const signedIn = authStatus === 'authenticated' && Boolean(user.id);
  const requestLogin = () => { setAuthMode('login'); setIsAuthModalOpen(true); };
  const protectedTabs = new Set(['notifications','messages','projects-image','projects-video','projects-clips','projects-music','studio-image','studio-video','studio-clips','studio-music','creations','profile','admin','admin-home','admin-users','admin-credits','admin-subscriptions','admin-library','admin-logs','admin-usage']);
  const needsLogin = !signedIn && protectedTabs.has(activeTab);
  const isStudioTab = activeTab === 'studio-image' || activeTab === 'studio-video' || activeTab === 'studio-clips' || activeTab === 'studio-music';
  const canOpenAdmin = signedIn && user.role === 'admin';
  const renderAdmin = (section: AdminSection) => canOpenAdmin ? <AdminWorkspaceView section={section}/> : <HomeView/>;

  useEffect(() => { if (authStatus !== 'loading' && needsLogin) requestLogin(); }, [authStatus, activeTab, needsLogin]);

  return <div className="relative min-h-screen overflow-x-hidden bg-[#07101f] text-gray-100 antialiased selection:bg-purple-600 selection:text-white">
    <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-purple-600/10 blur-[150px]"/><div className="absolute -right-40 top-1/3 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[160px]"/><div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] rounded-full bg-pink-600/8 blur-[150px]"/></div>
    {appSettings.maintenanceMode&&<div className="relative z-50 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-950/70 px-4 py-2 text-center text-xs font-semibold text-amber-200"><AlertTriangle className="h-4 w-4 text-amber-400"/><span>Le studio est actuellement en maintenance programmée.</span></div>}
    <div className="relative z-10 min-h-screen"><AppShellHeader studioMode={signedIn && isStudioTab}/><main className={signedIn&&isStudioTab?'mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8':'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}><AnimatePresence mode="wait"><motion.div key={needsLogin?'guest-home':activeTab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}}>
      {(activeTab==='home'||needsLogin)&&<HomeView/>}
      {!needsLogin&&activeTab==='community'&&<CommunityView/>}
      {!needsLogin&&activeTab==='mdigi'&&<MDigiView/>}
      {!needsLogin&&activeTab==='notifications'&&<NotificationsView/>}
      {!needsLogin&&activeTab==='messages'&&<MessagesView/>}
      {!needsLogin&&activeTab==='projects-image'&&<GalleryView/>}
      {!needsLogin&&activeTab==='projects-video'&&<GalleryView/>}
      {!needsLogin&&activeTab==='projects-clips'&&<GalleryView/>}
      {!needsLogin&&activeTab==='projects-music'&&<GalleryView/>}
      {!needsLogin&&activeTab==='studio-image'&&<ImageStudio/>}
      {!needsLogin&&activeTab==='studio-video'&&<VideoStudio/>}
      {!needsLogin&&activeTab==='studio-clips'&&<ClipStudio/>}
      {!needsLogin&&activeTab==='studio-music'&&<MusicStudio/>}
      {!needsLogin&&activeTab==='creations'&&<LibraryView/>}
      {!needsLogin&&activeTab==='subscription'&&<SubscriptionView/>}
      {!needsLogin&&activeTab==='profile'&&<ProfileView/>}
      {!needsLogin&&activeTab==='admin'&&(canOpenAdmin?<AdminView/>:<HomeView/>)}
      {!needsLogin&&activeTab==='admin-home'&&renderAdmin('home')}{!needsLogin&&activeTab==='admin-users'&&renderAdmin('users')}{!needsLogin&&activeTab==='admin-credits'&&renderAdmin('credits')}{!needsLogin&&activeTab==='admin-subscriptions'&&renderAdmin('subscriptions')}{!needsLogin&&activeTab==='admin-library'&&renderAdmin('library')}{!needsLogin&&activeTab==='admin-logs'&&renderAdmin('logs')}{!needsLogin&&activeTab==='admin-usage'&&renderAdmin('usage')}
      {!needsLogin&&activeTab==='help'&&<HelpView/>}
    </motion.div></AnimatePresence></main></div>
    <NotificationToast/><MediaViewerModal media={activeMediaModal} onClose={()=>setActiveMediaModal(null)}/><AuthModal/>
  </div>;
};

export default function App(){ return <AppProvider><MainLayout/></AppProvider>; }
