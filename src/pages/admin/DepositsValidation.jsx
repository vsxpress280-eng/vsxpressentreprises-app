// ... existing imports ...
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { useKpiNotifications } from "@/hooks/useKpiNotifications";
import { formatDateTimeLocal } from "@/lib/dateUtils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Eye,
  X,
} from "lucide-react";

const DepositsValidation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { adminPendingDepositsCount } = useKpiNotifications();

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [deposits, setDeposits] = useState([]);

  const [selected, setSelected] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openProof, setOpenProof] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofUrl, setProofUrl] = useState("");

  const initialStatus = searchParams.get("status") || "pending";

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select(
          `
          id,
          agent_id,
          montant,
          methode,
          statut,
          proof_url,
          created_at,
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
        description: e.message || t("deposits.error.load"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();

    const sub = supabase
      .channel("admin-deposits-validation")
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

  const displayedDeposits = useMemo(() => {
    if (initialStatus === "all") return deposits;
    return deposits;
  }, [deposits, initialStatus]);

  const fmtMoney = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString("en-US");
  };

  const badgeClass = (statut) => {
    if (statut === "validated")
      return "bg-green-500/20 text-green-400 border border-green-500/20";
    if (statut === "rejected")
      return "bg-red-500/20 text-red-400 border border-red-500/20";
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/20";
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

  const openDeposit = (d) => {
    setSelected(d);
    setOpenDetail(true);
    setOpenProof(false);
    setProofUrl("");
  };

  const closeDetail = () => {
    setOpenDetail(false);
    setSelected(null);
  };

  const closeProof = () => {
    setOpenProof(false);
    setProofUrl("");
  };

  const handleAction = async (depositId, action) => {
    setProcessingId(depositId);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("process-deposit", {
        body: { deposit_id: depositId, action },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: action === "validate" ? "Dépôt validé" : "Dépôt refusé",
        description: t("common.success"),
      });

      closeDetail();
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

  const handleViewProof = async () => {
    if (!selected?.proof_url) {
      toast({
        variant: "destructive",
        title: t("deposits.noProof"),
        description: t("deposits.error.noProofUrl"),
      });
      return;
    }

    setProofLoading(true);
    setOpenProof(true);

    try {
      const url = await resolveProofUrl(selected.proof_url);
      if (!url) {
        toast({
          variant: "destructive",
          title: t("deposits.error.proofLoad"),
          description: t("deposits.proof.help"),
        });
        setProofUrl("");
      } else {
        setProofUrl(url);
      }
    } finally {
      setProofLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("deposits.validation.title")} - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={() => navigate("/admin/dashboard")}
                variant="ghost"
                className="text-[#A0A0A0] hover:text-[#D4AF37]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>

              <div className="flex items-center gap-3">
                {adminPendingDepositsCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    {adminPendingDepositsCount} en attente
                  </span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchDeposits}
                  className="border-[#2A2A2A]"
                  disabled={loading}
                  title={t("common.refresh")}
                >
                  <RefreshCw
                    className={`w-4 h-4 text-[#A0A0A0] ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mt-3">
              {t("deposits.validation.title")}
            </h1>
            <p className="text-[#A0A0A0] mt-1">
              {t("deposits.validation.subtitle")}
            </p>
          </motion.div>

          <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                  <tr>
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

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#A0A0A0]" />
                      </td>
                    </tr>
                  ) : displayedDeposits.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-10 text-center text-[#A0A0A0]"
                      >
                        {t("common.noData")}
                      </td>
                    </tr>
                  ) : (
                    displayedDeposits.map((d, idx) => (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.25) }}
                        className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B]/60"
                      >
                        <td className="px-6 py-4 text-white">
                          {d.agent
                            ? `${d.agent.prenom || ""} ${d.agent.nom || ""}`.trim()
                            : d.agent_id || "—"}
                          {d.agent?.email && (
                            <div className="text-xs text-white/50 mt-1">
                              {d.agent.email}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-[#D4AF37] font-bold font-mono">
                          RD$ {fmtMoney(d.montant)}
                        </td>

                        <td className="px-6 py-4 text-white">{d.methode || "—"}</td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass(
                              d.statut
                            )}`}
                          >
                            {t(`status.${d.statut}`) || d.statut}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-[#A0A0A0] text-sm">
                          {formatDateTimeLocal(d.created_at)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            className="text-[#D4AF37] hover:text-white hover:bg-white/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeposit(d);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t("common.details") || "Détails"}
                          </Button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {openDetail && (
            <div
              className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
              onClick={closeDetail}
            >
              <div
                className="w-full max-w-xl bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl text-white shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between p-5 border-b border-[#2A2A2A]">
                  <div>
                    <h2 className="text-lg font-bold">
                      {t("deposits.detail.title")}
                    </h2>
                    <p className="text-sm text-[#A0A0A0] mt-1">
                      {t("deposits.detail.subtitle")}
                    </p>
                  </div>
                  <button
                    onClick={closeDetail}
                    className="p-2 rounded-lg hover:bg-white/5 text-[#A0A0A0] hover:text-white"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!selected ? (
                  <div className="p-6 text-center text-[#A0A0A0]">
                    {t("common.none")}
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-white/50">{t("common.agent")}</p>
                          <p className="font-semibold">
                            {selected.agent
                              ? `${selected.agent.prenom || ""} ${
                                  selected.agent.nom || ""
                                }`.trim()
                              : selected.agent_id || "—"}
                          </p>
                          {selected.agent?.email && (
                            <p className="text-xs text-white/50 mt-1">
                              {selected.agent.email}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-white/50">{t("common.status")}</p>
                          <span
                            className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass(
                              selected.statut
                            )}`}
                          >
                            {t(`status.${selected.statut}`) || selected.statut}
                          </span>
                        </div>

                        <div>
                          <p className="text-white/50">{t("common.amount")}</p>
                          <p className="font-semibold text-[#D4AF37]">
                            RD$ {fmtMoney(selected.montant)}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/50">Méthode</p>
                          <p className="font-semibold">
                            {selected.methode || "—"}
                          </p>
                        </div>

                        <div className="sm:col-span-2">
                          <p className="text-white/50">{t("common.date")}</p>
                          <p className="font-semibold">
                            {formatDateTimeLocal(selected.created_at)}
                          </p>
                        </div>

                        <div className="sm:col-span-2">
                          <p className="text-white/50">Proof URL</p>
                          <p className="text-xs break-all text-white/70">
                            {selected.proof_url || t("deposits.noProof")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        onClick={() => handleAction(selected.id, "validate")}
                        disabled={processingId === selected.id}
                        className="bg-[#10B981] hover:bg-[#059669] text-white flex-1"
                      >
                        {processingId === selected.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        {t("deposits.validate")}
                      </Button>

                      <Button
                        onClick={() => handleAction(selected.id, "reject")}
                        disabled={processingId === selected.id}
                        className="bg-[#E53935] hover:bg-[#C62828] text-white flex-1"
                      >
                        {processingId === selected.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        {t("deposits.reject")}
                      </Button>

                      <Button
                        onClick={handleViewProof}
                        variant="outline"
                        className="border-[#2A2A2A] hover:bg-white/5 flex-1"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {t("deposits.viewProof")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {openProof && (
            <div
              className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
              onClick={closeProof}
            >
              <div
                className="w-full max-w-3xl bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl text-white shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between p-5 border-b border-[#2A2A2A]">
                  <div>
                    <h2 className="text-lg font-bold">
                      {t("deposits.proof.title")}
                    </h2>
                    <p className="text-sm text-[#A0A0A0] mt-1">
                      {t("deposits.proof.help")}
                    </p>
                  </div>
                  <button
                    onClick={closeProof}
                    className="p-2 rounded-lg hover:bg-white/5 text-[#A0A0A0] hover:text-white"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {proofLoading ? (
                    <div className="py-10 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D4AF37]" />
                      <p className="text-[#A0A0A0] mt-2">Chargement...</p>
                    </div>
                  ) : !proofUrl ? (
                    <div className="py-10 text-center text-[#A0A0A0]">
                      {t("deposits.noProof") || "Aucune preuve disponible"}
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black flex justify-center">
                      <img
                        src={proofUrl}
                        alt="Proof"
                        className="max-w-full max-h-[70vh] object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default DepositsValidation;