import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTimeLocal } from '@/lib/dateUtils';

const DepositHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('deposits')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('statut', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
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
      fetchDeposits();

      // Realtime subscription
      const subscription = supabase
        .channel('my-deposits')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deposits',
            filter: `agent_id=eq.${user.id}`,
          },
          () => {
            fetchDeposits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user, filter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'validated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('status.approved')}</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-500"><XCircle className="w-3 h-3 mr-1" /> {t('status.rejected')}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" /> {t('status.pending')}</span>;
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('dashboard.agent.actions.history')} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center mb-4">
              <Button
                onClick={() => navigate('/agent/dashboard')}
                variant="ghost"
                className="text-[#A0A0A0] hover:text-[#D4AF37]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('buttons.backToDashboard')}
              </Button>
              <Button onClick={() => navigate('/agent/deposit-form')} className="bg-[#D4AF37] text-black hover:bg-[#B8941F]">
                {t('buttons.newDeposit')}
              </Button>
            </div>
            
            <div className="flex justify-between items-end">
              <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('dashboard.agent.actions.history')}</h1>
              <div className="flex gap-2">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[150px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
                    <SelectValue placeholder={t('common.filter')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                    <SelectItem value="all">{t('status.all')}</SelectItem>
                    <SelectItem value="pending">{t('status.pending')}</SelectItem>
                    <SelectItem value="approved">{t('status.approved')}</SelectItem>
                    <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchDeposits} className="border-[#2A2A2A]">
                  <RefreshCw className={`w-4 h-4 text-[#A0A0A0] ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountRD')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.method')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.status')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.length > 0 ? (
                    deposits.map((d) => (
                      <tr key={d.id} className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B]/50">
                        <td className="px-6 py-4 text-[#D4AF37] font-mono font-bold">
                          {d.montant.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).replace('$', 'RD$ ')}
                        </td>
                        <td className="px-6 py-4 text-[#FFFFFF]">{d.methode}</td>
                        <td className="px-6 py-4">{getStatusBadge(d.statut)}</td>
                        <td className="px-6 py-4 text-[#A0A0A0] text-sm">
                          {formatDateTimeLocal(d.created_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-[#A0A0A0]">
                        {t('common.noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default DepositHistory;