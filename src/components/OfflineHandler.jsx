import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineHandler = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#0B0B0B] flex flex-col items-center justify-center p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 sm:w-32 sm:h-32 bg-[#1A1A1A]/50 rounded-full flex items-center justify-center mb-8 border border-[#D4AF37]/10 relative"
          >
            {/* Pulse effect */}
            <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-[pulse_2s_ease-out_infinite] opacity-50" />
            <WifiOff className="w-12 h-12 sm:w-16 sm:h-16 text-[#666]" />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-3 bg-gradient-to-br from-[#D4AF37] via-[#F2D06B] to-[#D4AF37] bg-clip-text text-transparent"
          >
            Connexion perdue
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#888] text-base mb-10 max-w-[300px] leading-relaxed"
          >
            Impossible de se connecter au serveur.
            <br />
            Vérifiez votre connexion internet.
          </motion.p>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={handleRetry}
            className="bg-gradient-to-br from-[#D4AF37] to-[#B4941F] text-black font-semibold text-base py-4 px-12 rounded-xl shadow-[0_4px_12px_rgba(212,175,55,0.2)] active:scale-95 transition-transform flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            Réessayer
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="fixed bottom-8 flex items-center gap-2 bg-[#1A1A1A] border border-[#333] px-4 py-2 rounded-full"
          >
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-[#666]">Mode hors ligne</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineHandler;