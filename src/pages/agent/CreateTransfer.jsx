import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CreateTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    amount: '',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: t("transfer.create.successTitle"),
        description: t("transfer.create.successDesc"),
      });
      navigate('/agent/dashboard');
    }, 1500);
  };

  return (
    <>
      <Helmet>
        <title>{t("transfer.create.title")} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/agent/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.backToDashboard")}
            </Button>
            <h1 className="text-3xl font-bold text-[#FFFFFF]">{t("transfer.create.title")}</h1>
            <p className="text-[#A0A0A0] mt-2">{t("transfer.create.subtitle")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-2xl p-8 border border-[#2A2A2A]"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#D4AF37]">{t("transfer.create.senderInfo")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderName" className="text-[#A0A0A0]">{t("transfer.create.fullName")}</Label>
                    <Input
                      id="senderName"
                      type="text"
                      placeholder="Juan Pérez"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      required
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderPhone" className="text-[#A0A0A0]">{t("transfer.create.phone")}</Label>
                    <Input
                      id="senderPhone"
                      type="tel"
                      placeholder="+1 809-555-1234"
                      value={formData.senderPhone}
                      onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                      required
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#D4AF37]">{t("transfer.create.receiverInfo")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receiverName" className="text-[#A0A0A0]">{t("transfer.create.fullName")}</Label>
                    <Input
                      id="receiverName"
                      type="text"
                      placeholder="Pierre Duval"
                      value={formData.receiverName}
                      onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                      required
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiverPhone" className="text-[#A0A0A0]">{t("transfer.create.phone")}</Label>
                    <Input
                      id="receiverPhone"
                      type="tel"
                      placeholder="+509 3456-7890"
                      value={formData.receiverPhone}
                      onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                      required
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[#A0A0A0]">{t("transfer.create.amountUSD")}</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="500.00"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#A0A0A0]">{t("transfer.create.notes")}</Label>
                <Input
                  id="notes"
                  type="text"
                  placeholder="Additional information..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-[#0B0B0B] font-semibold py-6 rounded-xl gold-glow-btn"
              >
                <Send className="w-5 h-5 mr-2" />
                {isLoading ? t("transfer.create.processing") : t("transfer.create.button")}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CreateTransfer;