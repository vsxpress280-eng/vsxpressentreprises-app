import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Briefcase, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Forms
import CreateAgentForm from "./CreateAgentForm";
import CreateWorkerForm from "./CreateWorkerForm";
import CreateSpecialAgentForm from "./CreateSpecialAgentForm";
import CreateAdminForm from "./CreateAdminForm";

/**
 * 🔥 SOURCE UNIQUE DE VÉRITÉ POUR LES TITRES
 */
const ROLE_CONFIG = {
  agent: {
    pageTitle: "Créer un Agent",
    label: "Agent",
    icon: User,
    iconColor: "text-blue-500",
  },
  worker: {
    pageTitle: "Créer un Worker",
    label: "Worker",
    icon: Briefcase,
    iconColor: "text-green-500",
  },
  "special-agent": {
    pageTitle: "Créer un Agent Spécial",
    label: "Special Agent",
    icon: ShieldCheck,
    iconColor: "text-[#D4AF37]",
  },
  admin: {
    pageTitle: "Créer un Administrateur",
    label: "Administrateur",
    icon: ShieldAlert,
    iconColor: "text-purple-500",
  },
};

const CreateAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const prefill = useMemo(
    () => location?.state?.prefill || null,
    [location?.state]
  );

  const [accountType, setAccountType] = useState("agent");

  const role = ROLE_CONFIG[accountType];
  const Icon = role.icon;

  const renderForm = () => {
    const commonProps = { prefill };

    switch (accountType) {
      case "agent":
        return <CreateAgentForm embedded {...commonProps} />;
      case "worker":
        return <CreateWorkerForm {...commonProps} />;
      case "special-agent":
        return <CreateSpecialAgentForm {...commonProps} />;
      case "admin":
        return <CreateAdminForm {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>{role.pageTitle} - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6 text-white">
        <div className="max-w-5xl mx-auto">

          {/* Back */}
          <Button
            onClick={() => navigate("/admin/dashboard")}
            variant="ghost"
            className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4 p-0"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour au tableau de bord
          </Button>

          {/* 🔥 LE TITLE QUE TU VEUX */}
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Icon className={`w-7 h-7 ${role.iconColor}`} />
            {role.pageTitle}
          </h1>

          {/* Select Type */}
          <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A] mb-8 max-w-md">
            <Label className="text-[#A0A0A0] mb-2 block">
              Select Type
            </Label>

            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] h-12">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                <SelectItem value="agent">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Agent
                  </div>
                </SelectItem>

                <SelectItem value="worker">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-green-500" />
                    Worker
                  </div>
                </SelectItem>

                <SelectItem value="special-agent">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    Special Agent
                  </div>
                </SelectItem>

                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-500" />
                    Administrateur
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={accountType}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderForm()}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </>
  );
};

export default CreateAccount;