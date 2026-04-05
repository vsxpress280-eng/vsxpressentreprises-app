import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Loader2, Eye, X, Calendar, CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoneyDOP } from "@/lib/formatMoney";

const DepositsHistory = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("today"); 
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Details Modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  const periodKeys = ["all", "today", "7days", "30days", "1year", "custom"];
  const statusKeys = ["allStatus", "pending", "approved", "validated", "rejected"];

  const getRejectReason = (row) => {
    return (
      row?.rejection_reason ||
      row?.reject_reason ||
      row?.rejected_reason ||
      row?.reason ||
      row?.motif ||
      row?.motif_refus ||
      ""
    );
  };

  useEffect(() => {
    if (!user) return;

    const fetchDeposits = async () => {
      setLoading(true);

      try {
        let query = supabase
          .from("deposits")
          .select("*")
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        setDeposits(data || []);
      } catch (e) {
        console.error("fetchDeposits error:", e);
        setDeposits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();

    const sub = supabase
      .channel("agent-deposits-history")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposits",
          filter: `agent_id=eq.${user.id}`,
        },
        () => fetchDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  const getStatusConfig = (status) => {
    const s = (status || "").toLowerCase();
    if (["validated", "approved"].includes(s)) {
      return { 
        label: t("history.status.validated"), 
        color: "text-green-500 bg-green-500/10 border-green-500/20", 
        icon: CheckCircle2 
      };
    }
    if (["rejected", "refused"].includes(s)) {
      return { 
        label: t("history.status.rejected"), 
        color: "text-red-500 bg-red-500/10 border-red-500/20", 
        icon: AlertCircle 
      };
    }
    return { 
      label: t("history.status.pending"), 
      color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", 
      icon: Clock 
    };
  };

  const filterByTime = (item) => {
    if (timeFilter === "all") return true;

    const itemDate = new Date(item.created_at);
    const now = new Date();

    if (timeFilter === "today") {
      return itemDate.toDateString() === now.toDateString();
    }

    if (timeFilter === "7days") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return itemDate >= weekAgo;
    }

    if (timeFilter === "30days") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return itemDate >= monthAgo;
    }

    if (timeFilter === "1year") {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      return itemDate >= yearAgo;
    }

    if (timeFilter === "custom") {
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

  const rows = useMemo(() => {
    return deposits
      .filter((d) => {
        if (statusFilter !== "all" && d.statut !== statusFilter) return false;
        if (!filterByTime(d)) return false;
        return true;
      })
      .map((d) => ({
        id: d.id,
        montant: d.montant,
        methode: d.methode,
        statut: d.statut,
        created_at: d.created_at,
        reason: getRejectReason(d),
        proof_url: d.proof_url,
        raw: d,
      }));
  }, [deposits, statusFilter, timeFilter, customFrom, customTo]);

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

  const openDetails = (row) => {
    setSelectedDeposit(row);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
            <Calendar className="w-4 h-4" />
            <span>{t("history.period.label")}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A0A0A0] hidden sm:inline">
              {t("history.status.label")}
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] bg-[#0B0B0B] border-[#2A2A2A] text-white">
                <SelectValue placeholder={t("history.status.all")} />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                {statusKeys.map(key => (
                   <SelectItem key={key} value={key === 'allStatus' ? 'all' : key}>
                     {t(`history.status.${key}`)}
                   </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodKeys.map((filter) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={timeFilter === filter ? "default" : "outline"}
              className={
                timeFilter === filter
                  ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                  : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
              }
              onClick={() => setPreset(filter)}
            >
              {t(`history.period.${filter}`)}
            </Button>
          ))}
        </div>

        {timeFilter === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[#A0A0A0] text-xs">{t("history.from")}</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#A0A0A0] text-xs">{t("history.to")}</label>
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
              {t("history.clear")}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#D4AF37]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center text-[#666] bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A]">
          {t("history.noTransactions")}
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW */}
          <div className="hidden md:block bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#111] text-[#A0A0A0] uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t("history.date")}</th>
                  <th className="px-6 py-4">{t("history.method")}</th>
                  <th className="px-6 py-4 text-right">{t("history.amount")}</th>
                  <th className="px-6 py-4 text-center">{t("history.status.label")}</th>
                  <th className="px-6 py-4 text-right">{t("history.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {rows.map((row) => {
                  const statusConfig = getStatusConfig(row.statut);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={row.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {new Date(row.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[#A0A0A0]">
                          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white">
                        {row.methode || "BHD Leon"}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-[#D4AF37]">
                        {formatMoneyDOP(row.montant || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(row)}
                          className="text-[#D4AF37] hover:text-[#B8941F] hover:bg-[#D4AF37]/10"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("history.viewDetails")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW */}
          <div className="md:hidden space-y-4">
            <AnimatePresence>
              {rows.map((row, index) => {
                const statusConfig = getStatusConfig(row.statut);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#D4AF37]/50 transition-colors"
                  >
                    {/* Card Header */}
                    <div className="px-4 py-3 border-b border-[#2A2A2A] flex justify-between items-center bg-[#252525]/50">
                      <div>
                        <div className="text-white font-medium text-sm">
                          {new Date(row.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[#A0A0A0]">
                          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#A0A0A0] uppercase mb-1">{t("history.method")}</p>
                        <p className="text-white font-medium text-sm">{row.methode || "BHD Leon"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#A0A0A0] uppercase mb-1">{t("history.amount")}</p>
                        <p className="text-[#D4AF37] font-mono font-bold">{formatMoneyDOP(row.montant || 0)}</p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="border-t border-[#2A2A2A]">
                      <Button
                        onClick={() => openDetails(row)}
                        className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold rounded-none h-10"
                      >
                        {t("history.viewDetails")}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* DETAILS DIALOG */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-[#0B0B0B] border border-[#2A2A2A] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{t("history.depositDetails") || t("deposit.depositDetails")}</DialogTitle>
            <DialogDescription className="text-[#A0A0A0]">
              {t("history.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedDeposit && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#1E1E1E] p-3 rounded-lg border border-[#2A2A2A]">
                  <p className="text-[#A0A0A0] text-xs">{t("history.amount")}</p>
                  <p className="text-[#D4AF37] font-bold font-mono">{formatMoneyDOP(selectedDeposit.montant)}</p>
                </div>
                <div className="bg-[#1E1E1E] p-3 rounded-lg border border-[#2A2A2A]">
                  <p className="text-[#A0A0A0] text-xs">{t("history.date")}</p>
                  <p className="text-white">{new Date(selectedDeposit.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="bg-[#1E1E1E] p-3 rounded-lg border border-[#2A2A2A] flex justify-between items-center">
                <span className="text-[#A0A0A0] text-sm">{t("history.currentStatus")}</span>
                {(() => {
                   const config = getStatusConfig(selectedDeposit.statut);
                   const Icon = config.icon;
                   return (
                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.color}`}>
                       <Icon className="w-3.5 h-3.5" />
                       {config.label}
                     </span>
                   );
                })()}
              </div>

              {/* Rejection Reason */}
              {selectedDeposit.reason && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <p className="text-red-500 text-xs font-bold mb-1 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    {t("history.rejectionReason")}
                  </p>
                  <p className="text-white text-sm">{selectedDeposit.reason}</p>
                </div>
              )}

              {/* Proof Image */}
              {selectedDeposit.proof_url ? (
                 <div className="space-y-2">
                   <p className="text-sm text-[#A0A0A0] flex items-center gap-2">
                     <FileText className="w-4 h-4" /> {t("history.proofPayment")}
                   </p>
                   <div className="relative rounded-lg overflow-hidden border border-[#2A2A2A] aspect-video bg-black/50 flex items-center justify-center">
                     <img 
                       src={selectedDeposit.proof_url} 
                       alt="Preuve" 
                       className="max-w-full max-h-full object-contain"
                     />
                   </div>
                 </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-[#2A2A2A] rounded-lg text-[#666] text-sm">
                  {t("history.noProof")}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(false)}
              className="border-[#2A2A2A] text-white hover:bg-white/5 w-full"
            >
              {t("history.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepositsHistory;