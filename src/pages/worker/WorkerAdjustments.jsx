import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { computeEquivalentFromHTG, formatExchangeRateInfo } from '@/lib/currencyUtils';
import { checkTransactionStatus } from '@/lib/transactionsGuard';

const WorkerAdjustments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [exchangeInfo, setExchangeInfo] = useState({ type: null, rate: null });

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("exchange_type, exchange_rate")
        .eq("id", user.id)
        .single();
      
      if (userData) {
         setExchangeInfo({ type: userData.exchange_type, rate: userData.exchange_rate });
      }

      const { data, error } = await supabase
        .from('worker_adjustments')
        .select('id, worker_id, montant, commentaire, statut, created_at, status')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdjustments(data || []);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', description: t('error.fetchFailed') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleResponse = async (id, isAccept) => {
    setProcessingId(id);
    
    const status = await checkTransactionStatus(user.id);
    if (!status.allowed) {
      toast({ variant: 'destructive', title: t('common.error'), description: status.message });
      setProcessingId(null);
      return;
    }

    const action = isAccept ? 'accept' : 'reject';
    const body = { adjustment_id: id, action };

    try {
      const { error } = await supabase.functions.invoke('approve-adjustment', {
        body: body
      });

      if (error) {
        if (error.context?.response?.status === 409 || error.message?.includes('processed')) {
            toast({ 
                variant: 'destructive', 
                title: t('common.error'),
                description: t('adjustments.alreadyProcessed')
            });
            fetchAdjustments(); 
            return;
        }
        if (error.context?.response?.status === 403) {
            throw new Error(t('error.transaction.disabled'));
        }
        throw error;
      }
      
      toast({ 
        className: isAccept ? "bg-green-600 text-white" : "bg-red-600 text-white",
        title: t('common.success'), 
        description: isAccept ? t('messages.adjustmentAccepted') : t('messages.adjustmentRefused')
      });
      
      fetchAdjustments(); 

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', description: error.message || t('common.error') });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'proposed': return t('adjustments.proposed'); 
      case 'pending': return t('adjustments.pending');
      case 'approved': return t('adjustments.approved');
      case 'accepted': return t('adjustments.accepted');
      case 'rejected': return t('adjustments.rejected');
      default: return status;
    }
  };

  const getStatusColor = (status) => {
     switch(status) {
      case 'proposed': return 'bg-blue-500/10 border-blue-500 text-blue-500';
      case 'pending': return 'bg-blue-500/10 border-blue-500 text-blue-500';
      case 'approved': return 'bg-green-500/10 border-green-500 text-green-500';
      case 'accepted': return 'bg-green-500/10 border-green-500 text-green-500';
      case 'rejected': return 'bg-red-500/10 border-red-500 text-red-500';
      default: return 'bg-gray-500/10 border-gray-500 text-gray-500';
    }
  };

  const hasExchange = exchangeInfo.type && exchangeInfo.rate > 0;

  return (
    <>
      <Helmet>
        <title>{t('pages.workerAdjustments.title')} - Worker</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white pb-24">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/worker/dashboard')} 
            className="mb-6 text-[#A0A0A0] hover:text-white pl-0"
          >
             <ArrowLeft className="w-4 h-4 mr-2" />
             {t('buttons.backToDashboard')}
          </Button>

          <h1 className="text-3xl font-bold mb-8">{t('pages.workerAdjustments.title')}</h1>

          <div className="space-y-4">
             {loading ? (
                <div className="text-center py-10 text-[#A0A0A0]">{t('common.loading')}</div>
             ) : adjustments.length === 0 ? (
                <div className="text-center py-10 text-[#A0A0A0]">{t('common.noData')}</div>
             ) : (
                adjustments.map((item) => {
                   const equivalent = hasExchange 
                      ? computeEquivalentFromHTG(item.montant, exchangeInfo.rate) 
                      : 0;
                   const canAction = item.statut === 'proposed' || item.statut === 'pending';

                   return (
                      <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A] relative overflow-hidden"
                      >
                          <div className="flex flex-col gap-4">
                             <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex-1">
                                   <div className="flex flex-col mb-3">
                                      <div className="flex items-center gap-3 flex-wrap">
                                         {/* USDT EN PRIORITAIRE */}
                                         {hasExchange ? (
                                            <>
                                               <span className={`text-2xl font-bold ${equivalent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                   {equivalent > 0 ? '+' : ''}{equivalent.toFixed(2)} {exchangeInfo.type}
                                               </span>
                                               <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(item.statut)}`}>
                                                   {getStatusText(item.statut)}
                                               </span>
                                            </>
                                         ) : (
                                            <>
                                               <span className={`text-2xl font-bold ${item.montant >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                   {item.montant > 0 ? '+' : ''}{item.montant} HTG
                                               </span>
                                               <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(item.statut)}`}>
                                                   {getStatusText(item.statut)}
                                               </span>
                                            </>
                                         )}
                                      </div>
                                      
                                      {/* ESTIMATION HTG EN PETIT */}
                                      {hasExchange && (
                                         <div className="mt-1">
                                           <div className="text-sm text-[#A0A0A0]">
                                              ≈ {item.montant > 0 ? '+' : ''}{item.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG
                                           </div>
                                           <div className="text-[10px] text-[#666]">
                                               {formatExchangeRateInfo(exchangeInfo.type, exchangeInfo.rate)}
                                           </div>
                                         </div>
                                      )}
                                   </div>
                                   
                                   <p className="text-[#EAEAEA] mb-3 whitespace-pre-wrap">{item.commentaire || t('adjustments.noComment')}</p>
                                   
                                   <p className="text-xs text-[#A0A0A0]">{new Date(item.created_at).toLocaleString()}</p>
                                </div>

                                <div className="flex sm:flex-col items-center gap-2">
                                    {canAction ? (
                                       <>
                                         <Button 
                                             onClick={() => handleResponse(item.id, false)}
                                             disabled={processingId === item.id}
                                             variant="outline"
                                             className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white w-full sm:w-auto"
                                         >
                                             {processingId === item.id ? <Loader2 className="animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                                             {t('common.reject')}
                                         </Button>
                                         <Button 
                                             onClick={() => handleResponse(item.id, true)}
                                             disabled={processingId === item.id}
                                             className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                         >
                                             {processingId === item.id ? <Loader2 className="animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                             {t('common.accept')}
                                         </Button>
                                       </>
                                    ) : (
                                       <div className="px-4 py-2 text-sm text-gray-500 italic border border-gray-700 rounded-md">
                                          {t('adjustments.actionDone')}
                                       </div>
                                    )}
                                </div>
                             </div>
                          </div>
                      </motion.div>
                   );
                })
             )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkerAdjustments;