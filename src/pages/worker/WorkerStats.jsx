import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  PieChart as PieIcon,
  TrendingUp, 
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyHTG } from '@/lib/formatMoney';

// --- Helper Components ---

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-[#151515] border border-[#222] p-6 rounded-2xl relative overflow-hidden group hover:border-[#333] transition-colors"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
      <Icon className="w-16 h-16" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-[#888] text-sm font-medium">{title}</p>
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      {subValue && <p className="text-xs text-[#555]">{subValue}</p>}
    </div>
  </motion.div>
);

const FilterButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all",
      active 
        ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20" 
        : "bg-[#151515] text-[#888] hover:bg-[#222] hover:text-white border border-[#222]"
    )}
  >
    {label}
  </button>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#151515] border border-[#333] p-3 rounded-xl shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[#888]">{entry.name}:</span>
            <span className="text-white font-mono">{formatMoney(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Component ---

const WorkerStats = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  const [timeFilter, setTimeFilter] = useState('day'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const [stats, setStats] = useState({
    totalCount: 0,
    validatedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    totalHTG: 0,
    validationRate: 0,
    lineChartData: [],
    pieChartData: []
  });

  const periodKeys = ['day', 'week', 'month', 'year', 'all', 'custom'];
  const statusKeys = ['all', 'validated', 'pending', 'rejected'];
  const methodKeys = ['all', 'natcash', 'moncash'];

  // Normalize Operator Name
  const normalizeMethod = (op) => {
    const s = String(op || '').toLowerCase();
    if (s.includes('natcash') || s.includes('natcom')) return 'Natcash';
    if (s.includes('moncash') || s.includes('digicel')) return 'Moncash';
    return 'Autre';
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (timeFilter) {
      case 'day':
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
        start.setDate(start.getDate() - 7);
    }
    return { start, end };
  };

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const range = getDateRange();
      let query = supabase
        .from('transfers')
        .select('*')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: true });

      if (range) {
        query = query.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      const transfers = data || [];

      // Filter in memory for complex text logic (status/method) if DB filters get messy
      const filtered = transfers.filter(t => {
        const status = (t.status || '').toLowerCase();
        const method = normalizeMethod(t.operator);

        // Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'validated' && !['validated', 'completed', 'approved'].includes(status)) return false;
          if (statusFilter === 'pending' && !['pending', 'processing', 'en_attente'].includes(status)) return false;
          if (statusFilter === 'rejected' && !['rejected', 'failed', 'cancelled'].includes(status)) return false;
        }

        // Method Filter
        if (methodFilter !== 'all') {
          if (methodFilter === 'natcash' && method !== 'Natcash') return false;
          if (methodFilter === 'moncash' && method !== 'Moncash') return false;
        }

        return true;
      });

      // Compute Aggregates
      const agg = filtered.reduce((acc, curr) => {
        const amt = Number(curr.montant_htg || curr.total_htg || 0);
        const status = (curr.status || '').toLowerCase();
        const method = normalizeMethod(curr.operator);

        acc.totalCount++;
        acc.totalHTG += amt;

        if (['validated', 'completed', 'approved'].includes(status)) acc.validatedCount++;
        else if (['rejected', 'failed', 'cancelled'].includes(status)) acc.rejectedCount++;
        else acc.pendingCount++;

        // Pie Data
        if (!acc.methods[method]) acc.methods[method] = { count: 0, amount: 0 };
        acc.methods[method].count++;
        acc.methods[method].amount += amt;

        // Line Data
        const date = new Date(curr.created_at).toLocaleDateString();
        if (!acc.timeline[date]) acc.timeline[date] = 0;
        acc.timeline[date] += amt;

        return acc;
      }, { totalCount: 0, validatedCount: 0, pendingCount: 0, rejectedCount: 0, totalHTG: 0, methods: {}, timeline: {} });

      const validationRate = agg.totalCount > 0 ? ((agg.validatedCount / agg.totalCount) * 100).toFixed(1) : 0;

      // Format Chart Data
      const pieChartData = Object.entries(agg.methods).map(([name, val]) => ({ name, value: val.amount, count: val.count }));
      const lineChartData = Object.entries(agg.timeline).map(([date, val]) => ({ date, value: val })).sort((a,b) => new Date(a.date) - new Date(b.date));

      setStats({
        ...agg,
        validationRate,
        pieChartData,
        lineChartData
      });

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('common.error'), description: t('stats.loading') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter, customStart, customEnd, statusFilter, methodFilter, user?.id]);

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const range = getDateRange();
      // Use logic similar to fetchData but return CSV
      let query = supabase
        .from('transfers')
        .select('created_at, beneficiary_name, montant_htg, status, operator')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false });

      if (range) query = query.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString());

      const { data } = await query;
      if (!data || data.length === 0) {
        toast({ title: t('common.noData'), description: t('stats.nothingToExport') });
        return;
      }

      const headers = [t('history.date'), t('transfer.beneficiaryName'), t('history.amount'), t('common.status'), t('history.method')];
      const rows = data.map(r => [
        `"${new Date(r.created_at).toLocaleString()}"`,
        `"${r.beneficiary_name}"`,
        r.montant_htg,
        `"${r.status}"`,
        `"${normalizeMethod(r.operator)}"`
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `worker_stats_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: t('common.success'), description: t('stats.exportSuccess') });
    } catch (e) {
      console.error(e);
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

      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/worker/dashboard')}
                className="text-[#888] hover:text-white hover:bg-[#151515]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{t('stats.title')}</h1>
                <p className="text-[#666] text-sm">{t('stats.subtitle')}</p>
              </div>
            </div>

            <Button 
              onClick={handleExportCSV}
              disabled={downloading}
              className="bg-[#151515] border border-[#222] hover:bg-[#222] text-white"
            >
              <Download className={`w-4 h-4 mr-2 ${downloading ? 'animate-bounce' : ''}`} />
              {t('stats.exportCSV')}
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="bg-[#151515] p-4 rounded-2xl border border-[#222] space-y-4">
            <div className="flex flex-wrap gap-6 items-center">
              
              {/* Time Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#888] text-xs uppercase tracking-wider font-semibold">
                  <Calendar className="w-3 h-3" /> {t('stats.period')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {periodKeys.map(f => (
                    <FilterButton key={f} label={t(`stats.${f}`)} active={timeFilter === f} onClick={() => setTimeFilter(f)} />
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#888] text-xs uppercase tracking-wider font-semibold">
                  <CheckCircle className="w-3 h-3" /> {t('stats.status')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {statusKeys.map(s => (
                    <FilterButton key={s} label={t(`stats.${s}`)} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                  ))}
                </div>
              </div>

              {/* Method Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#888] text-xs uppercase tracking-wider font-semibold">
                  <PieIcon className="w-3 h-3" /> {t('stats.method')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {methodKeys.map(m => (
                    <FilterButton key={m} label={t(`stats.${m}`)} active={methodFilter === m} onClick={() => setMethodFilter(m)} />
                  ))}
                </div>
              </div>
            </div>

            {timeFilter === 'custom' && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#222]">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-[#0A0A0A] border border-[#333] rounded px-2 py-1 text-sm text-white" />
                <span className="text-[#666]">-</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-[#0A0A0A] border border-[#333] rounded px-2 py-1 text-sm text-white" />
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t('stats.totalVolume')} value={formatMoneyHTG(stats.totalHTG)} subValue={t('stats.totalVolumeSub')} icon={TrendingUp} colorClass="text-[#8B5CF6]" delay={0} />
            <StatCard title={t('stats.totalTransfers')} value={stats.totalCount} subValue={`${stats.validatedCount} ${t('stats.totalTransfersSub')}`} icon={Clock} colorClass="text-[#10B981]" delay={0.1} />
            <StatCard title={t('stats.successRate')} value={`${stats.validationRate}%`} subValue={t('stats.successRateSub')} icon={CheckCircle} colorClass="text-[#F59E0B]" delay={0.2} />
            <StatCard title={t('stats.rejectedCount')} value={stats.rejectedCount} subValue={t('stats.rejectedCountSub')} icon={PieIcon} colorClass="text-[#EF4444]" delay={0.3} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Volume Evolution */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-[#151515] border border-[#222] p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6 text-white">{t('stats.volumeEvolution')}</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" name="Volume" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Methods Breakdown */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-[#151515] border border-[#222] p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6 text-white">{t('stats.methodDistribution')}</h3>
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {stats.pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Natcash' ? '#3B82F6' : entry.name === 'Moncash' ? '#EF4444' : '#888'} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-2xl font-bold text-white">{stats.totalCount}</p>
                  <p className="text-xs text-[#666]">{t('stats.all')}</p>
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </>
  );
};

export default WorkerStats;