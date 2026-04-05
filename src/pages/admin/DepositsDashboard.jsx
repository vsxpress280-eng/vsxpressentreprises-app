// ... existing imports ...
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Eye,
  Calendar,
  X,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatMoney, formatMoneyDOP } from "@/lib/formatMoney";
import { formatDateTimeLocal } from "@/lib/dateUtils";

const DepositsDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );

  const [timeFilter, setTimeFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDeposit, setPreviewDeposit] = useState(null);
  const [previewProofUrl, setPreviewProofUrl] = useState("");
  const [previewLoadingProof, setPreviewLoadingProof] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDepositId, setRejectDepositId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select(
          `
          *,
          agent:agent_id (nom, prenom, email)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("error.fetchFailed"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
    const sub = supabase
      .channel("admin-deposits-dash")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits" },
        () => fetchDeposits()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "validated":
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
            {t("status.validated")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">
            {t("status.rejected")}
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
            {t("status.pending")}
          </Badge>
        );
    }
  };

  const resolveProofUrl = async (raw) => {
    if (!raw) return "";
    if (typeof raw === "string" && raw.startsWith("http")) return raw;
    const path = String(raw);

    try {
      const { data } = supabase.storage.from("deposits").getPublicUrl(path);
      const pub = data?.publicUrl || "";
      if (pub) return pub;
    } catch {}

    try {
      const { data, error } = await supabase.storage
        .from("deposits")
        .createSignedUrl(path, 60 * 60);

      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {}

    return "";
  };

  const getDepositNumber = (d) => {
    const v =
      d.deposit_no ||
      d.formatted_no ||
      d.reference_no ||
      d.code ||
      d.numero ||
      "";
    if (v) return String(v);

    const index = deposits.findIndex((x) => x.id === d.id);
    const n = index >= 0 ? deposits.length - index : 0;
    return `VSXDEPT-${String(n).padStart(3, "0")}`;
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

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      const s = search.toLowerCase();
      
      const depositNumber = getDepositNumber(d).toLowerCase();
      
      const matchesSearch =
        depositNumber.includes(s) ||
        (d.agent?.nom || "").toLowerCase().includes(s) ||
        (d.agent?.prenom || "").toLowerCase().includes(s) ||
        (d.agent?.email || "").toLowerCase().includes(s) ||
        String(d.montant).includes(s) ||
        String(d.formatted_no || d.reference_no || d.code || "")
          .toLowerCase()
          .includes(s) ||
        `${d.agent?.prenom || ""} ${d.agent?.nom || ""}`.toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === "all" ? true : d.statut === statusFilter;

      const matchesTime = isInTimeFilter(d.created_at);

      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [deposits, search, statusFilter, timeFilter, customFrom, customTo]);

  const miniStats = useMemo(() => {
    const validated = filteredDeposits.filter((d) =>
      ["validated", "approved"].includes(d.statut)
    );

    const validatedCount = validated.length;

    const totalAmount = validated.reduce((sum, d) => {
      const n = Number(d.montant);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    return { validatedCount, totalAmount };
  }, [filteredDeposits]);

  const handleAction = async (depositId, action, extraBody = {}) => {
    setProcessingId(depositId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const { data, error } = await supabase.functions.invoke("process-deposit", {
        body: { deposit_id: depositId, action, ...extraBody },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Edge Function Error:", error);
        throw new Error(error.message || "Erreur lors de l'appel au serveur");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: action === "validate" ? "Dépôt validé" : "Dépôt refusé",
        description: t("common.success"),
        className: "bg-green-600 text-white border-none",
      });

      fetchDeposits();
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: e.message || "Action impossible",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenProof = async (proofUrlRaw) => {
    if (!proofUrlRaw) {
      toast({
        variant: "destructive",
        title: t("deposits.noProof") || "Aucune preuve",
        description:
          t("deposits.error.noProofUrl") || "Ce dépôt n'a pas de preuve.",
      });
      return;
    }

    const url = await resolveProofUrl(proofUrlRaw);
    if (!url) {
      toast({
        variant: "destructive",
        title: t("deposits.error.proofLoad") || "Erreur",
        description:
          t("deposits.proof.help") || "Impossible de charger la preuve.",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openPreview = async (deposit) => {
    setPreviewDeposit(deposit);
    setPreviewProofUrl("");
    setPreviewOpen(true);

    if (deposit?.proof_url) {
      setPreviewLoadingProof(true);
      try {
        const url = await resolveProofUrl(deposit.proof_url);
        setPreviewProofUrl(url || "");
      } finally {
        setPreviewLoadingProof(false);
      }
    }
  };

  const openReject = (depositId) => {
    setRejectDepositId(depositId);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    const reason = (rejectReason || "").trim();
    if (!reason) {
      toast({
        variant: "destructive",
        title: "Motif requis",
        description: "Veuillez entrer la raison du refus.",
      });
      return;
    }

    const id = rejectDepositId;
    setRejectOpen(false);
    setRejectDepositId(null);

    await handleAction(id, "reject", { reason });
  };

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

  return (
    <>
      <Helmet>
        <title>{t("deposits.validation.title")} - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6 text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              onClick={() => navigate("/admin/dashboard")}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4 pl-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.backToDashboard")}
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {t("deposits.validation.title")}
                </h1>
                <p className="text-[#A0A0A0] mt-1">
                  {t("deposits.validation.subtitle")}
                </p>
              </div>
              <Button
                onClick={fetchDeposits}
                disabled={loading}
                variant="outline"
                className="border-[#2A2A2A] text-[#A0A0A0]"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                {t("common.refresh")}
              </Button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                      Dépôts validés
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1">
                    {miniStats.validatedCount}
                  </div>
                  <div className="text-xs text-[#777]">
                    Basé sur les filtres actifs
                  </div>
                </div>
                <div className="p-2.5 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
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
                      Montant total
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#D4AF37] mb-1 font-mono">
                    {formatMoneyDOP(miniStats.totalAmount)}
                  </div>
                  <div className="text-xs text-[#777]">
                    Dépôts validés uniquement
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
                variant={timeFilter === "all" ? "default" : "outline"}
                className={
                  timeFilter === "all"
                    ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                    : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                }
                onClick={() => setPreset("all")}
              >
                Tout
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === "today" ? "default" : "outline"}
                className={
                  timeFilter === "today"
                    ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                    : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                }
                onClick={() => setPreset("today")}
              >
                Aujourd&apos;hui
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === "week" ? "default" : "outline"}
                className={
                  timeFilter === "week"
                    ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                    : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                }
                onClick={() => setPreset("week")}
              >
                7 jours
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === "month" ? "default" : "outline"}
                className={
                  timeFilter === "month"
                    ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                    : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                }
                onClick={() => setPreset("month")}
              >
                Mois
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === "year" ? "default" : "outline"}
                className={
                  timeFilter === "year"
                    ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                    : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                }
                onClick={() => setPreset("year")}
              >
                Année
              </Button>

              <Button
                type="button"
                size="sm"
                variant={timeFilter === "custom" ? "default" : "outline"}
                className={
                  timeFilter === "custom"
                    ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                    : "border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10"
                }
                onClick={() => setPreset("custom")}
              >
                Personnalisé
              </Button>
            </div>

            {timeFilter === "custom" && (
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

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                placeholder="Rechercher par N°, agent, email, montant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#1E1E1E] border-[#2A2A2A] text-white focus:border-[#D4AF37]"
              />
            </div>

            <div className="w-full md:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#A0A0A0]" />
                    <SelectValue placeholder={t("common.status")} />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                  <SelectItem value="all">{t("status.all")}</SelectItem>
                  <SelectItem value="pending">{t("status.pending")}</SelectItem>
                  <SelectItem value="validated">{t("status.validated")}</SelectItem>
                  <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#A0A0A0] uppercase">
                      N°
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#A0A0A0] uppercase">
                      {t("common.agent")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#A0A0A0] uppercase">
                      {t("common.amount")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#A0A0A0] uppercase">
                      Méthode
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#A0A0A0] uppercase">
                      {t("common.status")}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#A0A0A0] uppercase">
                      {t("common.date")}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#A0A0A0] uppercase">
                      {t("common.actions") || "Actions"}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#2A2A2A]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-10 text-center text-[#A0A0A0]"
                      >
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        {t("common.loading")}
                      </td>
                    </tr>
                  ) : filteredDeposits.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-10 text-center text-[#A0A0A0]"
                      >
                        {search ? "Aucun résultat ne correspond à votre recherche" : t("common.noData")}
                      </td>
                    </tr>
                  ) : (
                    filteredDeposits.map((d) => {
                      const isPending = d.statut === "pending";
                      const numberLabel = getDepositNumber(d);

                      return (
                        <tr
                          key={d.id}
                          className="hover:bg-[#252525] transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-white font-mono">
                            {numberLabel}
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-white">
                              {d.agent?.prenom} {d.agent?.nom}
                            </div>
                            <div className="text-xs text-[#A0A0A0]">
                              {d.agent?.email}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-[#D4AF37] font-bold font-mono">
                            {formatMoneyDOP(d.montant)}
                          </td>

                          <td className="px-6 py-4 text-sm text-white">
                            {d.methode || "—"}
                          </td>

                          <td className="px-6 py-4">{getStatusBadge(d.statut)}</td>

                          <td className="px-6 py-4 text-sm text-[#A0A0A0]">
                            {formatDateTimeLocal(d.created_at)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col sm:flex-row gap-2 justify-end">
                              <Button
                                variant="outline"
                                className="border-[#2A2A2A] hover:bg-white/5"
                                onClick={() => openPreview(d)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Voir
                              </Button>

                              {isPending ? (
                                <>
                                  <Button
                                    onClick={() => handleAction(d.id, "validate")}
                                    disabled={processingId === d.id}
                                    className="bg-[#10B981] hover:bg-[#059669] text-white"
                                  >
                                    {processingId === d.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                    )}
                                    Valider
                                  </Button>

                                  <Button
                                    onClick={() => openReject(d.id)}
                                    disabled={processingId === d.id}
                                    className="bg-[#E53935] hover:bg-[#C62828] text-white"
                                  >
                                    {processingId === d.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                      <XCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Refuser
                                  </Button>

                                  <Button
                                    variant="outline"
                                    className="border-[#2A2A2A] hover:bg-white/5"
                                    disabled={!d.proof_url}
                                    onClick={() => handleOpenProof(d.proof_url)}
                                  >
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Preuve
                                  </Button>
                                </>
                              ) : (
                                <span className="text-[#A0A0A0] self-center">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-[#0B0B0B] border border-[#2A2A2A] text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Prévisualisation du dépôt</DialogTitle>
            <DialogDescription className="text-[#A0A0A0]">
              Détails + preuve (si disponible)
            </DialogDescription>
          </DialogHeader>

          {previewDeposit ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4">
                <div className="text-xs text-[#A0A0A0] uppercase">N° Dépôt</div>
                <div className="mt-1 font-mono text-white">
                  {getDepositNumber(previewDeposit)}
                </div>

                <div className="mt-4 text-xs text-[#A0A0A0] uppercase">Agent</div>
                <div className="mt-1 text-white">
                  {previewDeposit.agent?.prenom} {previewDeposit.agent?.nom}
                </div>
                <div className="text-xs text-[#A0A0A0]">
                  {previewDeposit.agent?.email}
                </div>

                <div className="mt-4 text-xs text-[#A0A0A0] uppercase">Montant</div>
                <div className="mt-1 font-mono text-[#D4AF37] font-bold">
                  {formatMoneyDOP(previewDeposit.montant)}
                </div>

                <div className="mt-4 text-xs text-[#A0A0A0] uppercase">Méthode</div>
                <div className="mt-1 text-white">{previewDeposit.methode || "—"}</div>

                <div className="mt-4 text-xs text-[#A0A0A0] uppercase">Statut</div>
                <div className="mt-1">{getStatusBadge(previewDeposit.statut)}</div>

                <div className="mt-4 text-xs text-[#A0A0A0] uppercase">Date</div>
                <div className="mt-1 text-white">
                  {formatDateTimeLocal(previewDeposit.created_at)}
                </div>

                {"order_id" in previewDeposit && (
                  <>
                    <div className="mt-4 text-xs text-[#A0A0A0] uppercase">
                      Commande liée
                    </div>
                    <div className="mt-1 font-mono text-white">
                      {previewDeposit.order_id || "—"}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#A0A0A0] uppercase">Preuve</div>
                  <Button
                    variant="outline"
                    className="border-[#2A2A2A] hover:bg-white/5"
                    disabled={!previewDeposit.proof_url}
                    onClick={() => handleOpenProof(previewDeposit.proof_url)}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Ouvrir
                  </Button>
                </div>

                <div className="mt-3">
                  {!previewDeposit.proof_url ? (
                    <div className="text-sm text-[#A0A0A0]">
                      Aucune preuve attachée à ce dépôt.
                    </div>
                  ) : previewLoadingProof ? (
                    <div className="text-sm text-[#A0A0A0] flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement de la preuve...
                    </div>
                  ) : previewProofUrl ? (
                    <div className="rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#0B0B0B]">
                      <img
                        src={previewProofUrl}
                        alt="Preuve de dépôt"
                        className="w-full h-[360px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-[#A0A0A0]">
                      Impossible de charger la preuve.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#A0A0A0]">Aucun dépôt sélectionné.</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-[#0B0B0B] border border-[#2A2A2A] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Refuser le dépôt</DialogTitle>
            <DialogDescription className="text-[#A0A0A0]">
              Motif obligatoire — l&apos;agent verra ce message dans l&apos;historique plus tard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#A0A0A0] mb-1">
                Raison du refus
              </label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: preuve illisible / montant incorrect / mauvais numéro..."
                className="bg-[#1E1E1E] border-[#2A2A2A] text-white focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="border-[#2A2A2A] text-[#A0A0A0]"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectDepositId(null);
                  setRejectReason("");
                }}
              >
                Annuler
              </Button>
              <Button
                className="bg-[#E53935] hover:bg-[#C62828] text-white"
                onClick={confirmReject}
                disabled={!rejectReason.trim() || processingId === rejectDepositId}
              >
                Confirmer le refus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DepositsDashboard;