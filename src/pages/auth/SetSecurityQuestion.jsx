import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SetSecurityQuestion = () => {
  const navigate = useNavigate();
  const { user, refreshSecurityStatus } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const questions = [
    "Quel est ton premier téléphone ?",
    "Quelle est ta ville de naissance ?",
    "Quel est le nom de ton premier animal de compagnie ?",
    "Quel est ton film préféré ?",
    "Quel est le nom de ta mère ?"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || !answer) {
      toast({ variant: "destructive", title: t('common.error'), description: t('messages.validationError') });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('set-security-question', {
        body: { user_id: user.id, question, answer }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshSecurityStatus();
      
      toast({
        title: t('common.success'),
        description: t('messages.accountCreated') // Reuse success message or create specific one
      });
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.setSecurityQuestion.title')} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#1E1E1E] rounded-2xl p-8 border border-[#D4AF37]/30 shadow-lg shadow-[#D4AF37]/5"
        >
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('auth.setSecurityQuestion.title')}</h1>
            <p className="text-[#A0A0A0] mt-2">{t('auth.setSecurityQuestion.desc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">{t('auth.setSecurityQuestion.selectQuestion')}</Label>
              <Select value={question} onValueChange={setQuestion}>
                <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                  <SelectValue placeholder={t('auth.setSecurityQuestion.selectQuestion')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                  {questions.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">{t('auth.setSecurityQuestion.enterAnswer')}</Label>
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('auth.setSecurityQuestion.enterAnswer')}
                required
                className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F] font-bold py-6 rounded-xl gold-glow-btn"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth.setSecurityQuestion.button')}
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default SetSecurityQuestion;