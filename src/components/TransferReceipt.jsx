import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Download, Share2, Info } from 'lucide-react';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';
import { Button } from '@/components/ui/button';
import { getTransferCode } from '@/lib/codeUtils';
import { formatDateTimeLongLocal } from '@/lib/dateUtils';

const TransferReceipt = ({ transferData, onClose, onDownload }) => {
  const receiptRef = useRef(null);

  if (!transferData) return null;

  const displayCode = getTransferCode(transferData);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reçu de Transfert - ${displayCode}`,
          text: `Transfert de ${formatMoneyDOP(transferData.amount_dop)} vers ${transferData.beneficiary_name} a été initié. Code: ${displayCode}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md my-auto overflow-hidden rounded-2xl bg-[#1E1E1E] shadow-2xl border border-[#2A2A2A] max-h-[95vh] sm:max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Golden Gradient */}
          <div className="relative bg-gradient-to-r from-[#D4AF37] to-[#B8941F] p-4 sm:p-6 text-center text-black flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute right-2 top-2 sm:right-4 sm:top-4 rounded-full bg-black/10 p-2 hover:bg-black/20 transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
            </button>
            <div className="mx-auto mb-2 sm:mb-3 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner">
              <Check className="h-6 w-6 sm:h-8 sm:w-8 text-black" strokeWidth={3} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Transfert Réussi !</h2>
            <p className="mt-1 text-xs sm:text-sm font-medium opacity-80">Votre transaction est en cours de traitement</p>
          </div>

          {/* Receipt Content - SCROLLABLE */}
          <div ref={receiptRef} className="bg-[#1E1E1E] p-4 sm:p-6 text-white overflow-y-auto flex-1">
            
            {/* Transaction ID */}
            <div className="mb-4 sm:mb-6 text-center">
              <p className="text-xs uppercase tracking-wider text-[#A0A0A0]">N° Transaction</p>
              <p className="mt-1 font-mono text-base sm:text-lg font-bold tracking-widest text-white select-all">
                {displayCode}
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Beneficiary Info */}
              <div className="rounded-xl bg-[#0B0B0B] p-3 sm:p-4 border border-[#2A2A2A]">
                <div className="flex items-start gap-2 sm:gap-3">
                   <div className="mt-1 h-2 w-2 rounded-full bg-[#D4AF37] flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#A0A0A0] uppercase">Bénéficiaire</p>
                      <p className="font-semibold text-white text-base sm:text-lg truncate">{transferData.beneficiary_name}</p>
                      <div className="mt-1 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm text-[#A0A0A0]">
                         <span className="truncate">{transferData.beneficiary_phone}</span>
                         <span className="font-medium text-[#D4AF37]">{transferData.operator}</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Amount Details */}
              <div className="space-y-2 sm:space-y-3 px-1 sm:px-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[#A0A0A0]">Montant envoyé</span>
                  <span className="font-mono text-white">{formatMoneyDOP(transferData.amount_dop)}</span>
                </div>
                {transferData.fees > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-[#A0A0A0]">Frais</span>
                    <span className="font-mono text-red-400">-{formatMoneyDOP(transferData.fees)}</span>
                  </div>
                )}
                <div className="my-2 border-t border-[#2A2A2A]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-[#A0A0A0]">Montant Net (DOP)</span>
                  <span className="font-mono font-bold text-white text-base sm:text-lg">{formatMoneyDOP(transferData.net_amount_dop)}</span>
                </div>
              </div>

              {/* Total HTG Highlight */}
              <div className="mt-4 sm:mt-6 rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#B8941F]/10 border border-[#D4AF37]/30 p-3 sm:p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Info className="h-8 w-8 sm:h-12 sm:w-12 text-[#D4AF37]" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#D4AF37] mb-1">Total à payer / Débité</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#D4AF37] font-mono tracking-tight">
                  {formatMoneyHTG(transferData.total_htg)}
                </p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center mt-4 sm:mt-6 text-xs sm:text-sm">
                <div>
                   <p className="text-[#A0A0A0] text-xs uppercase mb-1">Date</p>
                   <p className="text-white font-medium text-xs sm:text-sm">{formatDateTimeLongLocal(transferData.created_at)}</p>
                </div>
                <div>
                   <p className="text-[#A0A0A0] text-xs uppercase mb-1">Statut</p>                   <span className="inline-flex items-center rounded-full bg-yellow-400/10 px-2 sm:px-3 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-400/20">
                     En attente
                   </span>
                </div>
              </div>

              {/* Notes */}
              {transferData.notes && (
                <div className="mt-3 sm:mt-4 rounded-lg bg-[#2A2A2A]/50 p-2 sm:p-3 text-xs sm:text-sm text-[#A0A0A0] italic text-center">
                  "{transferData.notes}"
                </div>
              )}
            </div>

            <div className="mt-6 sm:mt-8 border-t border-[#2A2A2A] pt-3 sm:pt-4 text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#555]">Transfert effectué via notre plateforme sécurisée</p>
            </div>
          </div>

          {/* Footer Actions - FIXED AT BOTTOM */}
          <div className="bg-[#0B0B0B] p-3 sm:p-4 flex gap-2 sm:gap-3 flex-shrink-0 border-t border-[#2A2A2A]">
            <Button
              onClick={onDownload}
              variant="outline"
              className="flex-1 border-[#2A2A2A] bg-[#1E1E1E] text-white hover:bg-[#2A2A2A] h-10 sm:h-11 text-xs sm:text-sm"
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Télécharger
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B8941F] h-10 sm:h-11 text-xs sm:text-sm"
            >
              <Share2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Partager
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TransferReceipt;