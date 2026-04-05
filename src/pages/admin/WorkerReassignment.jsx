import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, User, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

const WorkerReassignment = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [sourceWorker, setSourceWorker] = useState('');
  const [destWorker, setDestWorker] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (sourceWorker) {
      fetchPendingCount(sourceWorker);
    } else {
      setPendingCount(0);
    }
  }, [sourceWorker]);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nom, prenom')
        .eq('role', 'worker');

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast({ variant: 'destructive', description: t("common.error") });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async (workerId) => {
    try {
      const { count, error } = await supabase
        .from('transfers')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const handleReassign = async () => {
    if (!sourceWorker || !destWorker) return;
    if (sourceWorker === destWorker) {
      toast({ variant: 'destructive', description: t("worker.reassignment.sameWorkerError") });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reassign-transfers', {
        body: { 
          from_worker_id: sourceWorker, 
          to_worker_id: destWorker,
          admin_id: user.id 
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ 
        className: "bg-green-600 text-white",
        title: t('common.success'), 
        description: t('worker.reassignment.success', { count: data.count }) 
      });

      setSourceWorker('');
      setDestWorker('');
      setPendingCount(0);

    } catch (error) {
      console.error('Reassign error:', error);
      toast({ variant: 'destructive', description: error.message || t("common.error") });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('worker.reassignment.title')} - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6 text-white">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4 p-0 hover:bg-transparent"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('common.backToDashboard')}
            </Button>
            <h1 className="text-3xl font-bold mb-2">{t('worker.reassignment.title')}</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-6 space-y-6"
          >
             <div className="bg-[#D4AF37]/10 p-4 rounded-lg flex items-start gap-3 border border-[#D4AF37]/20">
                <AlertTriangle className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                <p className="text-sm text-[#EAEAEA]">
                   {t("worker.reassignment.help")}
                </p>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <Label>{t('worker.reassignment.sourceWorker')}</Label>
                   <Select value={sourceWorker} onValueChange={setSourceWorker}>
                      <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A]">
                         <SelectValue placeholder={t('forms.selectWorker')} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                         {workers.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.prenom} {w.nom}</SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                   {sourceWorker && (
                      <p className="text-sm text-[#A0A0A0] mt-1">
                         {t('worker.reassignment.pendingTransfers')}: <span className="text-[#D4AF37] font-bold">{pendingCount}</span>
                      </p>
                   )}
                </div>

                <div className="flex justify-center">
                   <ArrowLeft className="w-6 h-6 rotate-[-90deg] text-[#A0A0A0]" />
                </div>

                <div className="space-y-2">
                   <Label>{t('worker.reassignment.destinationWorker')}</Label>
                   <Select value={destWorker} onValueChange={setDestWorker}>
                      <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A]">
                         <SelectValue placeholder={t('forms.selectWorker')} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                         {workers.filter(w => w.id !== sourceWorker).map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.prenom} {w.nom}</SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                </div>
             </div>

             <Button 
                onClick={handleReassign}
                disabled={processing || !sourceWorker || !destWorker || pendingCount === 0}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F] font-bold"
             >
                {processing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {t('worker.reassignment.reassign')}
             </Button>

          </motion.div>
        </div>
      </div>
    </>
  );
};

export default WorkerReassignment;