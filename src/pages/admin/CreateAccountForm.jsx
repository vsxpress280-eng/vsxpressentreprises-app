import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { computeCreditPreview } from '@/lib/creditPreviewUtils';

const CreateAccountForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [createdUserEmail, setCreatedUserEmail] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: '',
    team: '',
    exchangeRate: '4.19', // ✅ Valeur par défaut
    initialCredit: '0' // New credit field
  });

  // Calculate live preview for Agent creation
  const creditPreview = computeCreditPreview({
    creditInputHTG: formData.initialCredit,
    rate: formData.exchangeRate,
    walletCurrency: 'DOP' // Implicitly DOP for this form based on label
  });

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 === DEBUT CRÉATION COMPTE ===');
    console.log('FormData complet:', formData);
    
    if (!formData.fullName || !formData.email || !formData.role) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('messages.validationError'),
      });
      return;
    }

    // ✅ Validation du taux pour les agents
    if (formData.role === 'agent') {
      const rate = Number(formData.exchangeRate);
      console.log('🔍 Validation du taux pour agent:');
      console.log('  - exchangeRate (string):', formData.exchangeRate);
      console.log('  - exchangeRate (number):', rate);
      console.log('  - isFinite:', Number.isFinite(rate));
      console.log('  - rate > 0:', rate > 0);
      
      if (!rate || rate <= 0 || !Number.isFinite(rate)) {
        console.log('❌ Taux invalide détecté!');
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: 'Veuillez entrer un taux de change valide',
        });
        return;
      }
      console.log('✅ Taux valide');
    }

    setIsLoading(true);
    const newTempPassword = generateTempPassword();

    try {
      const requestBody = {
        email: formData.email,
        password: newTempPassword,
        fullName: formData.fullName,
        role: formData.role,
        team: formData.team
      };

      // ✅ Ajouter exchangeRate et credit seulement pour les agents
      if (formData.role === 'agent') {
        requestBody.exchangeRate = formData.exchangeRate;
        requestBody.initialCredit = formData.initialCredit; // Send initial credit to backend
        console.log('✅ exchangeRate et initialCredit ajoutés au requestBody');
      }

      // 🔍 DEBUG - Loggez ce qui est envoyé
      console.log('📤 === REQUEST BODY ENVOYÉ ===');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('===============================');

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: requestBody
      });

      // 🔍 DEBUG - Loggez la réponse
      console.log('📥 === RÉPONSE DE L\'EDGE FUNCTION ===');
      console.log('Data:', data);
      console.log('Error:', error);
      console.log('======================================');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTempPassword(newTempPassword);
      setCreatedUserEmail(formData.email);
      setShowTempPassword(true);
      
      toast({
        title: t('common.success'),
        description: t('messages.accountCreated'),
      });

      console.log('✅ Compte créé avec succès!');

      // Clear form except the success message
      setFormData({
        fullName: '',
        email: '',
        role: '',
        team: '',
        exchangeRate: '4.19',
        initialCredit: '0'
      });

    } catch (error) {
      console.error('❌ === ERREUR CRÉATION COMPTE ===');
      console.error('Error message:', error.message);
      console.error('Error complet:', error);
      console.error('=================================');
      
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('common.error'),
      });
    } finally {
      setIsLoading(false);
      console.log('🔍 === FIN CRÉATION COMPTE ===');
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(`Email: ${createdUserEmail}\nPassword: ${tempPassword}`);
    toast({
      title: t('common.copied'),
      description: t('messages.credentialsCopied'),
    });
  };

  return (
    <>
      <Helmet>
        <title>{t('forms.createAccount')} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('buttons.backToDashboard')}
            </Button>
            <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('common.create')} {t('forms.selectRole')}</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-2xl p-8 border border-[#2A2A2A]"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[#A0A0A0]">{t('forms.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#A0A0A0]">{t('forms.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@vsxpress.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#A0A0A0]">{t('forms.role')}</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                    <SelectValue placeholder={t('forms.selectRole')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">{t('tables.agent')}</SelectItem>
                    <SelectItem value="worker">{t('tables.worker')}</SelectItem>
                    <SelectItem value="special-agent">Special Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ✅ Champs spécifiques pour les agents */}
              {formData.role === 'agent' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 border-l-2 border-[#D4AF37] pl-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="exchangeRate" className="text-[#A0A0A0]">
                      Taux de Change (1 DOP = ? HTG) <span className="text-[#D4AF37]">*</span>
                    </Label>
                    <Input
                      id="exchangeRate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="4.19"
                      value={formData.exchangeRate}
                      onChange={(e) => {
                        console.log('🔍 Changement du taux:', e.target.value);
                        setFormData({ ...formData, exchangeRate: e.target.value });
                      }}
                      required
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                    />
                    <p className="text-xs text-[#A0A0A0]">
                      Exemple: Si 1 DOP = 4.19 HTG, entrez 4.19
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initialCredit" className="text-[#A0A0A0]">
                      Crédit Initial (HTG)
                    </Label>
                    <Input
                      id="initialCredit"
                      type="number"
                      min="0"
                      value={formData.initialCredit}
                      onChange={(e) => setFormData({ ...formData, initialCredit: e.target.value })}
                      className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37]"
                    />
                    
                    {/* Live Credit Preview */}
                    <AnimatePresence>
                      {formData.initialCredit > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2"
                        >
                          {creditPreview.isValid ? (
                            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                              <span className="text-green-500 font-bold text-sm">
                                Estimation: {creditPreview.currency} {creditPreview.estimatedAmount}
                              </span>
                              <span className="text-gray-400 text-xs">
                                Formule: {creditPreview.formula}
                              </span>
                            </div>
                          ) : (
                            <div className="text-red-500 text-xs p-1">
                              {creditPreview.errorMessage}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="team" className="text-[#A0A0A0]">{t('forms.team')} ({t('common.optional')})</Label>
                <Select value={formData.team} onValueChange={(value) => setFormData({ ...formData, team: value })}>
                  <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF]">
                    <SelectValue placeholder={t('forms.selectTeam')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                    <SelectItem value="team-a">Team A - Santiago</SelectItem>
                    <SelectItem value="team-b">Team B - Santo Domingo</SelectItem>
                    <SelectItem value="team-c">Team C - Port-au-Prince</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showTempPassword && tempPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[#0B0B0B] border-2 border-[#D4AF37] rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center gap-2 text-[#D4AF37] font-semibold">
                    <UserPlus className="w-5 h-5" />
                    <span>{t('messages.accountCreated')}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A0A0A0]">{t('forms.password')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showTempPassword ? 'text' : 'password'}
                        value={tempPassword}
                        readOnly
                        className="bg-[#1E1E1E] border-[#2A2A2A] text-[#FFFFFF] font-mono"
                      />
                      <Button
                        type="button"
                        onClick={() => setShowTempPassword(!showTempPassword)}
                        variant="outline"
                        className="border-[#2A2A2A]"
                      >
                        {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        onClick={copyPassword}
                        className="bg-[#D4AF37] hover:bg-[#B8941F] text-[#0B0B0B]"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-[#0B0B0B] font-semibold py-6 rounded-xl gold-glow-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    {t('common.create')}
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CreateAccountForm;