import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkerNotifications } from "@/hooks/useWorkerNotifications";
import { useKpiNotifications } from "@/hooks/useKpiNotifications"; 
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  Wallet,
  FileText,
  BarChart3,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  computeEquivalentFromHTG,
  formatExchangeRateInfo,
} from "@/lib/currencyUtils";
import NotificationBadge from "@/components/NotificationBadge";
import { formatMoney, formatMoneyHTG } from "@/lib/formatMoney";
import { getTransferCode } from "@/lib/codeUtils";

const BRAND = "#D6B15E";

const FilterButton = ({ label, value, currentFilter, onFilterChange }) => (
  <button
    onClick={() => onFilterChange(value)}
    className={cn(
      "px-3 py-1 text-xs sm:text-sm rounded-full transition-colors font-medium",
      currentFilter === value
        ? "bg-[var(--brand)] text-black"
        : "text-white/50 hover:bg-white/5 hover:text-white"
    )}
  >
    {label}
  </button>
);

const StatusCard = ({
  title,
  count,
  description,
  icon: Icon,
  accent = "#333",
  valueClass = "text-white",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#0f1012] rounded-2xl border border-[#222] overflow-hidden shadow-lg shadow-black/20"
  >
    <div style={{ backgroundColor: accent }} className="h-[2px] w-full" />
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white/90 font-semibold text-sm">{title}</h3>
          <p className="text-white/40 text-xs mt-1">{description}</p>
        </div>
        {Icon && (
          <div className="bg-white/5 border border-white/5 rounded-xl p-2">
            <Icon size={18} color={accent} />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className={cn("text-3xl font-bold tracking-tight", valueClass)}>
          {count}
        </span>
        <span
          className="text-[11px] px-2 py-1 rounded-full border"
          style={{
            borderColor: accent,
            color: accent,
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          {title}
        </span>
      </div>
    </div>
  </motion.div>
);

const WorkerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [timeFilter, setTimeFilter] = useState("today"); 
  const [exchangeInfo, setExchangeInfo] = useState({ type: null, rate: null });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [stats, setStats] = useState({
    volume: 0,
    successRate: 0,
    totalCount: 0,
    completedCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    totalCumulativeHtg: 0,
    dailyRecord: 0,
    monthlyCompleted: 0,
  });

  const {
    pendingTransfers,
    pendingRegulations,
    refresh: refreshNotifications,
  } = useWorkerNotifications();

  const pad2 = (n) => String(n).padStart(2, "0");

  const toISOStart = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}T00:00:00.000Z`;
  const toISOEnd = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}T23:59:59.999Z`;

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (timeFilter === "day")
      return { startISO: toISOStart(start), endISO: toISOEnd(end) };

    if (timeFilter === "week") {
      start.setDate(start.getDate() - 6);
      return { startISO: toISOStart(start), endISO: toISOEnd(end) };
    }

    if (timeFilter === "month") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startISO: toISOStart(s), endISO: toISOEnd(end) };
    }

    if (timeFilter === "year") {
      const s = new Date(now.getFullYear(), 0, 1);
      return { startISO: toISOStart(s), endISO: toISOEnd(end) };
    }

    if (timeFilter === "custom") {
      if (!customStart || !customEnd) return { startISO: null, endISO: null };
      const s = new Date(`${customStart}T00:00:00`);
      const e = new Date(`${customEnd}T00:00:00`);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()))
        return { startISO: null, endISO: null };
      if (s > e) return { startISO: null, endISO: null };
      return { startISO: toISOStart(s), endISO: toISOEnd(e) };
    }

    return { startISO: null, endISO: null };
  };

  const computeStatsFromTransfers = (transfers) => {
    const arr = Array.isArray(transfers) ? transfers : [];
    const totalCount = arr.length;

    const statusStr = (v) => String(v ?? "").toLowerCase();

    const isCompleted = (s) =>
      [
        "completed",
        "validated",
        "approved",
        "success",
        "done",
        "fulfilled",
        "delivered",
        "confirmé",
        "valide",
        "validé",
      ].some((k) => s.includes(k));

    const isPending = (s) =>
      [
        "pending",
        "en attente",
        "waiting",
        "processing",
        "proposed",
        "proposé",
        "in_progress",
        "in progress",
      ].some((k) => s.includes(k));

    const isCancelled = (s) =>
      [
        "cancel",
        "rejected",
        "refused",
        "failed",
        "annulé",
        "annule",
        "refusé",
        "refuse",
      ].some((k) => s.includes(k));

    let completedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    let volume = 0;
    let totalCumulativeHtg = 0;

    for (const tr of arr) {
      const s = statusStr(tr.status);

      if (isCompleted(s)) completedCount += 1;
      else if (isPending(s)) pendingCount += 1;
      else if (isCancelled(s)) cancelledCount += 1;

      const amt =
        Number(
          tr.total_htg ??
            tr.amount_htg ??
            tr.montant_htg ??
            tr.amount ??
            tr.montant ??
            0
        ) || 0;

      volume += amt;
      totalCumulativeHtg += amt;
    }

    const successRate =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      volume,
      successRate,
      totalCount,
      completedCount,
      pendingCount,
      cancelledCount,
      totalCumulativeHtg,
      dailyRecord: 0,
      monthlyCompleted: 0,
    };
  };

  const fetchTransfersForRange = async ({ startISO, endISO }) => {
    if (!user?.id) return [];

    let q = supabase
      .from("transfers")
      .select("*")
      .eq("worker_id", user.id)
      .order("created_at", { ascending: false });

    if (startISO) q = q.gte("created_at", startISO);
    if (endISO) q = q.lte("created_at", endISO);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    refreshNotifications(); 

    try {
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance, balance_htg")
        .eq("user_id", user.id)
        .single();

      if (!walletError && wallet) {
        const rawBalance = wallet.balance_htg ?? wallet.balance ?? 0;
        setBalance(Number(rawBalance));
      }

      const { data: userData } = await supabase
        .from("users")
        .select("taux_change, exchange_rate, exchange_type")
        .eq("id", user.id)
        .single();

      if (userData) {
        const rate = userData.exchange_rate || userData.taux_change || 0;
        setExchangeInfo({
          rate: rate,
          type: userData.exchange_type || null,
        });
      }

      const rangeLocal = getDateRange();

      try {
        const periodForFn = timeFilter === "year" ? "all" : timeFilter;

        const { data: statsData, error: statsError } =
          await supabase.functions.invoke("get-worker-stats", {
            body: {
              worker_id: user.id,
              period: periodForFn,
              start_date: rangeLocal.startISO,
              end_date: rangeLocal.endISO,
            },
          });

        if (!statsError && statsData) {
          setStats({
            volume: statsData.today_volume || statsData.volume || 0,
            successRate: statsData.success_rate || 0,
            totalCount: statsData.total_transfers || 0,
            completedCount: statsData.completed_count || 0,
            pendingCount: statsData.pending_count || 0,
            cancelledCount: statsData.cancelled_count || 0,
            totalCumulativeHtg: statsData.total_htg || 0,
            dailyRecord: statsData.daily_record || 0,
            monthlyCompleted: statsData.monthly_count || 0,
          });
          return;
        }
      } catch (err) {
      }

      const transfers = await fetchTransfersForRange(rangeLocal);
      setStats(computeStatsFromTransfers(transfers));
    } catch (error) {
      if (import.meta.env.DEV) console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchData();

    const channel = supabase
      .channel(`worker-dash-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newBal = payload.new.balance_htg ?? payload.new.balance ?? 0;
            setBalance(Number(newBal));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, timeFilter, customStart, customEnd]);

  const equivalence = useMemo(() => {
    const rate = Number(exchangeInfo.rate);
    if (rate > 0 && exchangeInfo.type)
      return computeEquivalentFromHTG(balance, rate);
    return null;
  }, [balance, exchangeInfo]);

  return (
    <>
      <Helmet>
        <title>
          {t("dashboard.title") + " | VS XPRESS"}
        </title>
      </Helmet>

      <div
        style={{ "--brand": BRAND }}
        className="min-h-screen bg-[#0A0A0A] p-4 sm:p-6 pb-20 font-sans text-white"
      >
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="bg-[#0f1012] rounded-2xl p-6 border border-[#222] relative shadow-lg shadow-black/30 overflow-hidden">
            <div className="absolute -right-8 -top-8 opacity-[0.08] rotate-12">
              <Wallet size={160} />
            </div>

            <div className="flex justify-between items-start relative">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[#D6B15E] text-sm font-medium">
                    {t("dashboard.worker.balanceHtg")}
                  </h2>

                  {!!exchangeInfo.type && (
                    <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/70">
                      {exchangeInfo.type}
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <div
                    className={cn(
                      "text-4xl sm:text-5xl font-bold tracking-tight transition-colors duration-300",
                      Number(balance) < 0 ? "text-red-500" : "text-white"
                    )}
                  >
                    {formatMoneyHTG(balance)}
                  </div>

                  {equivalence !== null && (
                    <div className="flex flex-col mt-1">
                      <div className="text-lg font-medium text-white/50 flex items-center gap-1">
                        <span>≈</span>
                        <span>
                          {formatMoney(equivalence)} {exchangeInfo.type}
                        </span>
                      </div>
                      <span className="text-xs text-[#666]">
                        {formatExchangeRateInfo(
                          exchangeInfo.type,
                          exchangeInfo.rate
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchData}
                  className="rounded-full hover:bg-white/5 text-white/50 hover:text-white"
                >
                  <RefreshCw
                    className={cn("h-5 w-5", loading && "animate-spin")}
                  />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 relative">
              <Button
                onClick={() => navigate("/worker/transfers")}
                className="bg-[var(--brand)] hover:opacity-90 text-black border-none rounded-xl px-6 font-semibold h-10 relative"
              >
                <NotificationBadge count={pendingTransfers} />
                {t("dashboard.worker.pendingTransfers")}
              </Button>

              <Button
                onClick={() => navigate("/worker/transfers?filter=all")}
                className="bg-transparent hover:bg-white/5 text-white border border-white/15 rounded-xl px-6 font-medium h-10"
              >
                {t("dashboard.worker.viewHistory")}
              </Button>

              <Button
                onClick={() => navigate("/worker/adjustments")}
                className="bg-transparent hover:bg-white/5 text-white border border-white/15 rounded-xl px-6 font-medium h-10 relative"
              >
                <NotificationBadge count={pendingRegulations} />
                <FileText className="w-4 h-4 mr-2" />
                {t("dashboard.worker.adjustments")}
              </Button>
            </div>
          </div>

          {/* New Stats Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/worker/stats")}
            className="w-full bg-[#0f1012] hover:bg-[#151515] border border-[#222] rounded-2xl p-6 flex items-center justify-between group transition-all shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#8B5CF6]/10 p-3 rounded-xl">
                <BarChart3 className="w-8 h-8 text-[#8B5CF6]" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white group-hover:text-[#8B5CF6] transition-colors">{t('stats.title')}</h3>
                <p className="text-[#666] text-sm">{t('stats.subtitle')}</p>
              </div>
            </div>
            <div className="bg-[#1a1a1a] p-2 rounded-full group-hover:bg-[#252525] transition-colors">
              <ChevronRight className="w-5 h-5 text-[#888] group-hover:text-white" />
            </div>
          </motion.button>

          <div className="bg-[#0f1012] rounded-2xl p-6 border border-[#222]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-white/70">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold uppercase tracking-wider">
                    {t("dashboard.worker.transfersTitle")}
                  </h3>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="flex flex-wrap gap-1 bg-[#151515] p-1 rounded-full border border-[#222] w-full sm:w-auto">
                  <FilterButton
                    label={t('stats.day')}
                    value="day"
                    currentFilter={timeFilter}
                    onFilterChange={setTimeFilter}
                  />
                  <FilterButton
                    label={t('stats.week')}
                    value="week"
                    currentFilter={timeFilter}
                    onFilterChange={setTimeFilter}
                  />
                  <FilterButton
                    label={t('stats.month')}
                    value="month"
                    currentFilter={timeFilter}
                    onFilterChange={setTimeFilter}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
              <div>
                <p className="text-white/50 text-xs mb-1">
                  {t("dashboard.worker.volume")} (HTG)
                </p>
                <div className="text-3xl font-bold text-white">
                  {formatMoneyHTG(stats.volume)}
                </div>
              </div>
              <div className="md:text-right">
                <p className="text-white/50 text-xs mb-1">
                  {t("dashboard.worker.successRate")}
                </p>
                <div className="text-3xl font-bold text-[var(--brand)]">
                  {stats.successRate}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              title={t("status.approved")}
              count={stats.completedCount}
              description={t("status.approved_desc")}
              icon={CheckCircle}
              accent="#10B981"
              valueClass="text-[#10B981]"
            />
            <StatusCard
              title={t("status.pending")}
              count={stats.pendingCount}
              description={t("status.pending_desc")}
              icon={Clock}
              accent="#3B82F6"
              valueClass="text-[#3B82F6]"
            />
            <StatusCard
              title={t("status.rejected")}
              count={stats.cancelledCount}
              description={t("status.rejected_desc")}
              icon={X}
              accent="#EF4444"
              valueClass="text-[#EF4444]"
            />
          </div>

        </div>
      </div>
    </>
  );
};

export default WorkerDashboard;