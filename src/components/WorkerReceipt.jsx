import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Download, Share2, Info, User, ShieldCheck } from 'lucide-react';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';
import { Button } from '@/components/ui/button';
import { getTransferCode } from '@/lib/codeUtils';
import { formatDateTimeLongLocal } from '@/lib/dateUtils';

const WorkerReceipt = ({ transferData, onClose, onDownload }) => {
  const receiptRef = useRef(null);

  if (!transferData) return null;

  const displayCode = getTransferCode(transferData);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reçu de Validation - ${displayCode}`,
          text: `Transfert ${displayCode} validé avec succès pour ${transferData.beneficiary_name}.`,
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
          className="relative w-full max-w-md my-auto overflow-hidden rounded-2xl bg-[#1E1E1E] shadow-2xl border border-[#22c55e]/30 max-h-[95vh] sm:max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Green Gradient */}
          <div className="relative bg-gradient-to-r from-[#15803d] to-[#22c55e] p-4 sm:p-6 text-center text-white flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute right-2 top-2 sm:right-4 sm:top-4 rounded-full bg-black/20 p-2 hover:bg-black/30 transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </button>
            <div className="mx-auto mb-2 sm:mb-3 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner border border-white/30">
              <Check className="h-6 w-6 sm:h-8 sm:w-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">VALIDATION RÉUSSIE</h2>
            <p className="mt-1 text-xs sm:text-sm font-medium opacity-90">Transaction traitée et validée</p>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="bg-[#1E1E1E] p-4 sm:p-6 text-white overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            
            {/* Transaction ID */}
            <div className="mb-4 sm:mb-6 text-center">
              <p className="text-xs uppercase tracking-wider text-[#A0A0A0]">Code Transaction</p>
              <p className="mt-1 font-mono text-xl sm:text-2xl font-bold tracking-widest text-[#22c55e] select-all">
                {displayCode}
              </p>
            </div>

            <div className="space-y-4">
              {/* Beneficiary Info */}
              <div className="rounded-xl bg-[#0B0B0B] p-3 sm:p-4 border border-[#2A2A2A]">
                <div className="flex items-start gap-3">
                   <div className="mt-1 p-2 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex-shrink-0">
                      <User className="h-4 w-4 text-[#D4AF37]" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#A0A0A0] uppercase">Bénéficiaire</p>
                      <p className="font-bold text-[#D4AF37] text-lg truncate">{transferData.beneficiary_name}</p>
                      <div className="mt-1 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                         <span className="text-white font-mono tracking-wide">{transferData.beneficiary_phone}</span>
                         <span className="font-medium text-[#A0A0A0] bg-[#1E1E1E] px-2 py-0.5 rounded border border-[#333] w-fit">{transferData.operator}</span>
                      </div>
                   </div>
                </div>
              </div>

               {/* Validator Info */}
               {transferData.worker_name && (
                <div className="rounded-xl bg-[#22c55e]/5 p-3 sm:p-4 border border-[#22c55e]/30 flex items-center gap-3">
                   <div className="p-2 rounded-full bg-[#22c55e]/20 flex-shrink-0">
                      <ShieldCheck className="h-4 w-4 text-[#22c55e]" />
                   </div>
                   <div>
                      <p className="text-xs text-[#22c55e] uppercase font-bold">Validé par</p>
                      <p className="font-medium text-white text-sm">{transferData.worker_name}</p>
                   </div>
                </div>
               )}

              {/* Amount Details */}
              <div className="space-y-3 px-1 sm:px-2 pt-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[#A0A0A0]">Montant Brut</span>
                  <span className="font-mono text-white">{formatMoneyDOP(transferData.amount_dop)}</span>
                </div>
                {transferData.fees > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-[#A0A0A0]">Frais</span>
                    <span className="font-mono text-red-400">-{formatMoneyDOP(transferData.fees)}</span>
                  </div>
                )}
                <div className="border-t border-[#2A2A2A]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-[#A0A0A0]">Net en DOP</span>
                  <span className="font-mono font-bold text-white">{formatMoneyDOP(transferData.net_amount_dop)}</span>
                </div>
              </div>

              {/* Total HTG Highlight */}
              <div className="mt-4 rounded-xl bg-gradient-to-br from-[#22c55e]/10 to-[#15803d]/10 border border-[#22c55e]/40 p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Info className="h-12 w-12 text-[#22c55e]" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#22c55e] mb-1 uppercase tracking-wider">Montant Final (HTG)</p>
                <p className="text-3xl font-bold text-white font-mono tracking-tight drop-shadow-sm">
                  {formatMoneyHTG(transferData.total_htg)}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 bg-[#0B0B0B] p-3 rounded-lg border border-[#2A2A2A]">
                <div className="text-center">
                   <p className="text-[#555] text-[10px] uppercase mb-1">Créé le</p>
                   <p className="text-[#AAA] font-medium text-xs">{formatDateTimeLongLocal(transferData.created_at)}</p>
                </div>
                <div className="text-center border-l border-[#2A2A2A]">
                   <p className="text-[#555] text-[10px] uppercase mb-1">Validé le</p>
                   <p className="text-[#AAA] font-medium text-xs">{formatDateTimeLongLocal(transferData.validated_at || transferData.updated_at)}</p>
                </div>
              </div>

              {/* Notes */}
              {transferData.notes && (
                <div className="mt-4 rounded-lg bg-[#2A2A2A]/30 p-3 border border-[#2A2A2A] border-dashed">
                  <p className="text-[10px] uppercase text-[#555] mb-1">Notes</p>
                  <p className="text-xs sm:text-sm text-[#CCC] italic">
                    "{transferData.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-[#2A2A2A] pt-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-[#444]">Document généré électroniquement par VS XPRESS</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-[#0B0B0B] p-4 flex gap-3 flex-shrink-0 border-t border-[#2A2A2A]">
            <Button
              onClick={onDownload}
              variant="outline"
              className="flex-1 border-[#2A2A2A] bg-[#1E1E1E] text-white hover:bg-[#2A2A2A] hover:text-[#22c55e] hover:border-[#22c55e]/50 transition-all h-11"
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 bg-[#22c55e] text-black hover:bg-[#16a34a] font-bold h-11"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Partager
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkerReceipt;