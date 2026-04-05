import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Copy, ShieldAlert, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

const CreateAdminForm = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
  });

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 14; i++) {
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
    
    // Validation
    if (!formData.email || !formData.password || !formData.nom || !formData.prenom) {
        toast({ variant: 'destructive', description: t('validation.required') });
        return;
    }

    if (formData.password.length < 8) {
       toast({ variant: 'destructive', description: t('validation.passwordTooShort') });
       return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-admin-account', {
        body: {
            email: formData.email,
            password: formData.password,
            nom: formData.nom,
            prenom: formData.prenom
        }
      });

      if (error) throw error;
      
      // Handle logical errors (like duplicate user) gracefully
      if (data && data.success === false) {
        throw new Error(data.message || "Erreur lors de la création");
      }

      if (data?.error) throw new Error(data.error);

      // Success
      setCreatedInfo({
        email: formData.email,
        password: formData.password
      });

      toast({
        className: "bg-purple-600 text-white border-none",
        title: t('common.success'),
        description: t('messages.accountCreated') || "Compte administrateur créé avec succès",
      });

      // Clear form sensitive data
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        password: '',
      });

      // AUDIT FIX: Added redirection after success
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 3000);

    } catch (error) {
      console.error("Admin creation error:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message || "Échec de la création du compte administrateur"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdInfo) {
      const text = `Email: ${createdInfo.email}\nPassword: ${createdInfo.password}`;
      navigator.clipboard.writeText(text);
      toast({ title: t('common.copied'), description: t('messages.credentialsCopied') });
    }
  };

  return (
    <div className="bg-[#1E1E1E] p-8 rounded-2xl border border-purple-500/30 space-y-6 shadow-xl relative overflow-hidden">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600 opacity-5 rounded-bl-full pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 rounded-full bg-purple-500/20 text-purple-500">
           <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-white">Créer un Administrateur</h2>
            <p className="text-xs text-[#A0A0A0]">Accès complet au système</p>
        </div>
      </div>

      {createdInfo && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-6 bg-purple-500/10 border border-purple-500 rounded-xl relative z-10"
        >
          <h3 className="text-purple-500 font-bold text-lg mb-2">✅ {t('common.success')}!</h3>
          <p className="text-xs text-purple-300 mb-4">Redirection vers le tableau de bord dans 3 secondes...</p>
          <div className="bg-[#0B0B0B] p-4 rounded-lg font-mono text-sm space-y-1 text-white border border-[#2A2A2A]">
            <p>Email: <span className="text-[#A0A0A0]">{createdInfo.email}</span></p>
            <p>Password: <span className="text-[#A0A0A0]">{createdInfo.password}</span></p>
          </div>
          <Button onClick={copyToClipboard} size="sm" className="mt-4 bg-purple-600 text-white hover:bg-purple-700 border-none">
            <Copy className="w-4 h-4 mr-2" /> {t('buttons.copyCredentials')}
          </Button>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">{t('forms.nom')}</Label>
            <Input 
                id="nom" 
                value={formData.nom} 
                onChange={handleChange} 
                required 
                placeholder="Nom"
                className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-purple-500" 
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
                className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-purple-500" 
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[#A0A0A0]">{t('forms.email')}</Label>
            <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="admin@vsxpress.com"
                className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-purple-500" 
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex justify-between">
              <Label className="text-[#A0A0A0]">{t('forms.password')}</Label>
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1"
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
                className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-purple-500" 
            />
            <p className="text-xs text-[#A0A0A0] mt-1">{t('validation.passwordTooShort')}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2A2A2A]">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg mb-6">
                <p className="text-xs text-yellow-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Attention : Ce compte aura un accès complet à toutes les données.
                </p>
            </div>

            <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-purple-600 text-white hover:bg-purple-700 font-semibold py-6 rounded-xl transition-all shadow-lg shadow-purple-600/20"
            >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <ShieldAlert className="mr-2 w-5 h-5" />}
            {isLoading ? t('common.loading') : "Créer l'Administrateur"}
            </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateAdminForm;