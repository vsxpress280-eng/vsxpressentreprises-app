import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Copy, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

const CreateSpecialAgentForm = () => {
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
    taux_change: '1.0',
    frais: '0',
    credit_limit: '0'
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
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
       toast({ variant: 'destructive', description: t('validation.passwordTooShort') });
       return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-special-agent', {
        body: formData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCreatedInfo({
        email: formData.email,
        password: formData.password
      });

      toast({
        className: "bg-[#D4AF37] text-black border-none",
        title: t('common.success'),
        description: t('messages.specialAgentCreated'),
      });

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

    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message || t('common.error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdInfo) {
      const text = `${t('forms.email')}: ${createdInfo.email}\n${t('forms.password')}: ${createdInfo.password}`;
      navigator.clipboard.writeText(text);
      toast({ title: t('common.copied'), description: t('messages.credentialsCopied') });
    }
  };

  return (
    <div className="bg-[#1E1E1E] p-8 rounded-2xl border border-[#D4AF37]/30 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-5 rounded-bl-full pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
           <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">{t('pages.createSpecialAgent.title')}</h2>
      </div>

      {createdInfo && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-6 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-xl relative z-10"
        >
          <h3 className="text-[#D4AF37] font-bold text-lg mb-2">✅ {t('common.success')}!</h3>
          <div className="bg-[#0B0B0B] p-4 rounded-lg font-mono text-sm space-y-1 text-white border border-[#2A2A2A]">
            <p>{t('forms.email')}: <span className="text-[#A0A0A0]">{createdInfo.email}</span></p>
            <p>{t('forms.password')}: <span className="text-[#A0A0A0]">{createdInfo.password}</span></p>
          </div>
          <Button onClick={copyToClipboard} size="sm" className="mt-4 bg-[#D4AF37] text-black hover:bg-[#B8941F]">
            <Copy className="w-4 h-4 mr-2" /> {t('buttons.copyCredentials')}
          </Button>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.nom')}</Label>
            <Input id="nom" value={formData.nom} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.prenom')}</Label>
            <Input id="prenom" value={formData.prenom} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.username')}</Label>
            <Input id="username" value={formData.username} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.email')}</Label>
            <Input id="email" type="email" value={formData.email} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.adresse')}</Label>
            <Input id="adresse" value={formData.adresse} onChange={handleChange} className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.numero')}</Label>
            <Input id="numero" value={formData.numero} onChange={handleChange} className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
          </div>
          
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#2A2A2A]">
             <div className="space-y-2">
                <Label className="text-[#D4AF37]">{t('forms.tauxChange')}</Label>
                <Input id="taux_change" type="number" step="0.01" value={formData.taux_change} onChange={handleChange} required className="bg-[#0B0B0B] border-[#D4AF37]/50 text-white focus:border-[#D4AF37]" />
             </div>
             <div className="space-y-2">
                <Label className="text-[#D4AF37]">{t('forms.frais')}</Label>
                <Input id="frais" type="number" step="0.01" value={formData.frais} onChange={handleChange} required className="bg-[#0B0B0B] border-[#D4AF37]/50 text-white focus:border-[#D4AF37]" />
             </div>
             <div className="space-y-2">
                <Label className="text-[#D4AF37]">{t('forms.creditLimit')}</Label>
                <Input id="credit_limit" type="number" step="0.01" value={formData.credit_limit} onChange={handleChange} className="bg-[#0B0B0B] border-[#D4AF37]/50 text-white focus:border-[#D4AF37]" />
             </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex justify-between">
              <Label className="text-[#A0A0A0]">{t('forms.password')}</Label>
              <button type="button" onClick={generatePassword} className="text-xs text-[#D4AF37] flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Générer</button>
            </div>
            <Input id="password" type="text" value={formData.password} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]" />
            <p className="text-xs text-[#A0A0A0] mt-1">{t('validation.passwordTooShort')}</p>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F] font-semibold py-6 rounded-xl mt-6 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] gold-glow-btn"
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 w-5 h-5" />}
          {isLoading ? t('common.loading') : t('pages.createSpecialAgent.submit')}
        </Button>
      </form>
    </div>
  );
};

export default CreateSpecialAgentForm;