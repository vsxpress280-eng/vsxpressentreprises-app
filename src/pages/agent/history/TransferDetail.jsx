// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, User, Phone, Calendar, DollarSign, FileText, 
  CheckCircle, XCircle, MessageSquare, AlertTriangle, Loader2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import TransferChat from '@/components/TransferChat';
import { computeEquivalentFromHTG, formatExchangeRateInfo } from '@/lib/currencyUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getTransferCode } from '@/lib/codeUtils';
import { formatDateTimeLocal } from '@/lib/dateUtils';

const TransferDetailAgent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(true);
  
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [processingCancel, setProcessingCancel] = useState(false);

  const fetchTransfer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          worker:worker_id(nom, prenom),
          agent:agent_id(exchange_rate, exchange_type)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTransfer(data);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', description: t('error.fetchFailed') });
      navigate('/agent/history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
    
    const sub = supabase
      .channel(`agent-transfer-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transfers', filter: `id=eq.${id}` }, 
        (payload) => {
          setTransfer(prev => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [id]);

  const handleRequestCancellation = async () => {
    if (!cancelReason.trim()) {
        toast({ variant: "destructive", description: "Motif requis" });
        return;
    }
    setProcessingCancel(true);
    try {
        const { error } = await supabase.functions.invoke('request-cancellation', {
            body: { transfer_id: id, agent_id: user.id, reason: cancelReason }
        });

        if (error) throw error;

        toast({ title: t('common.success'), description: "Demande d'annulation envoyée" });
        setCancelModalOpen(false);
        fetchTransfer();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', description: "Erreur lors de la demande" });
    } finally {
        setProcessingCancel(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white">{t('common.loading')}</div>;
  if (!transfer) return null;

  const displayCode = getTransferCode(transfer);
  const exchangeRate = transfer.exchange_rate_snapshot || transfer.agent?.exchange_rate;
  const exchangeType = transfer.exchange_type_snapshot || transfer.agent?.exchange_type;

  const equivalent = exchangeRate > 0 
    ? computeEquivalentFromHTG(transfer.total_htg, exchangeRate) 
    : 0;

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-500 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    validated: 'bg-green-500/10 text-green-500 border-green-500/20',
    cancel_requested: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  };

  const currentStatus = transfer.status === 'validated' ? 'approved' : transfer.status;
  const canCancel = (currentStatus === 'pending' || currentStatus === 'en_attente');

  return (
    <>
      <Helmet>
        <title>{t('transfer.detail.title')} - {displayCode}</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white pb-24">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/agent/history')}
            className="mb-6 pl-0 text-[#A0A0A0] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('transfer.detail.backHistory')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              >
                <div className="p-6 border-b border-[#2A2A2A] flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold mb-1">{t('transfer.detail.title')}</h1>
                    <div className="text-sm text-[#D4AF37] font-mono font-bold tracking-wider">{displayCode}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[currentStatus] || statusColors.pending}`}>
                    {t(`status.${currentStatus}`) || currentStatus}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.beneficiary')}</p>
                        <p className="font-medium">{transfer.beneficiary_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.phone')}</p>
                        <p className="font-medium">{transfer.beneficiary_phone}</p>
                        <p className="text-xs text-[#D4AF37]">{transfer.operator}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.date')}</p>
                        <p className="font-medium">{formatDateTimeLocal(transfer.created_at)}</p>
                      </div>
                    </div>

                     <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">Worker</p>
                        <p className="font-medium">{transfer.worker?.prenom || '—'} {transfer.worker?.nom || ''}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#111] border-t border-[#2A2A2A]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#A0A0A0] mb-1">{t('transfer.detail.amountSent')}</p>
                      <p className="text-xl font-bold">{Number(transfer.amount_dop).toFixed(2)} DOP</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-[#A0A0A0] mb-1">{t('transfer.detail.totalReceive')}</p>
                       <p className="text-xl font-bold text-[#D4AF37]">{Number(transfer.total_htg).toFixed(2)} HTG</p>
                       {exchangeType && (
                         <div className="mt-1">
                            <p className="text-sm font-medium text-white/80">≈ {equivalent.toFixed(2)} {exchangeType}</p>
                            <p className="text-[10px] text-[#666]">
                              {formatExchangeRateInfo(exchangeType, exchangeRate)}
                            </p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
              
               <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              >
                <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                   <h3 className="font-semibold flex items-center gap-2">
                     <MessageSquare className="w-4 h-4" />
                     {t('transfer.messages.title')}
                   </h3>
                   <Button size="sm" variant="ghost" onClick={() => setShowChat(!showChat)}>
                     {showChat ? t('transfer.messages.hide') : t('transfer.messages.show')}
                   </Button>
                </div>
                {showChat && (
                  <div className="h-[400px]">
                    <TransferChat transferId={id} status={transfer.status} />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="space-y-6">
              {transfer.proof_url && (
                 <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4"
                 >
                    <h3 className="text-sm font-semibold mb-3 text-[#A0A0A0] flex items-center gap-2">
                       <FileText className="w-4 h-4" />
                       {t('transfer.detail.proof')}
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-[#2A2A2A] group relative cursor-pointer" onClick={() => window.open(transfer.proof_url, '_blank')}>
                       <img src={transfer.proof_url} alt="Transfer proof" className="w-full h-auto hover:scale-105 transition-transform duration-500" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-xs font-bold">{t('transfer.detail.clickToView')}</span>
                       </div>
                    </div>
                 </motion.div>
              )}

              {canCancel && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4"
                  >
                     <h3 className="text-sm font-semibold mb-3 text-[#A0A0A0] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        {t('common.actions')}
                     </h3>
                     <Button 
                        onClick={() => setCancelModalOpen(true)}
                        className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/50"
                     >
                        {t('transfer.detail.cancelRequest')}
                     </Button>
                  </motion.div>
              )}

              {transfer.notes && (
                 <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4">
                    <h3 className="text-sm font-semibold mb-2 text-[#A0A0A0]">{t('transfer.detail.notes')}</h3>
                    <p className="text-sm text-white/80 bg-black/20 p-3 rounded-lg border border-white/5">
                       {transfer.notes}
                    </p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
         <DialogContent className="bg-[#1C1C1C] border-[#2A2A2A] text-white">
             <DialogHeader>
                 <DialogTitle>{t('transfer.detail.cancelRequest')}</DialogTitle>
                 <DialogDescription>
                     {t('transfer.detail.cancelPrompt')}
                 </DialogDescription>
             </DialogHeader>
             <div className="py-2">
                 <Textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={t('transfer.detail.cancelReason')}
                    className="bg-[#0B0B0B] border-[#2A2A2A]"
                 />
             </div>
             <DialogFooter>
                 <Button variant="outline" onClick={() => setCancelModalOpen(false)} className="border-[#2A2A2A]">{t('common.cancel')}</Button>
                 <Button onClick={handleRequestCancellation} disabled={processingCancel} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {processingCancel ? <Loader2 className="animate-spin" /> : t('common.submit')}
                 </Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>
    </>
  );
};

export default TransferDetailAgent;