import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  Settings,
  FileWarning
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DownloadApp = () => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const isNative = Capacitor.isNativePlatform();

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    }, 1500);
    window.location.href = 'https://github.com/vsxpress280-eng/vsxpressentreprises-app/releases/download/v1.0.1/VSXpress-v1.0.1.apk';
  };

  const steps = [
    {
      icon: <Download className="w-6 h-6 text-[#D4AF37]" />,
      title: "Télécharger l'APK",
      description: "Appuyez sur le bouton de téléchargement ci-dessus pour obtenir le fichier d'installation."
    },
    {
      icon: <Settings className="w-6 h-6 text-[#D4AF37]" />,
      title: "Autoriser l'installation",
      description: "Allez dans Paramètres > Sécurité et activez 'Sources inconnues' ou 'Installation d'applis inconnues'."
    },
    {
      icon: <FileWarning className="w-6 h-6 text-[#D4AF37]" />,
      title: "Ouvrir le fichier",
      description: "Trouvez le fichier téléchargé dans vos notifications ou votre dossier Téléchargements."
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />,
      title: "Installer et profiter",
      description: "Appuyez sur 'Installer' et attendez la fin du processus. Vous êtes prêt !"
    }
  ];

  const faqs = [
    {
      question: "Pourquoi l'application n'est-elle pas sur le Play Store ?",
      answer: "Pour vous offrir des mises à jour plus rapides et éviter les délais de validation, nous distribuons notre application directement. Elle est 100% sécurisée et vérifiée."
    },
    {
      question: "Est-ce dangereux d'installer une APK ?",
      answer: "Notre APK est sécurisée. Le message d'avertissement d'Android est standard pour toutes les applications téléchargées hors du Play Store. Vous pouvez l'installer en toute confiance."
    },
    {
      question: "L'application fonctionne-t-elle sur iPhone ?",
      answer: "Actuellement, notre application est disponible uniquement pour les appareils Android. Les utilisateurs iOS peuvent continuer à utiliser notre plateforme web mobile optimisée."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <Helmet>
        <title>Télécharger l'Application | VS XPRESS</title>
        <meta name="description" content="Téléchargez l'application mobile VS XPRESS ENTREPRISE pour Android." />
      </Helmet>

      {/* Navigation Bar */}
      <nav className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-50">
        <Link to="/login" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </Link>
        <div className="text-[#D4AF37] font-bold tracking-wide">VS XPRESS</div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-12">

        {/* Hero Section */}
        <section className="text-center pt-8 pb-4 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 mb-6 rounded-2xl overflow-hidden bg-[#1A1A1A] border-2 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)]"
          >
            <img
              src="https://horizons-cdn.hostinger.com/33b3eaaa-66f9-4e26-bd8b-9ffa2c491ada/0ccbbb834409cecfb75836c33dad2124.jpg"
              alt="VS XPRESS Logo"
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold mb-4"
          >
            L'Application <span className="text-[#D4AF37]">VS XPRESS</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-gray-400 mb-8 max-w-md mx-auto"
          >
            Gérez vos transferts plus rapidement, recevez des notifications en temps réel et accédez à votre tableau de bord n'importe où.
          </motion.p>

          {/* Bouton téléchargement — caché sur APK */}
          {!isNative && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full max-w-sm"
            >
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className={`w-full h-14 text-lg font-bold rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${downloaded
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-[#D4AF37] hover:bg-[#B5952F] text-black"
                  }`}
              >
                {downloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Préparation...
                  </>
                ) : downloaded ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Téléchargement Lancé
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    Télécharger pour Android
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Version 1.0.1 (Sécurisée)
              </p>
            </motion.div>
          )}

          {/* Message affiché sur APK */}
          {isNative && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full max-w-sm bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-xl p-4 text-center"
            >
              <CheckCircle2 className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
              <p className="text-white font-semibold">Vous utilisez déjà l'application !</p>
              <p className="text-gray-400 text-sm mt-1">Version 1.0.1</p>
            </motion.div>
          )}
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Zap className="w-8 h-8 text-[#D4AF37]" />, title: "Ultra Rapide", desc: "Performances optimisées" },
            { icon: <Smartphone className="w-8 h-8 text-[#D4AF37]" />, title: "Interface Native", desc: "Expérience fluide" },
            { icon: <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />, title: "Sécurisé", desc: "Données protégées" }
          ].map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + (idx * 0.1), duration: 0.5 }}
              className="bg-[#111] border border-white/5 rounded-2xl p-6 text-center flex flex-col items-center gap-3"
            >
              <div className="p-3 bg-black rounded-full border border-white/5">
                {feat.icon}
              </div>
              <h3 className="font-bold text-white">{feat.title}</h3>
              <p className="text-sm text-gray-400">{feat.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Installation Steps — cachés sur APK */}
        {!isNative && (
          <section>
            <h2 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4">Comment Installer ?</h2>
            <div className="space-y-6">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                      {step.icon}
                    </div>
                    {idx !== steps.length - 1 && (
                      <div className="w-px h-full bg-[#333] mt-2"></div>
                    )}
                  </div>
                  <div className="pt-3 pb-8">
                    <h3 className="font-bold text-lg text-white mb-1">
                      <span className="text-[#D4AF37] mr-2">{idx + 1}.</span>
                      {step.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4">Questions Fréquentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left p-4 flex items-center justify-between font-medium text-white hover:bg-white/5 transition-colors"
                >
                  {faq.question}
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 text-gray-400 text-sm leading-relaxed border-t border-white/5">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default DownloadApp;