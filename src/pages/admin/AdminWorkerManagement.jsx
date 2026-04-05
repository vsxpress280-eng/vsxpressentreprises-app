import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Search, ArrowLeft, Loader2, DollarSign, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { computeEquivalentFromHTG, formatExchangeRateInfo } from "@/lib/currencyUtils";

const AdminWorkerManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Adjustment Form
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCurrencyHTG = (amount) => {
    const n = Number(amount || 0);
    return (
      new Intl.NumberFormat("fr-HT", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n) + " HTG"
    );
  };

  const formatCurrencyUSDT = (amount) => {
    const n = Number(amount || 0);
    return (
      new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n) + " USDT"
    );
  };

  const safeRate = (w) => Number(w.exchange_rate || w.taux_change || 0);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const { data: baseWorkers, error } = await supabase
        .from("users")
        .select("id, nom, prenom, email, exchange_type, exchange_rate, taux_change")
        .eq("role", "worker");

      if (error) throw error;

      const list = baseWorkers || [];
      if (list.length === 0) {
        setWorkers([]);
        return;
      }

      const ids = list.map((u) => u.id);

      const { data: wallets, error: wErr } = await supabase
        .from("wallets")
        .select("user_id, balance_htg, balance, balance_usdt")
        .in("user_id", ids);

      if (wErr) throw wErr;

      const walletMap = new Map();
      (wallets || []).forEach((w) => {
        walletMap.set(w.user_id, {
          balance_htg: w.balance_htg,
          balance: w.balance,
          balance_usdt: w.balance_usdt,
        });
      });

      const enriched = list.map((u) => {
        const w = walletMap.get(u.id);
        const current_balance_htg = Number(w?.balance_htg ?? w?.balance ?? 0);
        const balance_usdt = Number(w?.balance_usdt ?? 0);

        return {
          ...u,
          wallets: w ? [w] : [],
          current_balance_htg,
          balance_usdt,
        };
      });

      setWorkers(enriched);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: t("errors.fetchFailed") || "Erreur chargement" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProposeAdjustment = async () => {
    if (!amount) {
      toast({
        variant: "destructive",
        title: "Montant requis",
        description: "Veuillez entrer un montant."
      });
      return;
    }

    setProcessing(true);
    try {
      // Convertir le montant USDT en HTG avant de l'enregistrer
      const rate = safeRate(selectedWorker);
      const amountInHTG = rate > 0 ? Number(amount) * rate : Number(amount);

      const { error } = await supabase.from("worker_adjustments").insert([
        {
          worker_id: selectedWorker.id,
          montant: amountInHTG,
          commentaire: comment,
          statut: "proposed",
          status: "proposed",
          admin_id: user?.id,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ajustement proposé avec succès (en attente de validation worker)",
        className: "bg-green-600 text-white"
      });

      // Reset form
      setSelectedWorker(null);
      setAmount("");
      setComment("");
      fetchWorkers();
    } catch (error) {
      console.error("Error creating adjustment:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return workers;
    return workers.filter((w) => `${w.nom} ${w.prenom} ${w.email}`.toLowerCase().includes(q));
  }, [workers, search]);

  return (
    <>
      <Helmet>
        <title>Régularisations des Workers - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-6 pl-0 text-[#A0A0A0] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("buttons.backToDashboard") || "Retour"}
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
            <h1 className="text-3xl font-bold">Régularisations des Workers</h1>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pages.workerManagement.search") || "Rechercher..."}
                className="pl-9 bg-[#1E1E1E] border-[#2A2A2A] text-white w-full"
              />
            </div>
          </div>

          <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-[#111]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[#A0A0A0] whitespace-nowrap">
                      {t("pages.workerManagement.name") || "Nom"}
                    </th>
                    <th className="px-6 py-4 text-left text-[#A0A0A0] whitespace-nowrap">
                      Solde (USDT)
                    </th>
                    <th className="px-6 py-4 text-left text-[#A0A0A0] whitespace-nowrap">
                      Exchange Info
                    </th>
                    <th className="px-6 py-4 text-right text-[#A0A0A0] whitespace-nowrap">
                      {t("common.actions") || "Actions"}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[#A0A0A0]">
                        {t("common.loading") || "Chargement..."}
                      </td>
                    </tr>
                  ) : filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[#A0A0A0]">
                        {t("pages.workerManagement.noWorkers") || "Aucun worker trouvé"}
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((w) => {
                      const htg = Number(w.current_balance_htg ?? w.wallets?.[0]?.balance_htg ?? w.wallets?.[0]?.balance ?? 0);
                      const rate = safeRate(w);
                      const type = w.exchange_type;
                      const hasExchange = Boolean(type) && rate > 0;
                      const equivalentUSDT = hasExchange ? computeEquivalentFromHTG(htg, rate) : null;

                      return (
                        <tr key={w.id} className="border-t border-[#2A2A2A] hover:bg-[#252525]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold">
                              {w.prenom} {w.nom}
                            </p>
                            <p className="text-sm text-[#A0A0A0]">{w.email}</p>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              {hasExchange ? (
                                <>
                                  <span
                                    className={[
                                      "font-mono text-lg font-bold",
                                      equivalentUSDT < 0 ? "text-red-500" : equivalentUSDT > 0 ? "text-green-500" : "text-white",
                                    ].join(" ")}
                                  >
                                    {Number(equivalentUSDT).toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    USDT
                                  </span>

                                  <div className="text-xs text-[#A0A0A0]">
                                    <span className="block">
                                      ≈ {formatCurrencyHTG(htg)}
                                    </span>
                                    <span className="text-[10px] opacity-70 block mt-0.5">
                                      {formatExchangeRateInfo(type, rate)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span
                                    className={[
                                      "font-mono text-lg font-bold",
                                      htg < 0 ? "text-red-500" : htg > 0 ? "text-green-500" : "text-white",
                                    ].join(" ")}
                                  >
                                    {formatCurrencyHTG(htg)}
                                  </span>
                                  <span className="text-xs text-yellow-500/70 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> No exchange rate
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasExchange ? (
                              <div className="text-sm text-[#A0A0A0]">
                                <p>
                                  Rate: <span className="text-white font-mono">{rate}</span>
                                </p>
                                <p>
                                  Type: <span className="text-white font-mono">{type}</span>
                                </p>
                              </div>
                            ) : (
                              <span className="text-[#666]">—</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => setSelectedWorker(w)}
                              className="bg-[#D4AF37] text-black hover:bg-[#B8941F] whitespace-nowrap"
                            >
                              {t("pages.workerManagement.regularize") || "Régulariser"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Dialog open={!!selectedWorker} onOpenChange={(o) => {
            if (!o) {
              setSelectedWorker(null);
              setAmount("");
              setComment("");
            }
          }}>
            <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Régulariser: {selectedWorker?.prenom} {selectedWorker?.nom}
                </DialogTitle>
                <DialogDescription>
                  Proposer un ajustement de solde en USDT.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Montant (USDT) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="ex: 2000"
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />

                  {selectedWorker && safeRate(selectedWorker) > 0 && amount !== "" && (
                    <div className="text-xs text-[#A0A0A0] text-right mt-1">
                      <div>
                        ≈{" "}
                        {(Number(amount) * safeRate(selectedWorker)).toLocaleString("fr-HT", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        HTG
                      </div>
                      <div className="text-[10px] opacity-70">
                        Taux: 1 USDT = {safeRate(selectedWorker).toFixed(2)} HTG
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Commentaire</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Raison de l'ajustement..."
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedWorker(null);
                    setAmount("");
                    setComment("");
                  }}
                  className="border-[#2A2A2A] text-white hover:bg-[#333]"
                >
                  Annuler
                </Button>

                <Button
                  onClick={handleProposeAdjustment}
                  disabled={processing || !amount}
                  className="bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Proposer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default AdminWorkerManagement;