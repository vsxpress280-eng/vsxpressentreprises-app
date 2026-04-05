import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Copy, UserPlus, Briefcase, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const CreateWorkerForm = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    username: '',
    adresse: '',
    numero: '',
    email: '',
    password: '',
    exchange_type: 'DOP',
    exchange_rate: '',
  });

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, exchange_type: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('validation.passwordTooShort') || 'Le mot de passe est trop court',
      });
      return;
    }

    if (!formData.exchange_rate || parseFloat(formData.exchange_rate) <= 0) {
      toast({ 
        variant: 'destructive', 
        title: t('common.error'),
        description: 'Le taux de change doit être supérieur à 0' 
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1) Crée le worker via Edge Function (Auth + DB + Wallet)
      const { data, error } = await supabase.functions.invoke('create-worker', {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedInfo({
        email: formData.email,
        password: formData.password,
      });

      toast({
        className: 'bg-green-600 text-white border-none',
        title: t('common.success'),
        description: t('messages.workerCreated') || 'Worker créé avec succès',
      });

      // Reset sensitive fields
      setFormData(prev => ({
        ...prev,
        nom: '',
        prenom: '',
        username: '',
        adresse: '',
        numero: '',
        email: '',
        password: '',
      }));
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err?.message || t('common.error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!createdInfo) return;
    const text = `Email: ${createdInfo.email}\nPassword: ${createdInfo.password}`;
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.copied') || 'Copié',
      description: t('messages.credentialsCopied') || 'Identifiants copiés',
    });
  };

  return (
    <div className="bg-[#1E1E1E] p-8 rounded-2xl border border-[#2A2A2A] space-y-6 shadow-xl relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#0E7A57]/5 rounded-bl-full pointer-events-none" />

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 rounded-full bg-[#0E7A57]/20 text-[#0E7A57] border border-[#0E7A57]/30">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {t('pages.createWorker.title') || 'Créer un Worker'}
          </h2>
          <p className="text-xs text-[#A0A0A0]">Gestionnaire de transactions</p>
        </div>
      </div>

      <AnimatePresence>
        {createdInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-[#0E7A57]/10 border border-[#0E7A57] rounded-xl overflow-hidden"
          >
            <h3 className="text-[#0E7A57] font-bold text-lg mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> 
              {t('common.success')}!
            </h3>
            <div className="bg-[#0B0B0B] p-4 rounded-lg font-mono text-sm space-y-1 text-white border border-[#2A2A2A]">
              <p>
                <span className="text-[#A0A0A0]">Email:</span> {createdInfo.email}
              </p>
              <p>
                <span className="text-[#A0A0A0]">Password:</span> {createdInfo.password}
              </p>
            </div>
            <Button
              onClick={copyToClipboard}
              size="sm"
              className="mt-4 bg-[#0E7A57] text-white hover:bg-[#0E7A57]/80"
            >
              <Copy className="w-4 h-4 mr-2" /> {t('buttons.copyCredentials') || 'Copier les identifiants'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.nom')}</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              placeholder="Nom de famille"
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.prenom')}</Label>
            <Input
              id="prenom"
              value={formData.prenom}
              onChange={handleChange}
              required
              placeholder="Prénom"
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.username')}</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Nom d'utilisateur"
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="worker@example.com"
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.adresse')}</Label>
            <Input
              id="adresse"
              value={formData.adresse}
              onChange={handleChange}
              placeholder="Adresse complète"
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.numero')}</Label>
            <Input
              id="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="+509..."
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Type de change</Label>
            <Select value={formData.exchange_type} onValueChange={handleSelectChange}>
              <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]">
                <SelectValue placeholder="Sélectionner une devise" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                <SelectItem value="DOP">DOP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="ZELLE">ZELLE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Taux de change (Rate)</Label>
            <Input
              id="exchange_rate"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 58.50"
              value={formData.exchange_rate}
              onChange={handleChange}
              required
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex justify-between">
              <Label className="text-[#A0A0A0]">{t('forms.password')}</Label>
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-xs text-[#0E7A57] hover:text-[#10B981] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Générer
              </button>
            </div>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#0E7A57]"
            />
            <p className="text-xs text-[#A0A0A0] mt-1">{t('validation.passwordTooShort')}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2A2A2A]">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0E7A57] text-white hover:bg-[#10B981] font-semibold py-6 rounded-xl shadow-lg shadow-[#0E7A57]/20"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2 w-5 h-5" />}
            {isLoading ? t('common.loading') : t('pages.createWorker.submit') || 'Créer le Worker'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateWorkerForm;