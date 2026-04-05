import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Search, Clock, ArrowLeft, ChevronRight, Filter, RefreshCw, Calendar, X, Eye, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTransferCode, makeTransferCode } from '@/lib/codeUtils';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';
import WorkerReceipt from '@/components/WorkerReceipt';
import { formatDateTimeLocal } from '@/lib/dateUtils';

const WorkerTransfers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [paymentFilter, setPaymentFilter] = useState('all');

  const [timeFilter, setTimeFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [showReceipt, setShowReceipt] = useState(false);
  const [validatedTransfer, setValidatedTransfer] = useState(null);
  
  const periodKeys = ["all", "today", "week", "month", "year", "custom"];
  const statusKeys = ["all", "pending", "validated", "rejected", "cancel_requested"];

  const getStatusConfig = (status) => {
    const s = (status || '').toLowerCase();

    if (['validated', 'completed', 'approved'].includes(s)) {
      return {
        label: t('history.status.validated').toUpperCase(),
        className: 'bg-green-500/10 border-green-500 text-green-500',
        group: 'validated'
      };
    }

    if (['pending', 'en_attente', 'in_progress'].includes(s)) {
      return {
        label: t('history.status.pending').toUpperCase(),
        className: 'bg-yellow-500/10 border-yellow-500 text-yellow-500',
        group: 'pending'
      };
    }

    if (['rejected', 'refused', 'cancelled', 'refusé'].includes(s)) {
      return {
        label: t('history.status.rejected').toUpperCase(),
        className: 'bg-red-500/10 border-red-500 text-red-500',
        group: 'rejected'
      };
    }

    if (s === 'cancel_requested') {
      return {
        label: t('history.cancelRequested').toUpperCase(),
        className: 'bg-orange-500/10 border-orange-500 text-orange-500',
        group: 'cancel_requested'
      };
    }

    return {
      label: s.toUpperCase(),
      className: 'bg-gray-500/10 border-gray-500 text-gray-500',
      group: 'other'
    };
  };

  const getPaymentKey = (operator) => {
    const op = (operator || '').toString().toLowerCase();
    if (op.includes('natcash') || op.includes('natcom')) return 'natcash';
    if (op.includes('moncash') || op.includes('digicel')) return 'moncash';
    return 'unknown';
  };

  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const startOfWeek = () => {
    const d = startOfToday();
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };
  const startOfMonth = () => {
    const d = startOfToday();
    d.setDate(1);
    return d;
  };
  const startOfYear = () => {
    const d = startOfToday();
    d.setMonth(0, 1);
    return d;
  };

  const isInTimeFilter = (createdAt) => {
    if (!createdAt) return true;
    if (timeFilter === "all") return true;

    const dt = new Date(createdAt);

    if (timeFilter === "today") return dt >= startOfToday();
    if (timeFilter === "week") return dt >= startOfWeek();
    if (timeFilter === "month") return dt >= startOfMonth();
    if (timeFilter === "year") return dt >= startOfYear();

    if (timeFilter === "custom") {
      if (!customFrom && !customTo) return true;

      const from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      const to = customTo ? new Date(customTo + "T23:59:59") : null;

      if (from && dt < from) return false;
      if (to && dt > to) return false;
      return true;
    }

    return true;
  };

  const fetchTransfers = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({ variant: 'destructive', description: t('error.fetchFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = async (e, transferId) => {
    e.preventDefault(); 
    e.stopPropagation();

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          agent:agent_id ( nom, prenom, email ),
          worker:worker_id ( nom, prenom, email )
        `)
        .eq('id', transferId)
        .single();

      if (error) throw error;

      const receiptData = {
        ...data,
        worker_name: data.worker ? `${data.worker.prenom} ${data.worker.nom}` : 'N/A',
        agent_name: data.agent ? `${data.agent.prenom} ${data.agent.nom}` : 'N/A',
      };

      setValidatedTransfer(receiptData);
      setShowReceipt(true);
    } catch (err) {
      console.error('Error fetching receipt data:', err);
      toast({ variant: "destructive", title: t('common.error'), description: t('error.unexpected') });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!validatedTransfer) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 600;
      const height = 850;

      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Header Background
      const gradient = ctx.createLinearGradient(0, 0, width, 120);
      gradient.addColorStop(0, '#15803d');
      gradient.addColorStop(1, '#22c55e');
      ctx.fillStyle = gradient;
      ctx.fillRect(12, 12, width - 24, 120);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VALIDATION RÉUSSIE', width / 2, 70);
      
      ctx.font = '16px Arial';
      ctx.fillText('Transaction validée par VS XPRESS', width / 2, 100);

      // Transaction Code
      const code = getTransferCode(validatedTransfer);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 40px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(code, width / 2, 180);

      // Section Divider
      const drawDivider = (y) => {
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      };

      // Beneficiary Section
      let currentY = 240;
      ctx.fillStyle = '#9ca3af'; 
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('BÉNÉFICIAIRE', 40, currentY);

      currentY += 30;
      ctx.fillStyle = '#D4AF37'; 
      ctx.font = 'bold 24px Arial';
      ctx.fillText(validatedTransfer.beneficiary_name || '', 40, currentY);

      currentY += 25;
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Courier New';
      ctx.fillText(validatedTransfer.beneficiary_phone || '', 40, currentY);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(validatedTransfer.operator || '', width - 40, currentY);

      currentY += 30;
      drawDivider(currentY);

      // Amounts Section
      currentY += 40;
      
      // Amount DOP
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Montant Brut (DOP)', 40, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(formatMoneyDOP(validatedTransfer.amount_dop), width - 40, currentY);

      currentY += 30;

      // Fees
      if (validatedTransfer.fees > 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'left';
        ctx.fillText('Frais', 40, currentY);
        ctx.fillStyle = '#ef4444'; 
        ctx.textAlign = 'right';
        ctx.fillText('-' + formatMoneyDOP(validatedTransfer.fees), width - 40, currentY);
        currentY += 30;
      }

      // Net Amount
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Net en DOP', 40, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(formatMoneyDOP(validatedTransfer.net_amount_dop), width - 40, currentY);

      currentY += 40;

      // Total HTG Box
      ctx.fillStyle = '#14532d'; 
      ctx.fillRect(30, currentY, width - 60, 100);
      ctx.strokeStyle = '#22c55e';
      ctx.strokeRect(30, currentY, width - 60, 100);

      ctx.fillStyle = '#4ade80'; 
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MONTANT FINAL (HTG)', width / 2, currentY + 35);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Courier New';
      ctx.fillText(formatMoneyHTG(validatedTransfer.total_htg), width / 2, currentY + 80);

      currentY += 140;

      // Validator Info
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('VALIDÉ PAR', 40, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(validatedTransfer.worker_name || 'Worker', 140, currentY);

      currentY += 40;

      // Date
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Arial';
      ctx.fillText('DATE', 40, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      const dateStr = validatedTransfer.validated_at || validatedTransfer.updated_at || validatedTransfer.created_at;
      ctx.fillText(new Date(dateStr).toLocaleString('fr-FR'), 140, currentY);

      // Footer
      ctx.fillStyle = '#374151';
      ctx.fillRect(12, height - 50, width - 24, 38);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Reçu généré par VS XPRESS - vsxpress.com', width / 2, height - 25);

      // Convert and Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `validation-${code}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: t('common.success'),
        description: t('stats.exportSuccess'),
        className: "bg-green-600 border-none text-white",
      });

    } catch (error) {
      console.error('Canvas error:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('error.unexpected'),
      });
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchTransfers();

    const channel = supabase
      .channel('worker-transfers-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfers',
          filter: `worker_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransfers(prev => [payload.new, ...prev]);
            toast({ title: t('dashboard.recentNotifications') });
          } else if (payload.eventType === 'UPDATE') {
            setTransfers(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
          } else if (payload.eventType === 'DELETE') {
            setTransfers(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const filteredTransfers = transfers.filter((tr) => {
    const name = (tr.beneficiary_name || '').toLowerCase();
    const phone = (tr.beneficiary_phone || '');
    const code = getTransferCode(tr).toLowerCase();
    const s = search.toLowerCase();
    const matchesSearch = name.includes(s) || phone.includes(s) || code.includes(s);

    const matchesStatus =
      statusFilter === 'all' ? true : (getStatusConfig(tr.status).group === statusFilter);

    const payKey = getPaymentKey(tr.operator);
    const matchesPayment =
      paymentFilter === 'all' ? true : (payKey === paymentFilter);

    const matchesTime = isInTimeFilter(tr.created_at);

    return matchesSearch && matchesStatus && matchesPayment && matchesTime;
  });

  const clearCustomDates = () => {
    setCustomFrom("");
    setCustomTo("");
  };

  const setPreset = (preset) => {
    setTimeFilter(preset);
    if (preset !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setTimeFilter('today');
    setCustomFrom('');
    setCustomTo('');
  };

  return (
    <>
      <Helmet>
        <title>{t('pages.workerTransfers.title')} - Worker</title>
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold">{t('pages.workerTransfers.title')}</h1>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('common.search')}
                  className="pl-9 bg-[#1E1E1E] border-[#2A2A2A] text-white focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#A0A0A0]" />
                    <SelectValue placeholder={t('history.status.all')} />
                  </div>
                </SelectTrigger>

                <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                  {statusKeys.map(k => (
                    <SelectItem key={k} value={k}>{t(`history.status.${k}`).toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#A0A0A0]" />
                    <SelectValue placeholder={t('history.payment')} />
                  </div>
                </SelectTrigger>

                <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                  <SelectItem value="all">{t('history.status.all')}</SelectItem>
                  <SelectItem value="moncash">MonCash (Digicel)</SelectItem>
                  <SelectItem value="natcash">NatCash (Natcom)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="border-[#2A2A2A] text-white hover:bg-[#1E1E1E] w-full sm:w-auto"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
              <Calendar className="w-4 h-4" />
              <span>{t('history.filterByPeriod')}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {periodKeys.map(k => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={timeFilter === k ? "default" : "outline"}
                  className={
                    timeFilter === k
                      ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                      : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                  }
                  onClick={() => setPreset(k)}
                >
                  {t(`history.period.${k}`)}
                </Button>
              ))}
            </div>

            {timeFilter === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-4">
                <div className="space-y-1">
                  <label className="text-[#A0A0A0] text-xs">{t('history.from')}</label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A0A0A0] text-xs">{t('history.to')}</label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#2A2A2A] text-white hover:bg-white/10"
                    onClick={clearCustomDates}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="animate-spin text-[#D4AF37] w-8 h-8" />
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="text-center py-12 bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] border-dashed">
                <p className="text-[#A0A0A0]">{t('common.noData')}</p>

                {(statusFilter !== 'all' || paymentFilter !== 'all' || search || timeFilter !== 'today') && (
                  <Button variant="link" onClick={resetFilters} className="text-[#D4AF37]">
                    {t('history.resetFilters')}
                  </Button>
                )}
              </div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {filteredTransfers.map((item) => {
                  const ui = getStatusConfig(item.status);
                  const isValidated = ui.group === 'validated';

                  return (
                    <Link to={`/worker/transfer/${item.id}`} key={item.id} className="block group">
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        whileHover={{ scale: 1.01, backgroundColor: '#252525' }}
                        className="bg-[#1E1E1E] p-5 sm:p-6 rounded-xl border border-[#2A2A2A] hover:border-[#D4AF37]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex-1 w-full">
                          <div className="flex items-center justify-between sm:justify-start gap-3 mb-2">
                             <span className="text-xs font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded bg-[#D4AF37]/10">
                               {getTransferCode(item)}
                             </span>
                            <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider whitespace-nowrap ${ui.className}`}>
                              {ui.label}
                            </span>
                          </div>
                          
                          <div className="mb-2">
                             <span className="font-bold text-lg text-white truncate block">{item.beneficiary_name}</span>
                          </div>

                          <div className="text-sm text-[#A0A0A0] space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono bg-[#111] px-1.5 py-0.5 rounded text-[#CCC]">{item.beneficiary_phone}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-[#888]">{item.operator || t('common.unknown')}</span>
                            </div>

                            <div className="flex justify-between items-end sm:block mt-2 sm:mt-0">
                              <p className="text-[#D4AF37] font-medium text-lg sm:text-base mt-1">
                                {formatMoneyHTG(item.total_htg ?? item.montant_htg ?? item.amount)}
                              </p>
                              <p className="text-xs flex items-center gap-1 mt-1 opacity-70 sm:hidden">
                                <Clock size={12} />
                                {formatDateTimeLocal(item.created_at)}
                              </p>
                            </div>

                            <p className="text-xs flex items-center gap-1 mt-1 opacity-70 hidden sm:flex">
                              <Clock size={12} />
                              {formatDateTimeLocal(item.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 border-[#2A2A2A] pt-3 sm:pt-0">
                           {isValidated && (
                             <Button
                               onClick={(e) => handleViewReceipt(e, item.id)}
                               variant="outline"
                               size="sm"
                               className="flex-1 sm:flex-none bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30 hover:bg-[#22c55e]/20"
                             >
                               <CheckCircle2 className="w-4 h-4 mr-1.5" />
                               {t('history.receipt')}
                             </Button>
                           )}
                          <div className="hidden sm:flex items-center text-[#444] group-hover:text-[#D4AF37] transition-colors ml-auto">
                            <ChevronRight size={20} />
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {showReceipt && validatedTransfer && (
        <WorkerReceipt
          transferData={validatedTransfer}
          onClose={() => setShowReceipt(false)}
          onDownload={handleDownloadReceipt}
        />
      )}
    </>
  );
};

export default WorkerTransfers;