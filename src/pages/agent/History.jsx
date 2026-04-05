import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

import TransfersHistory from "@/pages/agent/history/TransfersHistory";
import DepositsHistory from "@/pages/agent/history/DepositsHistory";

const AgentHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'deposits' ? 'deposits' : 'transfers');

  const getTitle = () => {
    if (tab === 'transfers') return t('history.transfersTitle');
    if (tab === 'deposits') return t('history.depositsTitle');
    return t('history.title');
  };

  return (
    <>
      <Helmet>
        <title>{getTitle()} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-5"
          >
            <Button
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] hover:bg-transparent p-0"
              onClick={() => navigate("/agent/dashboard")}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t("common.back")}
            </Button>

            <div className="flex-1" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            {getTitle()}
          </h1>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-1">
              <TabsTrigger
                value="transfers"
                className="w-1/2 rounded-xl data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black"
              >
                {t("history.transfers")}
              </TabsTrigger>

              <TabsTrigger
                value="deposits"
                className="w-1/2 rounded-xl data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black"
              >
                {t("history.deposits")}
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="transfers">
                <TransfersHistory />
              </TabsContent>

              <TabsContent value="deposits">
                <DepositsHistory />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AgentHistory;