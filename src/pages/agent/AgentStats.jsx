import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  TrendingUp, 
  CreditCard,
  DollarSign,
  Activity,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { getTransferCode } from '@/lib/codeUtils';

// --- Helper Components ---

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-[#1E1E1E] border border-[#2A2A2A] p-6 rounded-2xl relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
      <Icon className="w-16 h-16" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-[#A0A0A0] text-sm font-medium">{title}</p>
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      {subValue && <p className="text-xs text-[#666]">{subValue}</p>}
    </div>
  </motion.div>
);

const FilterButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
      active 
        ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20" 
        : "bg-[#1E1E1E] text-[#A0A0A0] hover:bg-[#2A2A2A] hover:text-white border border-[#2A2A2A]"
    )}
  >
    {label}
  </button>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] p-3 rounded-xl shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[#A0A0A0]">{entry.name}:</span>
            <span className="text-white font-mono">{Number(entry.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Component ---

const AgentStats = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('today'); // day, week, month, year, custom, all
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [stats, setStats] = useState({
    transfers: {
      total: 0,
      validated: 0,
      pending: 0,
      rejected: 0,
      volumeDOP: 0,
      volumeHTG: 0
    },
    deposits: {
      total: 0,
      validated: 0,
      volumeDOP: 0,
      byBank: []
    },
    chartData: [],
    depositsChartData: []
  });

  // Date Range Helper
  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (timeFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (!customStart || !customEnd) return null;
        return { 
          start: new Date(customStart + 'T00:00:00'), 
          end: new Date(customEnd + 'T23:59:59') 
        };
      case 'all':
        return null;
      default:
        start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  };

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const range = getDateRange();
      
      // Build Queries
      let transfersQuery = supabase
        .from('transfers')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: true });

      let depositsQuery = supabase
        .from('deposits')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: true });

      if (range) {
        transfersQuery = transfersQuery.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString());
        depositsQuery = depositsQuery.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString());
      }

      const [transfersRes, depositsRes] = await Promise.all([transfersQuery, depositsQuery]);

      if (transfersRes.error) throw transfersRes.error;
      if (depositsRes.error) throw depositsRes.error;

      const transfers = transfersRes.data || [];
      const deposits = depositsRes.data || [];

      // Process Transfers
      const transferStats = transfers.reduce((acc, curr) => {
        const amountDOP = Number(curr.amount_dop || 0);
        const amountHTG = Number(curr.montant_htg || 0);
        const status = (curr.status || '').toLowerCase();

        acc.total++;
        if (['validated', 'completed', 'approved', 'success'].includes(status)) {
          acc.validated++;
          acc.volumeDOP += amountDOP;
          acc.volumeHTG += amountHTG;
        } else if (['rejected', 'failed', 'cancelled'].includes(status)) {
          acc.rejected++;
        } else {
          acc.pending++;
        }
        return acc;
      }, { total: 0, validated: 0, pending: 0, rejected: 0, volumeDOP: 0, volumeHTG: 0 });

      // Process Deposits
      const depositStats = deposits.reduce((acc, curr) => {
        const amount = Number(curr.amount || curr.montant || 0); // Handle schema variations
        const status = (curr.statut || curr.status || '').toLowerCase();
        const method = (curr.methode || 'Autre').trim();

        acc.total++;
        if (['validated', 'approved', 'success'].includes(status)) {
          acc.validated++;
          acc.volumeDOP += amount;
          
          const existingBank = acc.byBank.find(b => b.name === method);
          if (existingBank) {
            existingBank.value += amount;
          } else {
            acc.byBank.push({ name: method, value: amount });
          }
        }
        return acc;
      }, { total: 0, validated: 0, volumeDOP: 0, byBank: [] });

      // Process Charts Data (Group by Date)
      const chartMap = new Map();
      
      transfers.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString();
        if (!chartMap.has(date)) chartMap.set(date, { date, transfers: 0, deposits: 0 });
        if (['validated', 'completed', 'approved'].includes((t.status || '').toLowerCase())) {
          chartMap.get(date).transfers += Number(t.amount_dop || 0);
        }
      });

      deposits.forEach(d => {
        const date = new Date(d.created_at).toLocaleDateString();
        if (!chartMap.has(date)) chartMap.set(date, { date, transfers: 0, deposits: 0 });
        if (['validated', 'approved'].includes((d.statut || '').toLowerCase())) {
          chartMap.get(date).deposits += Number(d.amount || d.montant || 0);
        }
      });

      const chartData = Array.from(chartMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

      setStats({
        transfers: transferStats,
        deposits: depositStats,
        chartData,
        depositsChartData: depositStats.byBank
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('error.fetchFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter, customStart, customEnd, user?.id]);

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const range = getDateRange();
      
      // Fetch fresh data for export to ensure we have everything if paginated in future
      let query = supabase
        .from('transfers')
        .select('created_at, beneficiary_name, amount_dop, status, operator, transfer_number, id')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (range) {
        query = query.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: t('stats.nothingToExport'), description: t('stats.nothingToExport') });
        return;
      }

      const headers = [t('common.date'), t('deposit.referenceNumber'), t('common.type'), t('deposit.amountDOP'), t('common.status'), t('deposit.bank')];
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          return [
            `"${new Date(row.created_at).toLocaleString()}"`,
            `"${getTransferCode(row)}"`,
            "Transfert",
            row.amount_dop,
            `"${row.status}"`,
            `"${row.operator || 'N/A'}"`
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `stats_agent_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: t('common.success'), description: t('stats.exportSuccess') });

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('common.error'), description: t('stats.exportError') });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('stats.title')} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] text-white p-4 sm:p-6 pb-20">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/agent/dashboard')}
                className="text-[#A0A0A0] hover:text-white hover:bg-[#1E1E1E]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{t('stats.title')}</h1>
                <p className="text-[#666] text-sm">{t('stats.description')}</p>
              </div>
            </div>

            <Button 
              onClick={handleExportCSV}
              disabled={downloading}
              className="bg-[#1E1E1E] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-white"
            >
              <Download className={`w-4 h-4 mr-2 ${downloading ? 'animate-bounce' : ''}`} />
              {downloading ? t('stats.exporting') : t('stats.exportCSV')}
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-[#151515] p-2 rounded-2xl border border-[#2A2A2A] flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 px-3 text-[#A0A0A0]">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">{t('stats.period')}:</span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {['today', 'week', 'month', 'year', 'all', 'custom'].map((f) => (
                <FilterButton 
                  key={f} 
                  label={t(`stats.${f}`)}
                  active={timeFilter === f} 
                  onClick={() => setTimeFilter(f)} 
                />
              ))}
            </div>

            {timeFilter === 'custom' && (
              <div className="flex items-center gap-2 ml-auto mt-2 sm:mt-0 bg-[#0B0B0B] p-1 rounded-lg border border-[#2A2A2A]">
                <Calendar className="w-4 h-4 text-[#A0A0A0] ml-2" />
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent border-none text-xs text-white focus:ring-0"
                />
                <span className="text-[#666]">-</span>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent border-none text-xs text-white focus:ring-0"
                />
              </div>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title={t('stats.transferVolume')}
              value={`RD$ ${stats.transfers.volumeDOP.toLocaleString()}`} 
              subValue={`${stats.transfers.validated} ${t('stats.validatedOn')} ${stats.transfers.total}`}
              icon={TrendingUp} 
              colorClass="text-[#D4AF37]" 
              delay={0}
            />
            <StatCard 
              title={t('stats.depositVolume')} 
              value={`RD$ ${stats.deposits.volumeDOP.toLocaleString()}`} 
              subValue={`${stats.deposits.validated} ${t('stats.validatedOn')} ${stats.deposits.total}`}
              icon={CreditCard} 
              colorClass="text-green-500" 
              delay={0.1}
            />
            <StatCard 
              title={t('stats.transferCount')}
              value={stats.transfers.validated} 
              subValue={`${stats.transfers.pending} ${t('stats.pending')}`}
              icon={Activity} 
              colorClass="text-blue-500" 
              delay={0.2}
            />
            <StatCard 
              title={t('stats.rejected')}
              value={stats.transfers.rejected} 
              subValue={t('stats.attentionRequired')}
              icon={DollarSign} 
              colorClass="text-red-500" 
              delay={0.3}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Line Chart: Volume Evolution */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-[#1E1E1E] border border-[#2A2A2A] p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold mb-6 text-white">{t('stats.evolutionVolume')}</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `RD$${val/1000}k`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="transfers" name={t('stats.transfers')} stroke="#D4AF37" strokeWidth={3} dot={{ fill: '#D4AF37', r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="deposits" name={t('stats.deposits')} stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Bar Chart: Deposit Breakdown */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-[#1E1E1E] border border-[#2A2A2A] p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold mb-6 text-white">{t('stats.depositBreakdown')}</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.depositsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="value" name={t('deposit.amount')} fill="#D4AF37" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
};

export default AgentStats;