import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShellHeader } from './components/layout/AppShellHeader';
import { HomeView } from './components/views/HomeView';
import { NotificationToast } from './components/common/NotificationToast';
import { InstallAppButton } from './components/common/InstallAppButton';
import { subscribeToFirebaseUser } from './services/authService';
import { AlertTriangle } from 'lucide-react';

const ImageStudio = lazy(() => import('./components/studios/ImageStudio').then((m) => ({ default: m.ImageStudio })));
const VideoStudio = lazy(() => import('./components/studios/VideoStudio').then((m) => ({ default: m.VideoStudio })));
const ClipStudio = lazy(() => import('./components/studios/ClipStudio').then((m) => ({ default: m.ClipStudio })));
const MusicStudio = lazy(() => import('./components/studios/MusicStudio').then((m) => ({ default: m.MusicStudio })));
const CommunityView = lazy(() => import('./components/views/CommunityView').then((m) => ({ default: m.CommunityView })));
const MDigiView = lazy(() => import('./components/views/MDigiView').then((m) => ({ default: m.MDigiView })));
const LibraryView = lazy(() => import('./components/views/LibraryView').then((m) => ({ default: m.LibraryView })));
const GalleryView = lazy(() => import('./components/views/GalleryView').then((m) => ({ default: m.GalleryView })));
const SubscriptionView = lazy(() => import('./components/views/SubscriptionView').then((m) => ({ default: m.SubscriptionView })));
const ProfileView = lazy(() => import('./components/views/ProfileView').then((m) => ({ default: m.ProfileView })));
const NotificationsView = lazy(() => import('./components/views/NotificationsView').then((m) => ({ default: m.NotificationsView })));
const MessagesView = lazy(() => import('./components/views/MessagesView').then((m) => ({ default: m.MessagesView })));
const AdminView = lazy(() => import('./components/views/AdminView').then((m) => ({ default: m.AdminView })));
const AdminWorkspaceView = lazy(() => import('./components/views/AdminWorkspaceView').then((m) => ({ default: m.AdminWorkspaceView })));
const HelpView = lazy(() => import('./components/views/HelpView').then((m) => ({ default: m.HelpView })));
const MediaViewerModal = lazy(() => import('./components/common/MediaViewerModal').then((m) => ({ default: m.MediaViewerModal })));
const MobileMoneyCheckoutLauncher = lazy(() => import('./components/common/MobileMoneyCheckoutLauncher').then((m) => ({ default: m.MobileMoneyCheckoutLauncher })));
const AuthModal = lazy(() => import('./components/views/AuthModal').then((m) => ({ default: m.AuthModal })));

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type AdminSection = 'home' | 'users' | 'credits' | 'subscriptions' | 'library' | 'logs' | 'usage';
const ADMIN_UNLIMITED_CREDITS = Number.MAX_SAFE_INTEGER;

const PROTECTED_TABS = new Set([
  'notifications','messages','projects-image','projects-video','projects-clips','projects-music',
  'studio-image','studio-video','studio-clips','studio-music','creations','subscription','profile',
  'admin','admin-home','admin-users','admin-credits','admin-subscriptions','admin-library','admin-logs','admin-usage',
]);

const RouteFallback = () => (
  <div className="flex min-h-[180px] items-center justify-center">
    <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-300" />
      Ouverture…
    </div>
  </div>
);

const MainLayout: React.FC = () => {
  const {
    activeTab,
    activeMediaModal,
    setActiveMediaModal,
    appSettings,
    user,
    setUser,
    resetUser,
    addNotification,
    setAuthMode,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useApp();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeToFirebaseUser(
      (profile) => {
        if (!mounted) return;
        if (profile) {
          const effectiveProfile = profile.role === 'admin'
            ? { ...profile, credits: ADMIN_UNLIMITED_CREDITS, plan: 'studio' as const }
            : profile;
          setUser(effectiveProfile);
          setAuthStatus('authenticated');
          if (effectiveProfile.role === 'admin') {
            void import('./services/mdigiService')
              .then(({ ensureOfficialMDigiAccount }) => ensureOfficialMDigiAccount(effectiveProfile))
              .catch((error) => console.warn('Official M.Digi bootstrap warning:', error));
          }
        } else {
          resetUser();
          setAuthStatus('unauthenticated');
        }
      },
      (error) => {
        if (!mounted) return;
        console.warn('Firebase profile/session sync warning:', error);
        resetUser();
        setAuthStatus('unauthenticated');
        addNotification('error', 'Profil indisponible', 'La session n’est pas ouverte tant que le profil Firestore réel n’est pas disponible. Reconnectez-vous après vérification de Firebase.');
      },
    );
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const signedIn = authStatus === 'authenticated' && Boolean(user.id);
  const requestLogin = () => { setAuthMode('login'); setIsAuthModalOpen(true); };
  const needsLogin = !signedIn && PROTECTED_TABS.has(activeTab);
  const isStudioTab = activeTab === 'studio-image' || activeTab === 'studio-video' || activeTab === 'studio-clips' || activeTab === 'studio-music';
  const canOpenAdmin = signedIn && user.role === 'admin';
  const renderAdmin = (section: AdminSection) => canOpenAdmin ? <AdminWorkspaceView section={section}/> : <HomeView/>;

  useEffect(() => { if (authStatus !== 'loading' && needsLogin) requestLogin(); }, [authStatus, activeTab, needsLogin]);

  return <div className="relative min-h-screen overflow-x-hidden bg-[#07101f] text-gray-100 antialiased selection:bg-purple-600 selection:text-white">
    <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-purple-600/10 blur-[150px]"/><div className="absolute -right-40 top-1/3 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[160px]"/><div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] rounded-full bg-pink-600/8 blur-[150px]"/></div>
    {appSettings.maintenanceMode&&<div className="relative z-50 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-950/70 px-4 py-2 text-center text-xs font-semibold text-amber-200"><AlertTriangle className="h-4 w-4 text-amber-400"/><span>Le studio est actuellement en maintenance programmée.</span></div>}
    <div className="relative z-10 min-h-screen"><AppShellHeader studioMode={signedIn && isStudioTab}/><main className={signedIn&&isStudioTab?'mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8':'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}><div key={needsLogin?'guest-home':activeTab}>
      <Suspense fallback={<RouteFallback/>}>
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
        {!needsLogin&&activeTab==='subscription'&&<><SubscriptionView/><MobileMoneyCheckoutLauncher/></>}
        {!needsLogin&&activeTab==='profile'&&<ProfileView/>}
        {!needsLogin&&activeTab==='admin'&&(canOpenAdmin?<AdminView/>:<HomeView/>)}
        {!needsLogin&&activeTab==='admin-home'&&renderAdmin('home')}{!needsLogin&&activeTab==='admin-users'&&renderAdmin('users')}{!needsLogin&&activeTab==='admin-credits'&&renderAdmin('credits')}{!needsLogin&&activeTab==='admin-subscriptions'&&renderAdmin('subscriptions')}{!needsLogin&&activeTab==='admin-library'&&renderAdmin('library')}{!needsLogin&&activeTab==='admin-logs'&&renderAdmin('logs')}{!needsLogin&&activeTab==='admin-usage'&&renderAdmin('usage')}
        {!needsLogin&&activeTab==='help'&&<HelpView/>}
      </Suspense>
    </div></main></div>
    <InstallAppButton/><NotificationToast/>
    {activeMediaModal&&<Suspense fallback={null}><MediaViewerModal media={activeMediaModal} onClose={()=>setActiveMediaModal(null)}/></Suspense>}
    {isAuthModalOpen&&<Suspense fallback={null}><AuthModal/></Suspense>}
  </div>;
};

export default function App(){ return <AppProvider><MainLayout/></AppProvider>; }
