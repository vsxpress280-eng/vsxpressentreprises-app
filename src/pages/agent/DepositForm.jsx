import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Landmark, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { checkTransactionStatus } from "@/lib/transactionsGuard";
import MoneyInput from "@/components/ui/MoneyInput";
import { getTodayHaitiString, convertHaitiDateToISO } from "@/lib/dateUtils";

const DepositForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { refreshWallet } = useWallet();

  const [selectedMethod, setSelectedMethod] = useState("");
  // amount is now numeric (or empty string), managed by MoneyInput
  const [amount, setAmount] = useState("");
  const [depositDate, setDepositDate] = useState(getTodayHaitiString());

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState("");

  const bankOptions = useMemo(
    () => [
      {
        id: "Banreservas",
        name: "Banreservas",
        holder: "Désir Adelson",
        number: "9606220131",
      },
      {
        id: "BHD Leon",
        name: "BHD Leon",
        holder: "Vanecia Jean",
        number: "336181110019",
      },
    ],
    []
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("deposit.fileTooLarge"),
      });
      return;
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("deposit.invalidFile"),
      });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAmountError("");

    if (!selectedMethod || !amount || !depositDate) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("common.requiredField"),
      });
      return;
    }

    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: t("deposit.proof"),
        description: t("deposit.uploadProof"),
      });
      return;
    }

    if (!user?.id) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("settings.invalidSession"),
      });
      return;
    }

    // MoneyInput ensures 'amount' is a number or empty string. 
    // Just simple validation here.
    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setAmountError(t("common.invalidFormat"));
      return;
    }

    setIsLoading(true);

    try {
      // FRONT GUARD
      const status = await checkTransactionStatus(user.id);
      if (!status.allowed) {
        toast({
          variant: "destructive",
          title: t("deposit.actionRefused"),
          description: status.message,
        });
        setIsLoading(false);
        return;
      }

      // Convert file to base64 for Edge Function
      const reader = new FileReader();
      const base64File = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result.split(",")[1]);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(selectedFile);
      });

      const fileName = `${Date.now()}_${selectedFile.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;

      // Explicitly get session to ensure token is fresh
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error(t("settings.invalidSession"));

      // Call Edge Function 'submit-deposit'
      const { data, error } = await supabase.functions.invoke("submit-deposit", {
        body: {
          agent_id: user.id,
          amount: amountNumber,
          method: selectedMethod,
          date: convertHaitiDateToISO(depositDate) || depositDate,
          file: base64File,
          filename: fileName,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Edge Function Error:", error);
        if (error.context?.response?.status === 403) {
          throw new Error(t("deposit.depositError"));
        }
        throw new Error(error.message || t("deposit.depositError"));
      }

      if (data?.error) throw new Error(data.error);

      toast({
        title: t("common.success"),
        description: t("deposit.depositSubmitted"),
        className: "bg-green-600 text-white border-none",
      });

      if (typeof refreshWallet === "function") refreshWallet();

      navigate("/agent/history?tab=deposits");
    } catch (err) {
      console.error("Submission error details:", err);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description:
          err?.message || t("deposit.depositError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("deposit.title")} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6 text-white">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-[#A0A0A0] mb-4 p-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* METHOD / BANK */}
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A]">
              <h2 className="text-lg font-bold mb-4 flex gap-2 items-center">
                <Landmark className="w-5 h-5 text-[#D4AF37]" />
                {t("deposit.bank")}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {bankOptions.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedMethod(b.id)}
                    className={`text-left cursor-pointer p-4 rounded-xl border transition w-full ${
                      selectedMethod === b.id
                        ? "border-[#D4AF37] bg-[#D4AF37]/10"
                        : "border-[#2A2A2A] hover:bg-[#252525]"
                    }`}
                  >
                    <p className="font-bold text-white">{b.name}</p>
                    <p className="text-sm text-[#A0A0A0]">{b.holder}</p>
                    <p className="font-mono text-[#D4AF37]">{b.number}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AMOUNT + DATE */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A]">
                <MoneyInput
                  label={t("deposit.amountDOP")}
                  value={amount}
                  onChange={(numericValue) => setAmount(numericValue)}
                  placeholder="ex: 100,000.00"
                  min={0}
                  required
                  error={amountError}
                />
              </div>

              <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A]">
                <Label>{t("deposit.depositDate")}</Label>
                <Input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="mt-2 bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* PROOF UPLOAD */}
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A]">
              <h2 className="text-lg font-bold mb-4 flex gap-2 items-center">
                <Upload className="w-5 h-5 text-[#D4AF37]" />
                {t("deposit.proof")} <span className="text-red-500">*</span>
              </h2>

              <input
                id="proofFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                required
              />

              <label
                htmlFor="proofFile"
                className={`w-full min-h-[240px] border-2 border-dashed
                  rounded-xl bg-[#0B0B0B]
                  flex items-center justify-center cursor-pointer
                  hover:border-[#D4AF37]/60 transition overflow-hidden
                  ${selectedFile ? "border-[#D4AF37]" : "border-[#2A2A2A]"}`}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full min-h-[240px] flex items-center justify-center bg-black/50">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-[220px] object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center">
                      <span className="bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100">
                        {t("deposit.changeImage")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#A0A0A0]">
                    <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t("deposit.clickToUpload")}</p>
                    <p className="text-sm opacity-60">{t("deposit.fileFormat")}</p>
                  </div>
                )}
              </label>

              {selectedFile && (
                <p className="text-xs text-[#A0A0A0] mt-2 text-center">
                  {t("deposit.fileSelected")}: {selectedFile.name}
                </p>
              )}
            </div>

            {/* SUBMIT */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg bg-[#0E7A57] hover:bg-[#16A34A] text-white font-bold rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t("deposit.sending")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {t("deposit.submit")}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default DepositForm;