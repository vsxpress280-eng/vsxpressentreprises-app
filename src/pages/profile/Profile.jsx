import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Hash,
  Phone,
  MapPin,
  TrendingUp,
  BadgeDollarSign,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ✅ Choix du taux (PRIORITÉ exchange_rate, fallback taux_change)
const pickRateDopToHtg = (u) => {
  const ex = safeNum(u?.exchange_rate, 0);
  const tx = safeNum(u?.taux_change, 0);
  if (ex > 0) return ex;
  if (tx > 0) return tx;
  return 1;
};

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ✅ wallet hook
  const { balanceHtg, balanceDop, creditLimit } = useWallet();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    id: "",
    nom: "",
    prenom: "",
    username: "",
    email: "",
    role: "",
    phone: "",
    address: "",
    exchange_type: "",
    taux_change: "",
    exchange_rate: "",
    statut: "",
  });

  useEffect(() => {
    if (user) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, nom, prenom, username, email, role, numero, adresse, exchange_type, taux_change, exchange_rate, status"
        )
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfileData({
        id: data?.id || "",
        nom: data?.nom || "",
        prenom: data?.prenom || "",
        username: data?.username || "",
        email: data?.email || user.email || "",
        role: data?.role || "",
        phone: data?.numero || "",
        address: data?.adresse || "",
        exchange_type: data?.exchange_type || "",
        taux_change: data?.taux_change ?? "",
        exchange_rate: data?.exchange_rate ?? "",
        statut: data?.status || "",
      });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: t("pages.profile.loadError") });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    const r = (profileData.role || "").toLowerCase();
    if (r === "admin") navigate("/admin/dashboard");
    else if (r === "agent") navigate("/agent/dashboard");
    else if (r === "worker") navigate("/worker/dashboard");
    else if (r === "special-agent") navigate("/special-agent/dashboard");
    else navigate("/login");
  };

  const displayId = useMemo(() => {
    if (!profileData.id) return t("common.noValue");
    const s = String(profileData.id);
    return s.length > 8 ? `****${s.slice(-4)}` : s;
  }, [profileData.id, t]);

  // ✅ Rate 1 DOP = X HTG (comme dashboard)
  const rate = useMemo(() => pickRateDopToHtg(profileData), [profileData]);

  // ✅ 1) Solde DOP (fallback si balance_dop == 0 mais balance_htg existe)
  const displayBalanceDOP = useMemo(() => {
    const dop = safeNum(balanceDop, 0);
    const htg = safeNum(balanceHtg, 0);

    if (dop !== 0) return dop;
    if (rate > 0 && htg !== 0) return htg / rate;

    return 0;
  }, [balanceDop, balanceHtg, rate]);

  // ✅ 2) Crédit DOP (IMPORTANT: credit_limit stocké en DOP dans ta DB)
  const displayCreditDOP = useMemo(() => {
    return safeNum(creditLimit, 0);
  }, [creditLimit]);

  // ✅ 3) Disponible DOP
  const displayAvailableDOP = useMemo(() => {
    return displayBalanceDOP + displayCreditDOP;
  }, [displayBalanceDOP, displayCreditDOP]);

  // ✅ 4) Équivalent HTG (fallback si balance_htg existe)
  const displayEquivalentHTG = useMemo(() => {
    const htg = safeNum(balanceHtg, 0);
    if (htg !== 0) return htg;
    if (rate > 0) return displayBalanceDOP * rate;
    return 0;
  }, [balanceHtg, displayBalanceDOP, rate]);

  const fmt = (val) =>
    Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const Row = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[#D4AF37]">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#A0A0A0]">{label}</p>
        <p className="text-sm font-semibold text-white break-words">
          {value || t("common.noValue")}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white">
        {t("pages.profile.loading")}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("pages.profile.title")} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={goBack}
            className="mb-6 text-[#A0A0A0] hover:text-white pl-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("buttons.backToDashboard")}
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* CARD 1: ACCOUNT */}
            <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">
                    {t("pages.profile.accountInfo")}
                  </h2>
                  <p className="text-sm text-[#A0A0A0]">
                    {t("pages.profile.readOnly")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Row icon={User} label={t("fields.lastName")} value={profileData.nom} />
                <Row icon={User} label={t("fields.firstName")} value={profileData.prenom} />
                <Row icon={Hash} label={t("fields.username")} value={profileData.username} />
                <Row icon={Mail} label={t("fields.email")} value={profileData.email} />
                <Row icon={MapPin} label={t("fields.address")} value={profileData.address} />
                <Row icon={Phone} label={t("fields.phone")} value={profileData.phone} />
                <Row
                  icon={BadgeDollarSign}
                  label={t("pages.profile.exchangeType")}
                  value={profileData.exchange_type}
                />
                <Row
                  icon={TrendingUp}
                  label={t("pages.profile.exchangeRate")}
                  value={rate ? String(rate) : t("common.noValue")}
                />
                <Row icon={Shield} label={t("fields.role")} value={profileData.role || t("common.noValue")} />
                <Row icon={Shield} label={t("fields.status")} value={t(`status.${profileData.statut}`) || profileData.statut} />
                <Row icon={Hash} label={t("fields.id")} value={displayId} />
              </div>
            </div>

            {/* CARD 2: FINANCE — identique dashboard */}
            <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">
                    {t("pages.profile.financialInfo")}
                  </h2>
                  <p className="text-sm text-[#A0A0A0]">
                    {t("pages.profile.readOnlyFinancial")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-4">
                  <p className="text-xs text-[#A0A0A0]">{t("pages.profile.balance")}</p>
                  <p className="text-lg font-bold text-white">RD$ {fmt(displayBalanceDOP)}</p>
                  <p className="text-xs text-[#666] mt-1">{t("pages.profile.approxHtg", { val: fmt(displayEquivalentHTG) })}</p>
                  <p className="text-xs text-[#666]">{t("pages.profile.rateDisplay", { rate: fmt(rate) })}</p>
                </div>

                <div className="rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-4">
                  <p className="text-xs text-[#A0A0A0]">{t("pages.profile.credit")}</p>
                  <p className="text-lg font-bold text-white">RD$ {fmt(displayCreditDOP)}</p>
                </div>

                <div className="rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-4">
                  <p className="text-xs text-[#A0A0A0]">{t("pages.profile.available")}</p>
                  <p className="text-lg font-bold text-white">RD$ {fmt(displayAvailableDOP)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Profile;