import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/formatMoney"; 
import {
  Loader2,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  Download,
  User,
  Briefcase,
  Info,
  Power,
} from "lucide-react";

const UserDetails = ({ user, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({});
  const [workers, setWorkers] = useState([]);
  const [associatedWorkerName, setAssociatedWorkerName] = useState("N/A");

  const parseMoneyInput = (raw) => {
    if (raw == null) return 0;
    let s = String(raw).trim();
    s = s.replace(/\s+/g, "");
    s = s.replace(/,/g, "");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const sanitizeNumericText = (raw, { allowDecimal = true } = {}) => {
    if (raw == null) return "";
    let s = String(raw);
    s = s.replace(/[^0-9.,]/g, "");
    if (!allowDecimal) {
      s = s.replace(/[.,]/g, "");
      return s;
    }
    s = s.replace(/,/g, ".");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    const [i, d] = s.split(".");
    if (d != null) s = i + "." + d.slice(0, 2);
    return s;
  };

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || "",
        prenom: user.prenom || "",
        email: user.email || "",
        adresse: user.adresse || "",
        numero: user.numero || "",
        username: user.username || "",

        exchange_rate: user.exchange_rate ?? user.taux_change ?? 1,
        fees: user.frais ?? user.fees ?? 0,

        credit_limit: user.wallets?.[0]?.credit_limit ?? user.credit_limit ?? 0,

        exchange_type: user.exchange_type || "USDT",
        associated_worker: user.associated_worker || "",

        balance_exchange_type:
          user.balance_exchange_type || user.exchange_type || "USDT",
        balance_exchange_rate:
          user.balance_exchange_rate ??
          user.exchange_rate ??
          user.taux_change ??
          1,

        transactions_disabled: user.transactions_disabled || false,
      });

      setIsEditing(false);
      fetchAssociatedWorker(user.associated_worker);
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && user?.role === "agent") {
      fetchWorkers();
    }
  }, [isOpen, user]);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, nom, prenom")
        .eq("role", "worker");

      if (!error) setWorkers(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAssociatedWorker = async (workerId) => {
    if (!workerId) {
      setAssociatedWorkerName("N/A");
      return;
    }
    try {
      const { data } = await supabase
        .from("users")
        .select("nom, prenom")
        .eq("id", workerId)
        .single();
      if (data) setAssociatedWorkerName(`${data.prenom} ${data.nom}`);
    } catch (e) {
      console.error(e);
      setAssociatedWorkerName("N/A");
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "exchange_rate" || id === "fees" || id === "credit_limit" || id === "balance_exchange_rate") {
      setFormData((prev) => ({
        ...prev,
        [id]: sanitizeNumericText(value, { allowDecimal: true }),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleTransactionsToggle = (checked) => {
    setFormData((prev) => ({ ...prev, transactions_disabled: !checked }));
  };

  const handleSave = async () => {
    if (!formData.nom || !formData.prenom || !formData.email) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("validation.required"),
      });
      return;
    }

    setLoading(true);
    try {
      const exchangeRateNum = parseMoneyInput(formData.exchange_rate);
      const feesNum = parseMoneyInput(formData.fees);
      const creditLimitNum = parseMoneyInput(formData.credit_limit);
      const balanceExchangeRateNum = parseMoneyInput(formData.balance_exchange_rate);

      const updates = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        adresse: formData.adresse,
        numero: formData.numero,
        username: formData.username,

        exchange_type: formData.exchange_type,
        exchange_rate: exchangeRateNum,
        taux_change: exchangeRateNum,
        frais: feesNum,

        associated_worker: formData.associated_worker || null,

        balance_exchange_type: formData.balance_exchange_type,
        balance_exchange_rate: balanceExchangeRateNum,

        transactions_disabled: formData.transactions_disabled,
      };

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select(
          "id, nom, prenom, email, adresse, numero, username, exchange_type, exchange_rate, taux_change, frais, associated_worker, balance_exchange_type, balance_exchange_rate, transactions_disabled"
        );

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Aucune modification appliquée. Vérifie les permissions (RLS) ou l'ID user."
        );
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_set_credit_limit', {
        p_target_user_id: user.id,
        p_credit_limit: creditLimitNum
      });

      if (rpcError) throw rpcError;
      
      if (rpcResult && rpcResult[0]) {
         if (!rpcResult[0].success) {
             throw new Error(rpcResult[0].message || 'Failed to update credit limit.');
         }
      }

      const fresh = data[0];
      setFormData((prev) => ({
        ...prev,
        exchange_rate: String(fresh.exchange_rate ?? exchangeRateNum),
        fees: String(fresh.frais ?? feesNum),
        credit_limit: String(creditLimitNum),
        balance_exchange_type: fresh.balance_exchange_type ?? prev.balance_exchange_type,
        balance_exchange_rate: String(fresh.balance_exchange_rate ?? balanceExchangeRateNum),
        transactions_disabled: fresh.transactions_disabled,
      }));

      if (
        user.role === "agent" &&
        formData.associated_worker !== user.associated_worker
      ) {
        if (formData.associated_worker) {
          const { error: assignError } = await supabase.functions.invoke(
            "assign-agent",
            {
              body: { agent_id: user.id, worker_id: formData.associated_worker },
            }
          );
          if (assignError) throw assignError;
        }
      }

      toast({
        title: t("common.success"),
        description: t("messages.userUpdated"),
      });

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("users").delete().eq("id", user.id);
      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("messages.userDeleted"),
      });
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("messages.deleteError"),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!user) return null;

  const balanceRaw =
    user.wallets?.[0]?.balance ??
    user.wallets?.[0]?.balance_htg ??
    user.wallets?.[0]?.balance_dop ??
    0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#D4AF37]" />
                {t("pages.userDetails.title")}
              </span>
              <span
                className={`text-sm font-normal px-2 py-1 rounded ${
                  isEditing
                    ? "bg-blue-500/20 text-blue-500"
                    : "bg-green-500/20 text-green-500"
                }`}
              >
                {isEditing
                  ? t("pages.userDetails.editMode")
                  : t("pages.userDetails.viewMode")}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-[#141414] p-4 rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Power
                    className={`w-5 h-5 ${
                      !formData.transactions_disabled
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                  <div>
                    <h4 className="font-medium text-white">
                      Autorisation Transactions
                    </h4>
                    <p className="text-xs text-[#A0A0A0]">
                      {formData.transactions_disabled
                        ? "Transactions bloquées pour cet utilisateur."
                        : "L'utilisateur peut effectuer des transactions."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!formData.transactions_disabled}
                  onCheckedChange={handleTransactionsToggle}
                  disabled={!isEditing}
                  className={`data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[#D4AF37] font-semibold border-b border-[#2A2A2A] pb-2">
                {t("pages.userDetails.personalInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.name")}</Label>
                  <Input
                    id="nom"
                    value={formData.nom || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.firstName")}</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.email")}</Label>
                  <Input
                    id="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.username")}</Label>
                  <Input
                    id="username"
                    value={formData.username || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.phone")}</Label>
                  <Input
                    id="numero"
                    value={formData.numero || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.address")}</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                  />
                </div>
              </div>
            </div>

            {user.role === "agent" && (
              <div className="space-y-4">
                <h3 className="text-[#D4AF37] font-semibold border-b border-[#2A2A2A] pb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {t("forms.assignedWorker")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A0A0A0]">{t("forms.assignedWorker")}</Label>
                    {isEditing ? (
                      <Select
                        value={formData.associated_worker || ""}
                        onValueChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            associated_worker: val,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                          <SelectValue placeholder={t("forms.selectWorker")} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                          {workers.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.prenom} {w.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={associatedWorkerName}
                        disabled
                        className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[#D4AF37] font-semibold border-b border-[#2A2A2A] pb-2">
                {t("pages.userDetails.financialInfo")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">
                    {t("forms.exchangeType")} (Transfert)
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.exchange_type || "USDT"}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, exchange_type: val }))
                      }
                    >
                      <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                        <SelectValue placeholder="Devise" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="ZELLE">ZELLE</SelectItem>
                        <SelectItem value="DOP">DOP</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.exchange_type || ""}
                      disabled
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">
                    {t("forms.exchangeRate")} (Transfert)
                  </Label>
                  <Input
                    id="exchange_rate"
                    type="text"
                    inputMode="decimal"
                    value={formData.exchange_rate ?? ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70 font-mono"
                    placeholder="Ex: 58.00"
                  />
                  {!isEditing && (
                    <div className="text-xs text-[#A0A0A0]">
                      Affiché: <span className="text-white font-mono">{formatMoney(formData.exchange_rate)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.fee")}</Label>
                  <Input
                    id="fees"
                    type="text"
                    inputMode="decimal"
                    value={formData.fees ?? ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70 font-mono"
                    placeholder="Ex: 2.00"
                  />
                  {!isEditing && (
                    <div className="text-xs text-[#A0A0A0]">
                      Affiché: <span className="text-white font-mono">{formatMoney(formData.fees)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("forms.credit")}</Label>
                  <Input
                    id="credit_limit"
                    type="text"
                    inputMode="decimal"
                    value={formData.credit_limit ?? ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70 font-mono"
                    placeholder="Ex: 10,000.00"
                  />
                  {!isEditing && (
                    <div className="text-xs text-[#A0A0A0]">
                      Affiché: <span className="text-white font-mono">{formatMoney(formData.credit_limit)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t("dashboard.agent.balance")}</Label>
                  <Input
                    value={formatMoney(balanceRaw)}
                    disabled
                    className="bg-[#2A2A2A] border-[#2A2A2A] text-[#D4AF37] font-bold font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#141414] p-4 rounded-xl border border-[#2A2A2A] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Info className="w-24 h-24" />
                </div>
                <h4 className="text-white text-sm font-medium mb-4 flex items-center gap-2 relative z-10">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Paramètres Solde (Affichage)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  <div className="space-y-2">
                    <Label className="text-[#A0A0A0]">Type de Solde</Label>
                    {isEditing ? (
                      <Select
                        value={formData.balance_exchange_type || "USDT"}
                        onValueChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            balance_exchange_type: val,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                          <SelectValue placeholder="Devise" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                          <SelectItem value="USDT">USDT</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="ZELLE">ZELLE</SelectItem>
                          <SelectItem value="DOP">DOP</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.balance_exchange_type || ""}
                        disabled
                        className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#A0A0A0]">Taux Solde</Label>
                    <Input
                      id="balance_exchange_rate"
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 58.00"
                      value={formData.balance_exchange_rate ?? ""}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-white disabled:opacity-70 font-mono"
                    />
                    {isEditing && (
                      <p className="text-[10px] text-[#A0A0A0]">
                        Ce taux est utilisé uniquement pour l'affichage de l'équivalence du solde.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[#D4AF37] font-semibold border-b border-[#2A2A2A] pb-2">
                {t("pages.userDetails.identification")}
              </h3>
              <div className="bg-[#0B0B0B] p-4 rounded-lg border border-[#2A2A2A]">
                <div className="mb-2">
                  <span className="text-[#A0A0A0] text-sm">{t("forms.idType")}: </span>
                  <span className="text-white">{user.id_type || "N/A"}</span>
                </div>
                <div className="mb-2">
                  <span className="text-[#A0A0A0] text-sm">{t("forms.idCard")}: </span>
                  <span className="text-white">{user.piece_identite || "N/A"}</span>
                </div>

                <div className="mt-4">
                  <Label className="text-[#A0A0A0] block mb-2">{t("forms.uploadIdDocument")}</Label>
                  {user.uploaded_id_url ? (
                    <div className="relative group">
                      {user.uploaded_id_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <img
                          src={user.uploaded_id_url}
                          alt="ID Document"
                          className="max-h-48 rounded-lg border border-[#2A2A2A] object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-4 bg-[#1E1E1E] rounded-lg border border-[#2A2A2A]">
                          <FileText className="w-8 h-8 text-[#D4AF37]" />
                          <span className="text-white">Document PDF</span>
                        </div>
                      )}
                      <a
                        href={user.uploaded_id_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 bg-black/70 p-2 rounded-full text-white hover:bg-[#D4AF37] hover:text-black transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-[#A0A0A0] italic text-sm">{t("pages.userDetails.noDocument")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-[#2A2A2A] text-white"
                >
                  <X className="w-4 h-4 mr-2" /> {t("pages.userDetails.cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t("pages.userDetails.save")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-none mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> {t("pages.userDetails.delete")}
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> {t("pages.userDetails.edit")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
          <DialogHeader>
            <DialogTitle>{t("pages.userDetails.confirmDelete")}</DialogTitle>
          </DialogHeader>
          <p className="text-[#A0A0A0] py-4">{t("pages.userDetails.deleteConfirmation")}</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-[#2A2A2A] text-white"
            >
              {t("pages.userDetails.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("pages.userDetails.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDetails;