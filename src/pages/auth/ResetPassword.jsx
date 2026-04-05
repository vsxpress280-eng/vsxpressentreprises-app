import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, KeyRound } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email, action: 'get_question' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.question) {
        setSecurityQuestion(data.question);
        setStep(2);
      } else {
        throw new Error('No security question found for this user.');
      }
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

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('validation.passwordMismatch')
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email, answer, new_password: newPassword, action: 'verify_reset' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('common.success'),
        description: t('auth.resetPassword.success')
      });
      
      setTimeout(() => navigate('/login'), 2000);
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
        <title>{t('auth.resetPassword.title')} - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#1E1E1E] rounded-2xl p-8 border border-[#2A2A2A]"
        >
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('auth.resetPassword.title')}</h1>
            <p className="text-[#A0A0A0] text-sm mt-2">{t('auth.resetPassword.desc')}</p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#A0A0A0]">{t('auth.login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('auth.login.emailPlaceholder')}
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F]">
                {loading ? <Loader2 className="animate-spin mr-2" /> : t('common.submit')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-6">
              <div className="p-4 bg-[#D4AF37]/5 rounded-lg border border-[#D4AF37]/20 mb-4">
                <p className="text-sm text-[#D4AF37] font-medium mb-1">{t('auth.resetPassword.securityQuestion')}:</p>
                <p className="text-white">{securityQuestion}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer" className="text-[#A0A0A0]">{t('auth.resetPassword.securityAnswer')}</Label>
                <Input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#A0A0A0]">{t('auth.resetPassword.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#A0A0A0]">{t('auth.resetPassword.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F]">
                {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth.resetPassword.button')}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-[#A0A0A0] hover:text-[#D4AF37] inline-flex items-center">
              <ArrowLeft className="w-3 h-3 mr-1" /> {t('auth.resetPassword.backToLogin')}
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ResetPassword;