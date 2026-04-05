import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Download, Info, User, ShieldCheck, FileText, Calendar, Hash } from 'lucide-react';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';
import { Button } from '@/components/ui/button';
import { getTransferCode } from '@/lib/codeUtils';
import { formatDateTimeLongLocal } from '@/lib/dateUtils';

const AdminTransferReceipt = ({ transferData, onClose, onDownload }) => {
  const receiptRef = useRef(null);

  if (!transferData) return null;

  const displayCode = getTransferCode(transferData);

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
          className="relative w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-[#1E1E1E] shadow-2xl border border-[#D4AF37]/30 max-h-[95vh] sm:max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Gold Gradient */}
          <div className="relative bg-gradient-to-r from-[#D4AF37] to-[#B8941F] p-4 sm:p-5 text-center text-black flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute right-2 top-2 sm:right-4 sm:top-4 rounded-full bg-black/10 p-2 hover:bg-black/20 transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
            </button>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/10 backdrop-blur-sm shadow-inner border border-black/10">
              <FileText className="h-5 w-5 text-black" />
            </div>
            <h2 className="text-xl font-bold tracking-tight uppercase">Détails de Transaction</h2>
            <div className="mt-2 inline-flex items-center justify-center gap-2 bg-black/10 px-3 py-1 rounded-full border border-black/10">
               <Hash className="h-3 w-3 opacity-60" />
               <span className="font-mono font-bold text-sm tracking-wider">{displayCode}</span>
            </div>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="bg-[#1E1E1E] p-5 text-white overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            
            <div className="space-y-4">
               {/* Status Badge */}
               <div className="text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                     transferData.status === 'approved' || transferData.status === 'validated'
                     ? 'bg-green-500/10 text-green-500 border-green-500/30' 
                     : transferData.status === 'rejected' 
                     ? 'bg-red-500/10 text-red-500 border-red-500/30'
                     : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                  }`}>
                     {transferData.status}
                  </span>
               </div>

              {/* Beneficiary Info */}
              <div className="rounded-xl bg-[#0B0B0B] p-4 border border-[#2A2A2A]">
                 <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-2">Bénéficiaire</p>
                 <div className="flex justify-between items-start">
                    <div>
                       <p className="font-bold text-white text-lg">{transferData.beneficiary_name}</p>
                       <p className="text-sm text-[#A0A0A0] font-mono mt-1">{transferData.beneficiary_phone}</p>
                    </div>
                    <div className="text-right">
                       <span className="bg-[#2A2A2A] text-[#D4AF37] px-2 py-1 rounded text-xs font-bold border border-[#333]">
                          {transferData.operator}
                       </span>
                    </div>
                 </div>
              </div>

               {/* Agent & Worker Grid */}
               <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#2A2A2A]/20 p-3 border border-[#2A2A2A]">
                     <div className="flex items-center gap-2 mb-2">
                        <User className="h-3 w-3 text-[#A0A0A0]" />
                        <p className="text-xs text-[#A0A0A0] uppercase">Agent</p>
                     </div>
                     <p className="font-medium text-sm text-white truncate">{transferData.agent_name}</p>
                     <p className="text-[10px] text-[#666] truncate">{transferData.agent?.email}</p>
                  </div>
                  <div className="rounded-xl bg-[#2A2A2A]/20 p-3 border border-[#2A2A2A]">
                     <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-3 w-3 text-[#A0A0A0]" />
                        <p className="text-xs text-[#A0A0A0] uppercase">Worker</p>
                     </div>
                     <p className="font-medium text-sm text-white truncate">{transferData.worker_name || 'Non assigné'}</p>
                     <p className="text-[10px] text-[#666] truncate">{transferData.worker?.email}</p>
                  </div>
               </div>

              {/* Amount Details */}
              <div className="space-y-3 px-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0A0A0]">Montant Brut</span>
                  <span className="font-mono text-white">{formatMoneyDOP(transferData.amount_dop)}</span>
                </div>
                {transferData.fees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A0A0A0]">Frais</span>
                    <span className="font-mono text-red-400">-{formatMoneyDOP(transferData.fees)}</span>
                  </div>
                )}
                <div className="border-t border-[#2A2A2A]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#A0A0A0]">Net en DOP</span>
                  <span className="font-mono font-bold text-white">{formatMoneyDOP(transferData.net_amount_dop)}</span>
                </div>
              </div>

              {/* Total HTG Highlight */}
              <div className="mt-4 rounded-xl bg-gradient-to-br from-[#D4AF37]/5 to-[#B8941F]/5 border border-[#D4AF37]/40 p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Info className="h-12 w-12 text-[#D4AF37]" />
                </div>
                <p className="text-xs font-bold text-[#D4AF37] mb-1 uppercase tracking-wider">Montant Final (HTG)</p>
                <p className="text-3xl font-bold text-white font-mono tracking-tight drop-shadow-sm">
                  {formatMoneyHTG(transferData.total_htg)}
                </p>
                <p className="text-[10px] text-[#666] mt-1 font-mono">
                   Taux appliqué: {transferData.exchange_rate_snapshot || transferData.agent?.exchange_rate || 'N/A'}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 bg-[#0B0B0B] p-3 rounded-lg border border-[#2A2A2A]">
                <div className="text-center">
                   <p className="text-[#555] text-[10px] uppercase mb-1 flex justify-center items-center gap-1"><Calendar className="h-3 w-3"/> Créé le</p>
                   <p className="text-[#AAA] font-medium text-xs">{formatDateTimeLongLocal(transferData.created_at)}</p>
                </div>
                <div className="text-center border-l border-[#2A2A2A]">
                   <p className="text-[#555] text-[10px] uppercase mb-1 flex justify-center items-center gap-1"><Check className="h-3 w-3"/> Mis à jour</p>
                   <p className="text-[#AAA] font-medium text-xs">{formatDateTimeLongLocal(transferData.updated_at)}</p>
                </div>
              </div>

              {/* Notes */}
              {transferData.notes && (
                <div className="mt-4 rounded-lg bg-[#2A2A2A]/30 p-3 border border-[#2A2A2A] border-dashed">
                  <p className="text-[10px] uppercase text-[#555] mb-1">Notes Internes</p>
                  <p className="text-xs sm:text-sm text-[#CCC] italic">
                    "{transferData.notes}"
                  </p>
                </div>
              )}

               {/* Proof Link */}
               {transferData.proof_url && (
                  <div className="mt-3 text-center">
                     <a href={transferData.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#D4AF37] hover:underline flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3" /> Voir la preuve de transfert
                     </a>
                  </div>
               )}
            </div>

            <div className="mt-6 border-t border-[#2A2A2A] pt-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-[#444]">Rapport Administratif - VS XPRESS</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-[#0B0B0B] p-4 flex gap-3 flex-shrink-0 border-t border-[#2A2A2A]">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-[#2A2A2A] bg-[#1E1E1E] text-white hover:bg-[#2A2A2A] hover:text-white transition-all h-11"
            >
              Fermer
            </Button>
            <Button
              onClick={onDownload}
              className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B8941F] font-bold h-11"
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminTransferReceipt;