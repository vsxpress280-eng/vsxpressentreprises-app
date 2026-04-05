// src/pages/agent/AgentDashboard.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useKpiNotifications } from "@/hooks/useKpiNotifications";
import { formatMoney, formatMoneyDOP, formatMoneyHTG } from "@/lib/formatMoney";
import {
  Send,
  PlusCircle,
  Clock,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { getTransferCode } from '@/lib/codeUtils';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { balanceHtg, balanceDop, creditLimit, refreshWallet, loading: walletLoading } = useWallet();
  const { agentPendingDepositsCount, agentPendingTransfersCount } = useKpiNotifications();

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [mainExchangeRate, setMainExchangeRate] = useState(13.5);
  const [loadingData, setLoadingData] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingData(true);

    try {
      const [userRes, transactionsRes] = await Promise.all([
        supabase
          .from("users")
          .select("taux_change, exchange_rate")
          .eq("id", user.id)
          .single(),
        supabase
          .from("transfers")
          .select("*")
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (userRes?.data) {
        const rateRaw = Number(userRes.data.exchange_rate) || Number(userRes.data.taux_change) || 13.5;
        const validatedRate = rateRaw > 0 && Number.isFinite(rateRaw) ? rateRaw : 13.5;
        setMainExchangeRate(validatedRate);
      }

      if (transactionsRes?.data) {
        setRecentTransactions(transactionsRes.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
    if (typeof refreshWallet === "function") refreshWallet();
  }, [fetchDashboardData, refreshWallet]);

  // ✅ SOLDE DOP (fallback: si balance_dop == 0 mais balance_htg > 0, on calcule RD$ = HTG / taux)
  const displayBalanceDOP = useMemo(() => {
    const dop = Number(balanceDop || 0);
    const htg = Number(balanceHtg || 0);
    const rate = Number(mainExchangeRate || 0);

    if (Number.isFinite(dop) && dop !== 0) return dop;

    if (rate > 0 && Number.isFinite(htg) && htg !== 0) {
      return htg / rate;
    }

    return 0;
  }, [balanceDop, balanceHtg, mainExchangeRate]);

  // ✅ CREDIT en RD$ (credit_limit stocké en DOP)
  const displayCreditDOP = useMemo(() => {
    return Number(creditLimit || 0);
  }, [creditLimit]);

  // ✅ Équivalent HTG (fallback: si balance_htg == 0 mais balance_dop > 0)
  const displayEquivalentHTG = useMemo(() => {
    const htg = Number(balanceHtg || 0);
    const rate = Number(mainExchangeRate || 0);

    if (Number.isFinite(htg) && htg !== 0) return htg;

    if (rate > 0) return displayBalanceDOP * rate;

    return 0;
  }, [balanceHtg, mainExchangeRate, displayBalanceDOP]);

  const displayAvailableDOP = displayBalanceDOP + displayCreditDOP;
  const isNegative = displayBalanceDOP < 0;

  const actions = [
    {
      label: t("dashboard.newTransfer"),
      icon: Send,
      path: "/agent/create-transfer",
      color: "#D4AF37",
    },
    {
      label: t("dashboard.makeDeposit"),
      icon: PlusCircle,
      path: "/agent/deposit",
      color: "#10B981",
    },
    {
      label: t("dashboard.operationHistory"),
      icon: Clock,
      path: "/agent/history",
      color: "#3B82F6",
      badge:
        (agentPendingDepositsCount + agentPendingTransfersCount) > 0
          ? agentPendingDepositsCount + agentPendingTransfersCount
          : null,
    },
    {
      label: t("dashboard.activityStats"),
      icon: BarChart3,
      path: "/agent/stats",
      color: "#8B5CF6",
    },
  ];

  const mapStatusKey = (raw) => {
    const s = String(raw || "").toLowerCase();
    if (["pending", "en_attente", "processing", "in_progress"].includes(s)) return "pending";
    if (["validated", "completed", "approved", "accepted", "success"].includes(s)) return "approved";
    if (["rejected", "refused", "cancelled", "canceled", "failed"].includes(s)) return "rejected";
    return "pending";
  };

  const statusBadgeClass = (key) => {
    if (key === "approved") return "bg-green-500/20 text-green-400";
    if (key === "rejected") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-300";
  };

  const statusIcon = (key) => {
    if (key === "approved") return <TrendingUp className="w-5 h-5" />;
    if (key === "rejected") return <TrendingDown className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  return (
    <>
      <Helmet>
        <title>{t("dashboard.title")} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 mb-6"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("dashboard.title")}</h1>
              <p className="text-[#A0A0A0] text-sm mt-1">{t("dashboard.subtitle")}</p>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (typeof refreshWallet === "function") refreshWallet();
                fetchDashboardData();
              }}
              className="border-[#2A2A2A] bg-transparent hover:bg-[#1E1E1E]"
              title={t("dashboard.refresh")}
              disabled={loadingData || walletLoading}
            >
              <RefreshCw
                className={`w-4 h-4 text-[#A0A0A0] ${(loadingData || walletLoading) ? "animate-spin" : ""}`}
              />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1E1E1E] rounded-2xl p-5 sm:p-6 mb-6 border border-[#2A2A2A] shadow-xl"
          >
            <div className="relative">
              <p className="text-[#A0A0A0] text-sm mb-2">{t("dashboard.availableBalance")}</p>

              <div className="mb-4">
                <h2
                  className={`text-4xl sm:text-5xl font-bold leading-none ${
                    isNegative ? "text-red-400" : "text-white"
                  }`}
                >
                  {formatMoneyDOP(displayBalanceDOP)}
                </h2>

                <div className="mt-2">
                  <p className="text-[#888] text-base">≈ {formatMoneyHTG(displayEquivalentHTG)}</p>
                  <p className="text-xs text-[#666] mt-0.5">
                    1 DOP = {Number(mainExchangeRate || 0).toFixed(2)} HTG
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl p-3">
                  <p className="text-xs text-[#A0A0A0] mb-1">{t("dashboard.credit")}</p>
                  <p className="text-white font-semibold">{formatMoneyDOP(displayCreditDOP)}</p>
                </div>

                <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl p-3">
                  <p className="text-xs text-[#A0A0A0] mb-1">{t("dashboard.available")}</p>
                  <p className="text-white font-semibold">{formatMoneyDOP(displayAvailableDOP)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {actions.map((action, index) => (
              <motion.button
                key={action.path}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => navigate(action.path)}
                className="relative bg-[#1E1E1E] hover:bg-[#252525] border border-[#2A2A2A] hover:border-[#D4AF37] p-6 rounded-2xl flex flex-col items-center gap-3 transition-all group min-h-[140px] justify-center"
              >
                {action.badge > 0 && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-1 ring-black/50 z-10">
                    {action.badge > 99 ? "99+" : action.badge}
                  </span>
                )}

                <div className="p-4 rounded-full bg-[#0B0B0B] group-hover:scale-110 transition-transform">
                  <action.icon className="w-7 h-7" style={{ color: action.color }} />
                </div>
                <span className="font-medium text-sm text-[#EAEAEA] text-center">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg sm:text-xl font-bold">{t("dashboard.recentTransfers")}</h3>

              <Button variant="link" className="text-[#D4AF37] px-0 hover:underline" onClick={() => navigate("/agent/history")}>
                {t("common.viewAll")}
              </Button>
            </div>

            <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden mb-6">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => {
                  const key = mapStatusKey(tx.status);
                  const code = getTransferCode(tx);
                  
                  return (
                    <div
                      key={tx.id}
                      onClick={() => navigate(`/agent/history/transfer/${tx.id}`)}
                      className="p-4 border-b border-[#2A2A2A] last:border-0 flex justify-between items-center hover:bg-[#252525] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl ${
                            key === "approved"
                              ? "bg-green-500/10 text-green-400"
                              : key === "rejected"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-300"
                          }`}
                        >
                          {statusIcon(key)}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-[#D4AF37] font-mono mb-0.5">{code}</p>
                          <p className="font-medium text-white truncate group-hover:text-[#D4AF37] transition-colors">
                            {tx.beneficiary_name || "—"}
                          </p>
                          <p className="text-xs text-[#A0A0A0]">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-white">
                          {formatMoneyDOP(tx.amount_dop)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(key)}`}>
                          {t(`status.${key}`, key)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-[#A0A0A0]">{t("common.noData")}</div>
              )}
            </div>

            {/* Section Notifications récentes */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">{t("dashboard.recentNotifications")}</h3>
              <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-8 min-h-[120px] flex items-center justify-center">
                <p className="text-[#A0A0A0] text-center">{t("dashboard.noNotifications")}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default AgentDashboard;