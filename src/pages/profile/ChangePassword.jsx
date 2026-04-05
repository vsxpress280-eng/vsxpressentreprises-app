import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Shield } from "lucide-react";

export default function ChangePassword() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        throw new Error(t("messages.fillAllFields"));
      }
      if (newPassword !== confirmNewPassword) {
        throw new Error(t("messages.passwordMismatch"));
      }
      if (newPassword.length < 8) {
        throw new Error(t("messages.passwordTooShort"));
      }

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user?.email) throw new Error(t("settings.invalidSession"));

      // ✅ Re-auth (recommandé)
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthErr) throw new Error(t("settings.incorrectPassword"));

      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;

      toast({
        title: `✅ ${t("messages.passwordUpdated")}`,
        description: t("messages.passwordUpdatedDesc"),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      navigate(-1);
    } catch (e) {
      toast({
        variant: "destructive",
        title: t("messages.errorTitle"),
        description: e?.message || t("settings.passwordUpdateError"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("settings.changePassword")} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-[#A0A0A0] hover:text-white pl-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>

          <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="text-[#D4AF37]" />
              <h1 className="text-lg font-bold">
                {t("settings.changePassword")}
              </h1>
            </div>

            <Input
              type="password"
              placeholder={t("settings.currentPassword")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t("settings.newPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t("settings.confirmNewPassword")}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />

            <Button className="w-full" onClick={onSubmit} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("messages.updating")}
                </span>
              ) : (
                t("common.update")
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}