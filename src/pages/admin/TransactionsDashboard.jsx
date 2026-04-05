// ... existing imports ...
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Filter, MessageSquare, Calendar, TrendingUp, DollarSign, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import AdminTransferReceipt from '@/components/AdminTransferReceipt';
import { formatMoney, formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';
import { getTransferCode, makeTransferCode } from '@/lib/codeUtils';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTimeLocal, formatDateTimeLongLocal } from '@/lib/dateUtils';

const TransactionsDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [timeFilter, setTimeFilter] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const isValidatedStatus = (status) => status === 'approved' || status === 'validated';

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transfers')
        .select(`
          *,
          agent:agent_id (nom, prenom),
          worker:worker_id (nom, prenom)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const sub = supabase
      .channel('admin-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [filter]);

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
    if (timeFilter === 'all') return true;

    const dt = new Date(createdAt);

    if (timeFilter === 'today') return dt >= startOfToday();
    if (timeFilter === 'week') return dt >= startOfWeek();
    if (timeFilter === 'month') return dt >= startOfMonth();
    if (timeFilter === 'year') return dt >= startOfYear();

    if (timeFilter === 'custom') {
      if (!customFrom && !customTo) return true;

      const from = customFrom ? new Date(customFrom + 'T00:00:00') : null;
      const to = customTo ? new Date(customTo + 'T23:59:59') : null;

      if (from && dt < from) return false;
      if (to && dt > to) return false;
      return true;
    }

    return true;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const searchLower = search.toLowerCase();
      
      const transactionCode = getTransferCode(t).toLowerCase();
      
      const matchesSearch = (
        transactionCode.includes(searchLower) ||
        t.id.toLowerCase().includes(searchLower) ||
        (t.agent?.nom?.toLowerCase() || '').includes(searchLower) ||
        (t.agent?.prenom?.toLowerCase() || '').includes(searchLower) ||
        `${t.agent?.prenom || ''} ${t.agent?.nom || ''}`.toLowerCase().includes(searchLower) ||
        (t.worker?.nom?.toLowerCase() || '').includes(searchLower) ||
        (t.worker?.prenom?.toLowerCase() || '').includes(searchLower) ||
        `${t.worker?.prenom || ''} ${t.worker?.nom || ''}`.toLowerCase().includes(searchLower) ||
        (t.beneficiary_name?.toLowerCase() || '').includes(searchLower) ||
        (t.beneficiary_phone?.toLowerCase() || '').includes(searchLower)
      );

      const matchesTime = isInTimeFilter(t.created_at);

      return matchesSearch && matchesTime;
    });
  }, [transactions, search, timeFilter, customFrom, customTo]);

  const stats = useMemo(() => {
    const count = filteredTransactions.length;

    const validated = filteredTransactions.filter(tr => isValidatedStatus(tr.status));

    const totalDOP = validated.reduce((sum, tr) => {
      const n = Number(tr.amount_dop);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const totalHTG = validated.reduce((sum, tr) => {
      const n = Number(tr.total_htg || tr.montant_htg);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    return { count, totalDOP, totalHTG };
  }, [filteredTransactions]);

  const clearCustomDates = () => {
    setCustomFrom('');
    setCustomTo('');
  };

  const setPreset = (preset) => {
    setTimeFilter(preset);
    if (preset !== 'custom') {
      setCustomFrom('');
      setCustomTo('');
    }
  };

  const handleTransactionClick = async (transaction) => {
     try {
        setLoading(true);
        const { data, error } = await supabase
           .from('transfers')
           .select(`
              *,
              agent:agent_id ( nom, prenom, email, exchange_rate ),
              worker:worker_id ( nom, prenom, email )
           `)
           .eq('id', transaction.id)
           .single();

        if (error) throw error;

        const receiptData = {
           ...data,
           agent_name: data.agent ? `${data.agent.prenom} ${data.agent.nom}` : 'Agent Inconnu',
           worker_name: data.worker ? `${data.worker.prenom} ${data.worker.nom}` : null,
        };

        setSelectedTransfer(receiptData);
        setShowReceipt(true);
     } catch (err) {
        console.error("Error fetching detailed transaction:", err);
        toast({ variant: "destructive", description: "Impossible de charger les détails." });
     } finally {
        setLoading(false);
     }
  };

  const handleDownloadReceipt = () => {
     if (!selectedTransfer) return;

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

       // Gold Border
       ctx.strokeStyle = '#D4AF37';
       ctx.lineWidth = 4;
       ctx.strokeRect(10, 10, width - 20, height - 20);

       // Header Background
       const gradient = ctx.createLinearGradient(0, 0, width, 120);
       gradient.addColorStop(0, '#D4AF37');
       gradient.addColorStop(1, '#B8941F');
       ctx.fillStyle = gradient;
       ctx.fillRect(12, 12, width - 24, 120);

       // Header Text
       ctx.fillStyle = '#000000';
       ctx.font = 'bold 32px Arial';
       ctx.textAlign = 'center';
       ctx.fillText('DETAILS TRANSACTION', width / 2, 70);
       
       ctx.font = '16px Arial';
       ctx.fillText('Rapport Administratif VS XPRESS', width / 2, 100);

       // Transaction Code
       const code = getTransferCode(selectedTransfer);
       ctx.fillStyle = '#D4AF37';
       ctx.font = 'bold 40px Courier New';
       ctx.textAlign = 'center';
       ctx.fillText(code, width / 2, 180);

       // Section Divider Helper
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
       ctx.fillStyle = '#ffffff'; 
       ctx.font = 'bold 24px Arial';
       ctx.fillText(selectedTransfer.beneficiary_name || '', 40, currentY);

       currentY += 25;
       ctx.fillStyle = '#9ca3af';
       ctx.font = '18px Courier New';
       ctx.fillText(selectedTransfer.beneficiary_phone || '', 40, currentY);

       ctx.fillStyle = '#D4AF37';
       ctx.font = 'bold 16px Arial';
       ctx.textAlign = 'right';
       ctx.fillText(selectedTransfer.operator || '', width - 40, currentY);

       currentY += 30;
       drawDivider(currentY);

       // Agent & Worker
       currentY += 40;
       ctx.fillStyle = '#9ca3af'; 
       ctx.font = '14px Arial';
       ctx.textAlign = 'left';
       ctx.fillText('AGENT', 40, currentY);
       ctx.textAlign = 'right';
       ctx.fillText('WORKER', width - 40, currentY);

       currentY += 25;
       ctx.fillStyle = '#ffffff';
       ctx.font = 'bold 16px Arial';
       ctx.textAlign = 'left';
       ctx.fillText(selectedTransfer.agent_name || 'N/A', 40, currentY);
       ctx.textAlign = 'right';
       ctx.fillText(selectedTransfer.worker_name || 'Non assigné', width - 40, currentY);

       currentY += 40;
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
       ctx.fillText(formatMoneyDOP(selectedTransfer.amount_dop), width - 40, currentY);

       currentY += 30;

       // Fees
       if (selectedTransfer.fees > 0) {
         ctx.fillStyle = '#9ca3af';
         ctx.textAlign = 'left';
         ctx.fillText('Frais', 40, currentY);
         ctx.fillStyle = '#ef4444'; 
         ctx.textAlign = 'right';
         ctx.fillText('-' + formatMoneyDOP(selectedTransfer.fees), width - 40, currentY);
         currentY += 30;
       }

       // Net Amount
       ctx.fillStyle = '#ffffff';
       ctx.font = 'bold 16px Arial';
       ctx.textAlign = 'left';
       ctx.fillText('Net en DOP', 40, currentY);
       ctx.textAlign = 'right';
       ctx.fillText(formatMoneyDOP(selectedTransfer.net_amount_dop), width - 40, currentY);

       currentY += 40;

       // Total HTG Box
       ctx.fillStyle = '#2A2005'; 
       ctx.fillRect(30, currentY, width - 60, 100);
       ctx.strokeStyle = '#D4AF37';
       ctx.strokeRect(30, currentY, width - 60, 100);

       ctx.fillStyle = '#D4AF37';
       ctx.font = 'bold 16px Arial';
       ctx.textAlign = 'center';
       ctx.fillText('MONTANT FINAL (HTG)', width / 2, currentY + 35);

       ctx.fillStyle = '#ffffff';
       ctx.font = 'bold 40px Courier New';
       ctx.fillText(formatMoneyHTG(selectedTransfer.total_htg), width / 2, currentY + 80);

       currentY += 140;

       // Date
       ctx.fillStyle = '#9ca3af';
       ctx.font = '14px Arial';
       ctx.textAlign = 'center';
       ctx.fillText(`DATE: ${formatDateTimeLongLocal(selectedTransfer.created_at)}`, width/2, currentY);
       
       // Status
       currentY += 25;
       ctx.font = 'bold 14px Arial';
       ctx.fillStyle = isValidatedStatus(selectedTransfer.status) ? '#22c55e' : '#eab308';
       ctx.fillText(`STATUT: ${selectedTransfer.status.toUpperCase()}`, width/2, currentY);

       // Footer
       ctx.fillStyle = '#374151';
       ctx.fillRect(12, height - 50, width - 24, 38);
       ctx.fillStyle = '#9ca3af';
       ctx.font = '12px Arial';
       ctx.textAlign = 'center';
       ctx.fillText('Document interne - VS XPRESS Admin', width / 2, height - 25);

       // Convert and Download
       const dataUrl = canvas.toDataURL('image/png');
       const link = document.createElement('a');
       link.download = `transaction-${code}.png`;
       link.href = dataUrl;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       
       toast({
         title: "Téléchargement réussi",
         description: "Le rapport a été enregistré.",
         className: "bg-[#D4AF37] border-none text-black",
       });

     } catch (error) {
       console.error('Canvas error:', error);
       toast({
         variant: "destructive",
         title: "Erreur",
         description: "Impossible de générer l'image.",
       });
     }
  };

  return (
    <>
      <Helmet>
        <title>{t('buttons.transactions')} - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4 pl-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('buttons.backToDashboard')}
            </Button>
            <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('buttons.transactions')}</h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#1E1E1E] to-[#111111] border border-[#D4AF37]/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:border-[#D4AF37]/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-[#D4AF37]/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">
                      Qté Transactions
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1">
                    {stats.count}
                  </div>
                  <div className="text-xs text-[#777]">
                    Basé sur les filtres actifs
                  </div>
                </div>
                <div className="p-2.5 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[#1E1E1E] to-[#111111] border border-[#D4AF37]/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:border-[#D4AF37]/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-[#D4AF37]/20 rounded-lg">
                      <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">
                      Montant Total DOP
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1 font-mono">
                    {formatMoneyDOP(stats.totalDOP)}
                  </div>
                  <div className="text-xs text-[#777]">
                    Seulement transactions validées
                  </div>
                </div>
                <div className="p-2.5 bg-white/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-[#1E1E1E] to-[#111111] border border-[#D4AF37]/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:border-[#D4AF37]/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-[#D4AF37]/20 rounded-lg">
                      <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">
                      Montant Total HTG
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#D4AF37] mb-1 font-mono">
                    {formatMoneyHTG(stats.totalHTG)}
                  </div>
                  <div className="text-xs text-[#777]">
                    Seulement transactions validées
                  </div>
                </div>
                <div className="p-2.5 bg-[#D4AF37]/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-[#D4AF37]" />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
              <Calendar className="w-4 h-4" />
              <span>Filtrer par période</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                variant={timeFilter === 'all' ? 'default' : 'outline'}
                className={
                  timeFilter === 'all'
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset('all')}
              >
                Tout
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === 'today' ? 'default' : 'outline'}
                className={
                  timeFilter === 'today'
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset('today')}
              >
                Aujourd&apos;hui
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === 'week' ? 'default' : 'outline'}
                className={
                  timeFilter === 'week'
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset('week')}
              >
                7 jours
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === 'month' ? 'default' : 'outline'}
                className={
                  timeFilter === 'month'
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset('month')}
              >
                Mois
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === 'year' ? 'default' : 'outline'}
                className={
                  timeFilter === 'year'
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset('year')}
              >
                Année
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === 'custom' ? 'default' : 'outline'}
                className={
                  timeFilter === 'custom'
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset('custom')}
              >
                Personnalisé
              </Button>
            </div>

            {timeFilter === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-4">
                <div className="space-y-1">
                  <label className="text-[#A0A0A0] text-xs">De</label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A0A0A0] text-xs">À</label>
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

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] w-4 h-4" />
              <Input
                placeholder="Rechercher par N°, agent, worker, bénéficiaire..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#1E1E1E] border-[#2A2A2A] text-white"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1E1E] border border-[#2A2A2A]">
                <SelectItem value="all">{t('status.all')}</SelectItem>
                <SelectItem value="pending">{t('status.pending')}</SelectItem>
                <SelectItem value="approved">{t('status.approved')}</SelectItem>
                <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">N° Transaction</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.status')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.agent')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.worker')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountRD')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountHTG')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.date')}</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tr) => (
                    <tr
                      key={tr.id}
                      className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B]/50 cursor-pointer"
                      onClick={() => handleTransactionClick(tr)}
                    >
                      <td className="px-6 py-4 text-[#D4AF37] font-mono font-bold">
                        {getTransferCode(tr)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                          tr.status === 'approved' || tr.status === 'validated' ? 'bg-green-500/20 text-green-500' :
                          tr.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#FFFFFF]">{tr.agent?.prenom} {tr.agent?.nom}</td>
                      <td className="px-6 py-4 text-[#FFFFFF]">{tr.worker?.prenom} {tr.worker?.nom || "-"}</td>
                      <td className="px-6 py-4 text-[#FFFFFF] font-mono">{formatMoneyDOP(tr.amount_dop)}</td>
                      <td className="px-6 py-4 text-[#D4AF37] font-mono">{formatMoneyHTG(tr.total_htg || tr.montant_htg)}</td>
                      <td className="px-6 py-4 text-[#A0A0A0] text-sm">{formatDateTimeLocal(tr.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <MessageSquare className="w-4 h-4 text-[#A0A0A0] inline" />
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && !loading && (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-[#A0A0A0]">
                        {search ? "Aucun résultat ne correspond à votre recherche" : t('common.noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {showReceipt && selectedTransfer && (
        <AdminTransferReceipt
          transferData={selectedTransfer}
          onClose={() => setShowReceipt(false)}
          onDownload={handleDownloadReceipt}
        />
      )}
    </>
  );
};

export default TransactionsDashboard;