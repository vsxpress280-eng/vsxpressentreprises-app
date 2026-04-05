// src/pages/agent/AgentSettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Globe, Lock, ChevronRight, Bell, Play, Check } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { NOTIFICATION_SOUNDS, DEFAULT_SOUND_AGENT, getUserSound, saveUserSound, playSound } from '@/hooks/useNotificationSound';

const AgentSettings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedSound, setSelectedSound] = useState(DEFAULT_SOUND_AGENT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getUserSound(user.id).then(sound => {
        if (sound) setSelectedSound(sound);
      });
    }
  }, [user]);

  const handleSelectSound = (soundId) => {
    setSelectedSound(soundId);
    playSound(soundId);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    await saveUserSound(user.id, selectedSound);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>{t('settings.title', 'Paramètres')} - Agent</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white pb-24">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Button onClick={() => navigate('/agent/dashboard')} variant="ghost" className="pl-0 text-[#A0A0A0] hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('buttons.backToDashboard', 'Retour au tableau de bord')}
            </Button>
            <h1 className="text-3xl font-bold">{t('settings.title', 'Paramètres')}</h1>
            <p className="text-[#A0A0A0] mt-1">{t('settings.subtitle', 'Gérez vos préférences et votre sécurité')}</p>
          </motion.div>

          <div className="space-y-6">

            {/* Language Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="font-semibold">{t('settings.language', 'Langue')}</h2>
              </div>
              <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">{t('settings.appLanguage', 'Langue de l\'application')}</p>
                  <p className="text-xs text-[#A0A0A0] mt-1">{t('settings.languageDesc', 'Choisissez votre langue préférée pour l\'interface')}</p>
                </div>
                <LanguageSwitcher />
              </div>
            </motion.div>

            {/* Notification Sound Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="font-semibold">Son des notifications</h2>
                  <p className="text-xs text-[#A0A0A0]">Cliquez sur un son pour le prévisualiser</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => handleSelectSound(sound.id)}
                    className={`relative flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${
                      selectedSound === sound.id
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-[#2A2A2A] bg-[#111] text-[#A0A0A0] hover:border-[#444] hover:text-white'
                    }`}
                  >
                    <Play className="w-3 h-3 shrink-0" />
                    <span>{sound.label}</span>
                    {selectedSound === sound.id && (
                      <Check className="w-3 h-3 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full font-semibold rounded-xl ${saved ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-[#D4AF37] hover:bg-[#B8941F] text-black'}`}
                >
                  {saved ? '✓ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder le son'}
                </Button>
              </div>
            </motion.div>

            {/* Security Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="font-semibold">{t('settings.security', 'Sécurité')}</h2>
              </div>
              <div className="divide-y divide-[#2A2A2A]">
                <button onClick={() => navigate('/profile/change-password')} className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center group-hover:bg-[#000] transition-colors">
                      <Lock className="w-5 h-5 text-[#A0A0A0] group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">{t('settings.changePassword', 'Changer le mot de passe')}</p>
                      <p className="text-xs text-[#A0A0A0]">{t('settings.changePasswordDesc', 'Mettez à jour votre mot de passe pour plus de sécurité')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#A0A0A0] group-hover:text-[#D4AF37] transition-colors" />
                </button>
                <div className="p-4 hover:bg-[#252525] transition-colors cursor-pointer group" onClick={() => navigate('/auth/set-security-question')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center group-hover:bg-[#000] transition-colors">
                        <Shield className="w-4 h-4 text-[#A0A0A0] group-hover:text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-white">{t('auth.setSecurityQuestion.title')}</p>
                        <p className="text-xs text-[#666]">{t('settings.securityQuestionDesc', 'Définir ou modifier votre question de sécurité')}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#A0A0A0] group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AgentSettings;