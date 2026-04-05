import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Loader2, ChevronRight, Search, AlertTriangle, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoneyDOP } from '@/lib/formatMoney';

const normalizeOperator = (op) => {
  const s = String(op || '').toLowerCase().trim();

  // NatCash / Natcom
  if (s.includes('natcash') || s.includes('natcom')) return 'natcash';

  // MonCash / Digicel
  if (s.includes('moncash') || s.includes('digicel')) return 'moncash';

  return 'unknown';
};

const TransfersHistory = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('today'); 
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');

  // Period keys requested
  const periodKeys = ["all", "today", "7days", "30days", "1year", "custom"];
  const statusKeys = ["allStatus", "validated", "pending", "rejected", "cancelled"];

  useEffect(() => {
    if (!user) return;

    const fetchTransfers = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching transfers:', error);
      else setTransfers(data || []);

      setLoading(false);
    };

    fetchTransfers();

    // Realtime Listener
    const channel = supabase
      .channel('agent-transfers-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfers',
          filter: `agent_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransfers((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransfers((prev) => prev.map((x) => (x.id === payload.new.id ? payload.new : x)));
          } else if (payload.eventType === 'DELETE') {
            setTransfers((prev) => prev.filter((x) => x.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Function to map period keys to logic
  const filterByTime = (item) => {
    if (timeFilter === 'all') return true;

    const itemDate = new Date(item.created_at);
    const now = new Date();

    if (timeFilter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }

    if (timeFilter === '7days') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return itemDate >= weekAgo;
    }

    if (timeFilter === '30days') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return itemDate >= monthAgo;
    }

    if (timeFilter === '1year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      return itemDate >= yearAgo;
    }

    if (timeFilter === 'custom') {
      if (!customFrom && !customTo) return true;

      const from = customFrom ? new Date(customFrom) : null;
      const to = customTo ? new Date(customTo) : null;

      if (from && to) {
        to.setHours(23, 59, 59, 999);
        return itemDate >= from && itemDate <= to;
      }

      if (from) return itemDate >= from;
      if (to) {
        to.setHours(23, 59, 59, 999);
        return itemDate <= to;
      }
    }

    return true;
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();

    return (transfers || []).filter((item) => {
      // Search filter
      const name = (item.beneficiary_name || '').toLowerCase();
      const phone = String(item.beneficiary_phone || '');
      const matchesSearch = name.includes(s) || phone.includes(search);
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && statusFilter !== 'allStatus' && item.status !== statusFilter) return false;

      // Operator filter
      if (operatorFilter !== 'all') {
        const opGroup = normalizeOperator(item.operator);
        if (opGroup !== operatorFilter) return false;
      }

      // Time filter
      if (!filterByTime(item)) return false;

      return true;
    });
  }, [transfers, search, statusFilter, operatorFilter, timeFilter, customFrom, customTo]);

  const cancellationRequests = filtered.filter((x) => x.status === 'cancel_requested');
  const otherTransfers = filtered.filter((x) => x.status !== 'cancel_requested');

  const getStatusColor = (status) => {
    if (status === 'approved' || status === 'validated') return 'bg-green-500/20 text-green-500 border-green-500/30';
    if (status === 'rejected' || status === 'cancelled' || status === 'refusé')
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    if (status === 'cancel_requested') return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
  };

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

  const TransferCard = ({ item }) => {
    const opGroup = normalizeOperator(item.operator);
    const opLabel =
      opGroup === 'natcash'
        ? 'NatCash'
        : opGroup === 'moncash'
        ? 'MonCash'
        : item.operator || t('common.unknown');

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => navigate(`/agent/history/transfer/${item.id}`)}
        className="bg-[#1E1E1E] border border-[#2A2A2A] hover:border-[#D4AF37] rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between group mb-2"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">{item.beneficiary_name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getStatusColor(item.status)}`}>
              {t(`history.status.${item.status}`) || t(`status.${item.status}`) || item.status}
            </span>
          </div>

          <p className="text-sm text-[#A0A0A0]">
            {item.beneficiary_phone} • {opLabel} • {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-[#D4AF37]">{formatMoneyDOP(item.amount_dop)}</span>
          <ChevronRight className="w-5 h-5 text-[#444] group-hover:text-white" />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-[#A0A0A0] mb-3">
          <Calendar className="w-4 h-4" />
          <span>{t('history.period.label')}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodKeys.map(key => (
             <Button
                key={key}
                type="button"
                size="sm"
                variant={timeFilter === key ? 'default' : 'outline'}
                className={
                  timeFilter === key
                    ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                    : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'
                }
                onClick={() => setPreset(key)}
              >
                {t(`history.period.${key}`)}
             </Button>
          ))}
        </div>

        {timeFilter === 'custom' && (
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearCustomDates}
              className="text-[#A0A0A0] hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              {t('history.clear')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
          <Input
            placeholder={t('history.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1E1E1E] border-[#2A2A2A] text-white"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[160px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
            <SelectValue placeholder={t('history.status.label')} />
          </SelectTrigger>
          <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
            {statusKeys.map(key => (
               <SelectItem key={key} value={key === 'allStatus' ? 'all' : key}>
                 {t(`history.status.${key}`)}
               </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-full md:w-[170px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
            <SelectValue placeholder={t('history.operator')} />
          </SelectTrigger>
          <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
            <SelectItem value="all">{t('history.status.all')}</SelectItem>
            <SelectItem value="moncash">MonCash</SelectItem>
            <SelectItem value="natcash">NatCash</SelectItem>
            <SelectItem value="unknown">{t('common.unknown')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto animate-spin text-[#D4AF37]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[#666]">{t('history.noTransactions')}</div>
        ) : (
          <AnimatePresence>
            {cancellationRequests.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 space-y-2">
                <div className="flex items-center gap-2 text-orange-500 mb-2 px-1">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {t('history.cancelRequested')}
                  </h3>
                </div>
                {cancellationRequests.map((item) => (
                  <TransferCard key={item.id} item={item} />
                ))}
                <div className="border-b border-[#2A2A2A] my-4" />
              </motion.div>
            )}

            {otherTransfers.length > 0 && otherTransfers.map((item) => <TransferCard key={item.id} item={item} />)}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default TransfersHistory;