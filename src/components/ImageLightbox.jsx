import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ImageLightbox = ({ imageUrl, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-50"
          title={t("common.close")}
        >
          <X size={32} />
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
           <img
            src={imageUrl}
            alt={t("common.proof")}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          
          <a 
            href={imageUrl} 
            download="proof-image" 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-md transition-colors"
            onClick={(e) => e.stopPropagation()}
            title={t("common.download")}
          >
            <Download size={20} />
          </a>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageLightbox;