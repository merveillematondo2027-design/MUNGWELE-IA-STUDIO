import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShellHeader } from './components/layout/AppShellHeader';
import { ImageStudio } from './components/studios/ImageStudio';
import { VideoStudio } from './components/studios/VideoStudio';
import { ClipStudio } from './components/studios/ClipStudio';
import { MusicStudio } from './components/studios/MusicStudio';
import { HomeView } from './components/views/HomeView';
import { ProjectsHubView } from './components/views/ProjectsHubView';
import { CommunityView } from './components/views/CommunityView';
import { CreationsView } from './components/views/CreationsView';
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
import { auth } from './lib/firebase';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import officialLogo from './assets/mungwele-ai-official-logo.svg';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type AdminSection = 'home' | 'users' | 'credits' | 'subscriptions' | 'library' | 'logs' | 'usage';

const MainLayout: React.FC = () => {
  const { activeTab, activeMediaModal, setActiveMediaModal, appSettings, user, setUser, resetUser, addNotification } = useApp();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeToFirebaseUser(
      (profile) => {
        if (!mounted) return;
        if (profile) { setUser(profile); setAuthStatus('authenticated'); }
        else { resetUser(); setAuthStatus('unauthenticated'); }
      },
      (error) => {
        if (!mounted) return;
        console.warn('Firebase profile/session sync warning:', error);
        if (auth.currentUser) {
          setAuthStatus('authenticated');
          addNotification('warning', 'Profil à synchroniser', 'Votre connexion Firebase est active, mais certaines données Firestore doivent encore être synchronisées.');
        } else { resetUser(); setAuthStatus('unauthenticated'); }
      },
    );
    return () => { mounted = false; unsubscribe(); };
  }, []);

  if (authStatus === 'loading') return <div className="min-h-screen bg-[#050b18] text-white flex flex-col items-center justify-center gap-4 px-6 text-center"><img src={officialLogo} alt="MUNGWELE AI STUDIO" className="h-28 w-60 object-contain drop-shadow-2xl"/><Loader2 className="w-5 h-5 animate-spin text-purple-400"/><p className="text-sm text-gray-400">Vérification de votre session sécurisée…</p></div>;
  if (authStatus === 'unauthenticated') return <div className="min-h-screen bg-[#050b18]"><AuthModal required/><NotificationToast/></div>;

  const isStudioTab = activeTab === 'studio-image' || activeTab === 'studio-video' || activeTab === 'studio-clips' || activeTab === 'studio-music';
  const canOpenAdmin = user.role === 'admin' && Boolean(user.id);
  const renderAdmin = (section: AdminSection) => canOpenAdmin ? <AdminWorkspaceView section={section}/> : <ProfileView/>;

  return <div className="relative min-h-screen bg-[#07101f] text-gray-100 antialiased selection:bg-purple-600 selection:text-white overflow-x-hidden">
    <div className="fixed inset-0 pointer-events-none overflow-hidden"><div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-purple-600/10 blur-[150px]"/><div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[160px]"/><div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] rounded-full bg-pink-600/8 blur-[150px]"/></div>
    {appSettings.maintenanceMode&&<div className="relative z-50 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-950/70 px-4 py-2 text-center text-xs font-semibold text-amber-200"><AlertTriangle className="h-4 w-4 text-amber-400"/><span>Le studio est actuellement en maintenance programmée.</span></div>}
    <div className="relative z-10 min-h-screen"><AppShellHeader studioMode={isStudioTab}/><main className={isStudioTab?'mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8':'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}}>
      {activeTab==='home'&&<HomeView/>}
      {activeTab==='community'&&<CommunityView/>}
      {activeTab==='notifications'&&<NotificationsView/>}
      {activeTab==='messages'&&<MessagesView/>}
      {activeTab==='projects-image'&&<ProjectsHubView type="image"/>}
      {activeTab==='projects-video'&&<ProjectsHubView type="video"/>}
      {activeTab==='projects-clips'&&<ProjectsHubView type="clips"/>}
      {activeTab==='projects-music'&&<ProjectsHubView type="music"/>}
      {activeTab==='studio-image'&&<ImageStudio/>}
      {activeTab==='studio-video'&&<VideoStudio/>}
      {activeTab==='studio-clips'&&<ClipStudio/>}
      {activeTab==='studio-music'&&<MusicStudio/>}
      {activeTab==='creations'&&<CreationsView/>}
      {activeTab==='subscription'&&<SubscriptionView/>}
      {activeTab==='profile'&&<ProfileView/>}
      {activeTab==='admin'&&(canOpenAdmin?<AdminView/>:<ProfileView/>)}
      {activeTab==='admin-home'&&renderAdmin('home')}{activeTab==='admin-users'&&renderAdmin('users')}{activeTab==='admin-credits'&&renderAdmin('credits')}{activeTab==='admin-subscriptions'&&renderAdmin('subscriptions')}{activeTab==='admin-library'&&renderAdmin('library')}{activeTab==='admin-logs'&&renderAdmin('logs')}{activeTab==='admin-usage'&&renderAdmin('usage')}
      {activeTab==='help'&&<HelpView/>}
    </motion.div></AnimatePresence></main></div>
    <NotificationToast/><MediaViewerModal media={activeMediaModal} onClose={()=>setActiveMediaModal(null)}/><AuthModal/>
  </div>;
};

export default function App(){ return <AppProvider><MainLayout/></AppProvider>; }
