import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Image, Film, Music, Library, CreditCard, 
  Settings, LogOut, ShieldAlert, History, User 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({ isOpen, onClose }) => {
  const { user, setActiveTab, resetUser, addNotification } = useApp();

  const handleNav = (tab: any) => {
    setActiveTab(tab);
    onClose();
  };

  const handleLogout = () => {
    resetUser();
    onClose();
    addNotification('info', 'Déconnexion', 'Vous êtes déconnecté.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-xs sm:max-w-sm bg-[#0a0a14] border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <img src="/src/assets/logo-compact.svg" alt="MUNGWELE" className="w-6 h-6" />
                MUNGWELE IA
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Mon Espace</p>
                <button onClick={() => handleNav('creations')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  <Library className="w-4 h-4 text-pink-400" /> Ma Galerie
                </button>
                <button onClick={() => handleNav('profile')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  <User className="w-4 h-4 text-blue-400" /> Profil & Paramètres
                </button>
              </div>

              <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Crédits & Abonnement</p>
                <button onClick={() => handleNav('subscription')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  <CreditCard className="w-4 h-4 text-emerald-400" /> Gérer mon abonnement
                </button>
                <button onClick={() => handleNav('subscription')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  <History className="w-4 h-4 text-amber-400" /> Historique crédits
                </button>
              </div>

              {user.role === 'admin' && (
                <div className="space-y-1">
                  <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-2">Administration</p>
                  <button onClick={() => handleNav('admin')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> Supervision générale
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 transition-colors text-sm font-bold">
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
