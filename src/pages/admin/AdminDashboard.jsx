import React, { useMemo, useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; 
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRegistrationRequestsNotifications } from "@/hooks/useRegistrationRequestsNotifications";
import {
  Users,
  UserPlus,
  CreditCard,
  Shield,
  LayoutDashboard,
  RefreshCw,
  Briefcase,
  FileText,
  ArrowRight,
  Power,
  BarChart3,
  MessageSquarePlus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatMoneyDOP, formatMoneyHTG } from "@/lib/formatMoney";

// Moved outside component to prevent re-declaration on render
const StatCard = ({ title, value, onClick, highlight = false, notificationCount = 0 }) => (
  <button
    onClick={onClick}
    className={[
      "text-left bg-[#1E1E1E] rounded-xl border transition-all relative overflow-hidden",
      "p-4 sm:p-5",
      "min-h-[92px]",
      highlight
        ? "border-[#D4AF37]/50 hover:border-[#D4AF37]"
        : "border-[#2A2A2A] hover:border-[#D4AF37]/50",
      "hover:bg-[#252525]",
      "focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30",
    ].join(" ")}
  >
    {notificationCount > 0 && (
       <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-1 ring-black/50 z-10">
          {notificationCount > 99 ? '99+' : notificationCount}
       </span>
    )}

    <p className="text-[#A0A0A0] text-xs sm:text-sm mb-1">{title}</p>
    <div className="flex items-end justify-between gap-3">
      <h3 className="text-2xl sm:text-3xl font-bold text-white">{value}</h3>
      <span className="text-[#D4AF37] opacity-80">
        <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  </button>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { unseenCount: pendingRegistrationsCount, refresh: refreshRegistrations } = useRegistrationRequestsNotifications();
  
  // Local state for strict real-time data
  const [stats, setStats] = useState({
    pendingDeposits: 0,
    totalTransfers: 0,
    activeUsers: 0,
    totalTeams: 0,
    pendingAdjustments: 0,
    pendingTransfers: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalTransactionsDisabled, setGlobalTransactionsDisabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // STRICT FETCH: No cache, direct DB queries
  const fetchRealtimeStats = useCallback(async () => {
    try {
      setRefreshing(true);
      if (import.meta.env.DEV) console.log("[AdminDashboard] Fetching STRICT real-time stats...");

      // Parallel requests for exact counts
      const [
        depositsRes,
        transfersRes,
        usersRes,
        teamsRes,
        adjustmentsRes,
        pendingTransfersRes
      ] = await Promise.all([
        // 1. Pending Deposits
        supabase
          .from("deposits")
          .select("*", { count: "exact", head: true })
          .in('statut', ['pending', 'en_attente']),
        
        // 2. Total Transfers (All time)
        supabase
          .from("transfers")
          .select("*", { count: "exact", head: true }),

        // 3. Active Users (Should be 1 after reset)
        supabase
          .from("users")
          .select("*", { count: "exact", head: true }),

        // 4. Teams (Should be 0 after reset)
        supabase
          .from("teams")
          .select("*", { count: "exact", head: true }),

        // 5. Pending Adjustments
        supabase
          .from("worker_adjustments")
          .select("*", { count: "exact", head: true })
          .in('statut', ['proposed', 'pending', 'proposé']),

        // 6. Pending Transfers
        supabase
          .from("transfers")
          .select("*", { count: "exact", head: true })
          .in('status', ['pending', 'en_attente', 'waiting', 'processing', 'in_progress'])
      ]);

      const newStats = {
        pendingDeposits: depositsRes.count || 0,
        totalTransfers: transfersRes.count || 0,
        activeUsers: usersRes.count || 0,
        totalTeams: teamsRes.count || 0,
        pendingAdjustments: adjustmentsRes.count || 0,
        pendingTransfers: pendingTransfersRes.count || 0
      };

      if (import.meta.env.DEV) console.log("[AdminDashboard] Stats received:", newStats);
      setStats(newStats);
      refreshRegistrations(); // Refresh registration count as well

    } catch (e) {
      console.error("[AdminDashboard] Error fetching stats:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshRegistrations]);

  // Fetch Global Transaction Settings
  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'transactions')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows" which is fine
      
      if (data) {
        setGlobalTransactionsDisabled(data.value?.global_disabled || false);
      } else {
        setGlobalTransactionsDisabled(false); // Default
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Toggle Global Transactions
  const handleToggleGlobalTransactions = async (checked) => {
    const newDisabledState = !checked; 

    try {
      setGlobalTransactionsDisabled(newDisabledState); 

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'transactions',
          value: { 
            global_disabled: newDisabledState, 
            message: "Transactions temporairement désactivées. Contactez l'admin." 
          },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: newDisabledState ? t("admin.dashboard.systemLocked") : t("admin.dashboard.systemActive"),
        description: newDisabledState 
          ? t("admin.dashboard.lockMessage")
          : t("admin.dashboard.unlockMessage"),
        className: newDisabledState ? "bg-red-600 text-white" : "bg-green-600 text-white"
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      setGlobalTransactionsDisabled(!newDisabledState); 
      toast({ variant: 'destructive', description: t("admin.dashboard.updateError") });
    }
  };

  useEffect(() => {
    fetchRealtimeStats();
    fetchSettings();

    // Aggressive subscription to force update on any relevant change
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, fetchRealtimeStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "transfers" }, fetchRealtimeStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, fetchRealtimeStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, fetchRealtimeStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "worker_adjustments" }, fetchRealtimeStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRealtimeStats, fetchSettings]);

  // Define actions with direct stats injected
  const actions = useMemo(
    () => [
      {
        label: t("navigation.deposits"),
        icon: CreditCard,
        path: "/admin/deposits-dashboard",
        color: "#10B981",
        badge: stats.pendingDeposits > 0 ? (stats.pendingDeposits > 99 ? '99+' : String(stats.pendingDeposits)) : null,
      },
      {
        label: "Demandes d'inscription",
        icon: MessageSquarePlus,
        path: "/admin/registration-requests",
        color: "#D4AF37",
        badge: pendingRegistrationsCount > 0 ? (pendingRegistrationsCount > 99 ? '99+' : String(pendingRegistrationsCount)) : null,
      },
      {
        label: t("navigation.createAccount"),
        icon: UserPlus,
        path: "/admin/create-account",
        color: "#EC4899",
      },
      {
        label: t("navigation.usersManager"),
        icon: Users,
        path: "/admin/users-manager",
        color: "#3B82F6",
      },
      {
        label: t("navigation.teams"),
        icon: Shield,
        path: "/admin/teams",
        color: "#8B5CF6",
      },
      {
        label: t("navigation.transactions"),
        icon: LayoutDashboard,
        path: "/admin/transactions",
        color: "#F59E0B",
        badge: stats.pendingTransfers > 0 ? (stats.pendingTransfers > 99 ? '99+' : String(stats.pendingTransfers)) : null,
      },
      {
        label: t("navigation.workerManagement"),
        icon: Briefcase,
        path: "/admin/worker-management",
        color: "#06B6D4",
      },
      {
        label: t("navigation.reassign"),
        icon: RefreshCw,
        path: "/admin/worker-reassignment",
        color: "#D4AF37",
      },
      {
        label: t("navigation.adjustments"),
        icon: FileText,
        path: "/admin/adjustments",
        color: "#8B5CF6",
        badge: stats.pendingAdjustments > 0 ? (stats.pendingAdjustments > 99 ? '99+' : String(stats.pendingAdjustments)) : null,
      },
      {
        label: "Stats",
        icon: BarChart3,
        path: "/admin/stats",
        color: "#22C55E",
      },
    ],
    [t, stats, pendingRegistrationsCount]
  );

  return (
    <>
      <Helmet>
        <title>{t("admin.dashboard.title")} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pt-[84px]">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
             <h1 className="text-2xl sm:text-3xl font-bold">{t("admin.dashboard.title")}</h1>
             
             <div className="flex items-center gap-3 bg-[#1E1E1E] p-3 rounded-lg border border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                   <Power className={`w-4 h-4 ${!globalTransactionsDisabled ? 'text-green-500' : 'text-red-500'}`} />
                   <span className="text-sm font-medium text-[#EAEAEA]">{t("admin.dashboard.globalTransactions")}</span>
                </div>
                {settingsLoading ? (
                   <div className="w-10 h-5 bg-[#2A2A2A] rounded-full animate-pulse" />
                ) : (
                   <Switch 
                      checked={!globalTransactionsDisabled} 
                      onCheckedChange={handleToggleGlobalTransactions}
                      className={`data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600`}
                   />
                )}
             </div>
          </div>

          {stats.pendingDeposits > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-xl p-4 mb-6 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#D4AF37] rounded-full text-black">
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="font-medium text-[#EAEAEA] text-sm sm:text-base">
                  {t("admin.dashboard.alert.pendingDeposits", {
                    count: stats.pendingDeposits,
                  })}
                </p>
              </div>

              <Button
                onClick={() => navigate("/admin/deposits-dashboard")}
                className="bg-[#D4AF37] text-black hover:bg-[#B8941F]"
              >
                {t("admin.dashboard.review")}
              </Button>
            </motion.div>
          )}

          {pendingRegistrationsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-500/10 border border-blue-500/40 rounded-xl p-4 mb-6 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-full text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <p className="font-medium text-[#EAEAEA] text-sm sm:text-base">
                  {pendingRegistrationsCount} nouvelle(s) demande(s) d'inscription
                </p>
              </div>

              <Button
                onClick={() => navigate("/admin/registration-requests")}
                className="bg-blue-600 text-white hover:bg-blue-700 border-none"
              >
                Voir les demandes
              </Button>
            </motion.div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard
              title={t("admin.dashboard.stats.pendingDeposits")}
              value={loading ? "..." : stats.pendingDeposits}
              highlight={stats.pendingDeposits > 0}
              notificationCount={stats.pendingDeposits} 
              onClick={() => navigate("/admin/deposits-dashboard?status=pending")}
            />
            <StatCard
              title={t("admin.dashboard.stats.totalTransfers")}
              value={loading ? "..." : stats.totalTransfers}
              onClick={() => navigate("/admin/transactions?type=transfer")}
            />
            <StatCard
              title={t("admin.dashboard.stats.activeUsers")}
              value={loading ? "..." : stats.activeUsers}
              onClick={() => navigate("/admin/users-manager")}
            />
            <StatCard
              title={t("admin.dashboard.stats.totalTeams")}
              value={loading ? "..." : stats.totalTeams}
              onClick={() => navigate("/admin/teams")}
            />
          </div>

          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg sm:text-xl font-bold">
              {t("admin.dashboard.quickActions")}
            </h2>

            <Button
              onClick={fetchRealtimeStats}
              variant="ghost"
              className="text-white/80 hover:bg-white/5 border border-white/10"
              disabled={refreshing}
              title={t("common.refresh")}
            >
              <RefreshCw
                className={["w-4 h-4", refreshing ? "animate-spin" : ""].join(
                  " "
                )}
              />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(action.path)}
                className="relative bg-[#1E1E1E] hover:bg-[#252525] border border-[#2A2A2A] hover:border-[#D4AF37]/60 p-4 sm:p-5 rounded-xl flex flex-col items-center gap-3 transition-all group min-h-[128px] justify-center"
              >
                {action.badge && (
                  <span className="absolute top-2 right-2 rounded-full bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center shadow-sm z-10 ring-1 ring-black/50">
                    {action.badge}
                  </span>
                )}

                <div className="p-3 rounded-full bg-[#0B0B0B] group-hover:scale-110 transition-transform border border-white/10">
                  <action.icon
                    className="w-6 h-6"
                    style={{ color: action.color }}
                  />
                </div>

                <span className="font-medium text-xs sm:text-sm text-[#EAEAEA] text-center leading-snug">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;