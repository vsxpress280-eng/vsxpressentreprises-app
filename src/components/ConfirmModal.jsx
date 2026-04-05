import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * ConfirmModal - version améliorée
 * - Centre écran (Dialog le fait déjà)
 * - Animation entrée/sortie
 * - Support "mode" : confirm | success | error | info
 * - En mode success/info/error : un seul bouton (OK)
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  mode = "confirm", // "confirm" | "success" | "error" | "info"
  variant = "default", // pour le bouton confirm en mode confirm
  loading = false,
  autoCloseMs = 0, // ex: 1800 pour fermer auto après 1.8s (optionnel)
}) => {
  const { t } = useTranslation();

  const isSingleAction = mode !== "confirm";
  const Icon =
    mode === "success" ? CheckCircle2 : mode === "error" ? XCircle : Info;

  // Auto close optionnel
  React.useEffect(() => {
    if (!isOpen) return;
    if (!autoCloseMs || autoCloseMs <= 0) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  // Styles par mode
  const iconWrapClass =
    mode === "success"
      ? "bg-green-600/15 border-green-600/30 text-green-500"
      : mode === "error"
      ? "bg-red-600/15 border-red-600/30 text-red-500"
      : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]";

  const okButtonClass =
    mode === "success"
      ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
      : mode === "error"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-[#D4AF37] text-black hover:bg-[#B8941F]";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen ? (
          <DialogContent className="bg-[#1C1C1C] border-[#2A2A2A] text-white sm:max-w-[460px] p-0 overflow-hidden">
            {/* Animation du contenu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="p-6"
            >
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "mt-0.5 flex items-center justify-center",
                      "h-10 w-10 rounded-full border",
                      iconWrapClass,
                    ].join(" ")}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <DialogTitle className="text-lg sm:text-xl font-semibold">
                      {title}
                    </DialogTitle>
                    <DialogDescription className="text-[#A0A0A0] mt-2 leading-relaxed">
                      {message}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <DialogFooter className="gap-3 sm:gap-2 mt-6">
                {isSingleAction ? (
                  <Button
                    onClick={onClose}
                    disabled={loading}
                    className={okButtonClass}
                  >
                    OK
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="border-[#2A2A2A] bg-transparent text-white hover:bg-[#2A2A2A] hover:text-white"
                      disabled={loading}
                    >
                      {cancelText || t("common.cancel")}
                    </Button>

                    <Button
                      variant={variant}
                      onClick={onConfirm}
                      disabled={loading}
                      className={
                        variant === "default"
                          ? "bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                          : "bg-red-600 hover:bg-red-700 text-white border-0"
                      }
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {confirmText || t("common.confirm")}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </motion.div>
          </DialogContent>
        ) : null}
      </AnimatePresence>
    </Dialog>
  );
};

export default ConfirmModal;