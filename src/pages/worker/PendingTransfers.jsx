import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const PendingTransfers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          agent:agent_id (nom, prenom)
        `)
        .eq('worker_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('common.error')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransfers();
      const subscription = supabase
        .channel('public:transfers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => {
          fetchTransfers();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const handleAction = async (id, action) => {
    // action is 'approve' or 'reject'
    // This view might not support file upload, so we redirect to detail for approval
    if (action === 'approve') {
       navigate(`/worker/transfer/${id}`);
       return;
    }

    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('validate-transfer', {
        body: { transfer_id: id, worker_id: user.id, action }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('messages.transferRefused'),
        description: t('common.success'),
        variant: 'destructive'
      });
      
    } catch (error) {
      console.error(`Error ${action} transfer:`, error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('dashboard.worker.stats.pending')} - Worker</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <Button
                onClick={() => navigate('/worker/dashboard')}
                variant="ghost"
                className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('buttons.backToDashboard')}
              </Button>
              <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('dashboard.worker.stats.pending')}</h1>
            </div>
            <Button
              onClick={fetchTransfers}
              variant="outline"
              className="border-[#2A2A2A] text-[#A0A0A0]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
          >
            {loading && transfers.length === 0 ? (
               <div className="p-8 text-center text-[#A0A0A0]">
                 <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                 {t('common.loading')}
               </div>
            ) : transfers.length === 0 ? (
               <div className="p-12 text-center text-[#A0A0A0]">
                 <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p className="text-xl">{t('common.noData')}</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.agent')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountRD')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountHTG')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.date')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => (
                      <tr key={t.id} className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B]/50">
                        <td className="px-6 py-4 text-[#FFFFFF]">
                          {t.agent?.prenom} {t.agent?.nom}
                        </td>
                        <td className="px-6 py-4 text-[#FFFFFF] font-mono">
                          RD$ {t.amount_dop}
                        </td>
                        <td className="px-6 py-4 text-[#D4AF37] font-bold font-mono">
                          {t.total_htg || t.montant_htg} G
                        </td>
                        <td className="px-6 py-4 text-[#A0A0A0] text-sm">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(t.id, 'approve')}
                              disabled={processingId === t.id}
                              className="bg-[#10B981] hover:bg-[#059669] text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {t('buttons.validate')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(t.id, 'reject')}
                              disabled={processingId === t.id}
                              variant="destructive"
                              className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50"
                            >
                              {processingId === t.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-1" />
                              )}
                              {t('buttons.reject')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default PendingTransfers;