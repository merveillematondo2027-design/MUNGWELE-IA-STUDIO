import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationToast: React.FC = () => {
  const { notifications, dismissNotification } = useApp();

  return (
    <div 
      id="notification-container"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {notifications.map((notif) => {
          const isSuccess = notif.type === 'success';
          const isError = notif.type === 'error';
          const isWarning = notif.type === 'warning';

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              id={`toast-${notif.id}`}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-xl flex items-start space-x-3 transition-all ${
                isSuccess
                  ? 'bg-[#0f2438]/90 border-emerald-500/30 text-emerald-100 shadow-emerald-950/40'
                  : isError
                  ? 'bg-[#2a1320]/90 border-rose-500/30 text-rose-100 shadow-rose-950/40'
                  : isWarning
                  ? 'bg-[#2a2212]/90 border-amber-500/30 text-amber-100 shadow-amber-950/40'
                  : 'bg-[#151c33]/90 border-purple-500/30 text-purple-100 shadow-purple-950/40'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-purple-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-tight text-white mb-0.5">
                  {notif.title}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed break-words">
                  {notif.message}
                </p>
              </div>

              <button
                id={`toast-close-${notif.id}`}
                onClick={() => dismissNotification(notif.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Fermer la notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
