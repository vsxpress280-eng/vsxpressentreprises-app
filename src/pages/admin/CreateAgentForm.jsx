import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, Loader2, Copy, Upload, FileCheck, Calculator, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computeCreditPreview } from '@/lib/creditPreviewUtils';
import MoneyInput from '@/components/ui/MoneyInput';

const CreateAgentForm = ({ embedded = false, prefill = null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');

  // ✅ Used to avoid re-applying prefill multiple times / avoid overwriting user edits
  const hasAppliedPrefillRef = useRef(false);

  // ✅ Used to avoid suggested rates overwriting prefilled/manual values
  const autoRateInitializedRef = useRef(false);
  const autoBalanceRateInitializedRef = useRef(false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    username: '',
    adresse: '',
    numero: '',
    email: '',
    piece_identite: '',
    credit: '', // ✅ Managed by MoneyInput (Number or string)
    taux_change: '', // Transfer Rate
    frais: '',
    associated_worker: '',
    password: '',
    exchange_type: 'DOP', // Transfer Type
    balance_exchange_type: 'HTG',
    balance_exchange_rate: '',
    id_type: '',
    uploaded_id_url: ''
  });

  const [estimatedAmount, setEstimatedAmount] = useState('0');

  // ✅ Apply prefill once
  useEffect(() => {
    if (!prefill) return;
    if (hasAppliedPrefillRef.current) return;

    setFormData(prev => ({
      ...prev,
      nom: prefill?.nom ?? prev.nom,
      prenom: prefill?.prenom ?? prev.prenom,
      numero: prefill?.whatsapp_number ?? prev.numero,
      email: prefill?.email ?? prev.email,
      adresse: prefill?.adresse ?? prev.adresse,
    }));

    hasAppliedPrefillRef.current = true;
  }, [prefill]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  // ✅ Auto-fill suggested rates for Transfer Rate (only if empty AND only once per type)
  useEffect(() => {
    if (autoRateInitializedRef.current) return;
    if (formData.taux_change) return;

    let suggestedRate = '';
    switch (formData.exchange_type) {
      case 'USDT':
      case 'USD':
      case 'ZELLE':
        suggestedRate = '58.0';
        break;
      case 'DOP':
        suggestedRate = '0.25';
        break;
      case 'HTG':
        suggestedRate = '1.0';
        break;
      default:
        suggestedRate = '';
        break;
    }

    if (suggestedRate) {
      setFormData(prev => ({ ...prev, taux_change: suggestedRate }));
      autoRateInitializedRef.current = true;
    }
  }, [formData.exchange_type, formData.taux_change]);

  // ✅ Auto-fill suggested rates for Balance Rate (only if empty AND only once per type)
  useEffect(() => {
    if (autoBalanceRateInitializedRef.current) return;
    if (formData.balance_exchange_rate) return;

    let suggestedRate = '';
    switch (formData.balance_exchange_type) {
      case 'USDT':
      case 'USD':
      case 'ZELLE':
        suggestedRate = '58.0';
        break;
      case 'DOP':
        suggestedRate = '4.0';
        break;
      case 'HTG':
        suggestedRate = '1.0';
        break;
      default:
        suggestedRate = '';
        break;
    }

    if (suggestedRate) {
      setFormData(prev => ({ ...prev, balance_exchange_rate: suggestedRate }));
      autoBalanceRateInitializedRef.current = true;
    }
  }, [formData.balance_exchange_type, formData.balance_exchange_rate]);

  // ✅ LIVE CREDIT PREVIEW: input = DOP, output = HTG
  const creditPreview = computeCreditPreview({
    creditInput: formData.credit,
    rate: formData.balance_exchange_rate || formData.taux_change,
    inputCurrency: 'DOP',
    outputCurrency: 'HTG',
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleMoneyChange = (id, val) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: t('validation.fileTooLarge'),
          description: t('validation.fileTooLarge')
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    setIsUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (event) => {
          try {
            const base64 = event.target.result.split(',')[1];
            const { data, error } = await supabase.functions.invoke('upload-id-document', {
              body: { file: base64, filename: filePath }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setUploadedFileUrl(data.url);
            setIsUploading(false);
            resolve(data.url);

            toast({
              title: t('common.success'),
              description: t('forms.uploadSuccess')
            });

          } catch (uploadError) {
            console.error(uploadError);
            setIsUploading(false);
            toast({
              variant: 'destructive',
              title: t('forms.uploadError'),
              description: uploadError.message
            });
            reject(uploadError);
          }
        };
        reader.readAsDataURL(selectedFile);
      });
    } catch (error) {
      setIsUploading(false);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id_type) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('validation.required') });
      return;
    }
    if (formData.id_type && !selectedFile && !uploadedFileUrl) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('validation.fileRequired') });
      return;
    }

    // Strict validation for exchange rates
    const rate = Number(formData.taux_change);
    const balanceRate = Number(formData.balance_exchange_rate);
    const credit = Number(formData.credit);
    const fees = Number(formData.frais);

    if (isNaN(rate) || rate <= 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: "Transfer Exchange rate must be a valid positive number." });
      return;
    }

    if (formData.balance_exchange_rate && (isNaN(balanceRate) || balanceRate <= 0)) {
      toast({ variant: 'destructive', title: t('common.error'), description: "Balance Exchange rate must be valid if provided." });
      return;
    }

    if (!formData.exchange_type) {
      toast({ variant: 'destructive', title: t('common.error'), description: "Please select a transfer currency type." });
      return;
    }

    setIsLoading(true);

    try {
      let finalUrl = uploadedFileUrl;
      if (selectedFile && !finalUrl) {
        finalUrl = await uploadFile();
        if (!finalUrl) throw new Error("Upload failed");
      }

      const payload = {
        ...formData,
        credit: isNaN(credit) ? 0 : credit,
        frais: isNaN(fees) ? 0 : fees,
        exchange_rate: rate,
        balance_exchange_rate: balanceRate || rate,
        balance_exchange_type: formData.balance_exchange_type || formData.exchange_type,
        uploaded_id_url: finalUrl
      };

      const { data, error } = await supabase.functions.invoke('create-agent-account', {
        body: payload
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedInfo({
        email: formData.email,
        password: formData.password
      });

      toast({
        className: "bg-blue-600 text-white border-none",
        title: t('common.success'),
        description: t('messages.accountCreated'),
      });

      // Reset form
      setFormData(prev => ({
        ...prev,
        nom: '',
        prenom: '',
        username: '',
        adresse: '',
        numero: '',
        email: '',
        piece_identite: '',
        credit: '',
        password: '',
        id_type: '',
        uploaded_id_url: ''
      }));
      setSelectedFile(null);
      setUploadedFileUrl('');

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
    <>
      {!embedded && (
        <Helmet>
          <title>{t('buttons.createAgent')} - Admin</title>
        </Helmet>
      )}

      <div className={`${embedded ? '' : 'min-h-screen bg-[#0B0B0B] p-6'}`}>
        <div className={`${embedded ? '' : 'max-w-4xl mx-auto'}`}>
          {!embedded && (
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('buttons.backToDashboard')}
            </Button>
          )}

          {!embedded && <h1 className="text-3xl font-bold text-white mb-8">{t('buttons.createAgent')}</h1>}

          {createdInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 p-6 bg-blue-500/10 border border-blue-500 rounded-xl"
            >
              <h3 className="text-blue-500 font-bold text-lg mb-2">✅ {t('common.success')}!</h3>
              <div className="bg-[#1E1E1E] p-4 rounded-lg font-mono text-sm space-y-1 text-white border border-[#2A2A2A]">
                <p>{t('forms.email')}: <span className="text-[#A0A0A0]">{createdInfo.email}</span></p>
                <p>{t('forms.password')}: <span className="text-[#A0A0A0]">{createdInfo.password}</span></p>
              </div>
              <Button onClick={copyToClipboard} size="sm" className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
                <Copy className="w-4 h-4 mr-2" /> {t('buttons.copyCredentials')}
              </Button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className={`bg-[#1E1E1E] p-8 rounded-2xl border border-[#2A2A2A] space-y-8 shadow-xl ${embedded ? 'border-[#2A2A2A]' : ''}`}>
            {/* Personal Info Section */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 border-b border-[#2A2A2A] pb-2">Information Personnelle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.name')}</Label>
                  <Input id="nom" value={formData.nom} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.firstName')}</Label>
                  <Input id="prenom" value={formData.prenom} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.username')}</Label>
                  <Input id="username" value={formData.username} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.email')}</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.phone')}</Label>
                  <Input id="numero" value={formData.numero} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.address')}</Label>
                  <Input id="adresse" value={formData.adresse} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-[#A0A0A0]">{t('forms.password')}</Label>
                    <button type="button" onClick={generatePassword} className="text-xs text-blue-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Générer
                    </button>
                  </div>
                  <Input id="password" type="text" value={formData.password} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Financial Info Section */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 border-b border-[#2A2A2A] pb-2">Information Financière</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Transfer Rate Config */}
                <div className="md:col-span-2 flex flex-col md:flex-row gap-6 p-4 bg-black/20 rounded-xl border border-white/5">
                  <div className="w-full space-y-2">
                    <Label className="text-white font-medium flex items-center gap-2">
                      {t('forms.exchangeType')} (Transferts)
                      <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">Principal</span>
                    </Label>
                    <Select
                      value={formData.exchange_type}
                      onValueChange={(val) => {
                        autoRateInitializedRef.current = false;
                        setFormData(prev => ({ ...prev, exchange_type: val }));
                      }}
                    >
                      <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                        <SelectValue placeholder={t('forms.exchangeType')} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="ZELLE">ZELLE</SelectItem>
                        <SelectItem value="DOP">DOP</SelectItem>
                        <SelectItem value="HTG">HTG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full space-y-2">
                    <MoneyInput
                      label={t('forms.exchangeRate')}
                      value={formData.taux_change}
                      onChange={(val) => handleMoneyChange('taux_change', val)}
                      placeholder="e.g. 58.50"
                      required
                    />
                    <p className="text-xs text-[#A0A0A0] flex items-center gap-1">
                      <Info className="w-3 h-3 text-blue-500" />
                      Utilisé pour le calcul des transferts
                    </p>
                  </div>
                </div>

                {/* Balance Rate Config */}
                <div className="md:col-span-2 flex flex-col md:flex-row gap-6 p-4 bg-black/20 rounded-xl border border-white/5">
                  <div className="w-full space-y-2">
                    <Label className="text-white font-medium flex items-center gap-2">
                      Type de Solde (Affichage)
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Wallet</span>
                    </Label>
                    <Select
                      value={formData.balance_exchange_type}
                      onValueChange={(val) => {
                        autoBalanceRateInitializedRef.current = false;
                        setFormData(prev => ({ ...prev, balance_exchange_type: val }));
                      }}
                    >
                      <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                        <SelectValue placeholder="Type de solde" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="ZELLE">ZELLE</SelectItem>
                        <SelectItem value="DOP">DOP</SelectItem>
                        <SelectItem value="HTG">HTG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full space-y-2">
                    <MoneyInput
                      label="Taux Solde"
                      value={formData.balance_exchange_rate}
                      onChange={(val) => handleMoneyChange('balance_exchange_rate', val)}
                      placeholder="Ex: 2.00"
                    />
                    <p className="text-xs text-[#A0A0A0] flex items-center gap-1">
                      <Info className="w-3 h-3 text-green-500" />
                      Utilisé uniquement pour l'affichage du solde estimé
                    </p>
                  </div>
                </div>

                {/* ✅ CREDIT DOP */}
                <div className="space-y-2">
                  <MoneyInput
                    label={`${t('forms.credit')} (DOP / RD$)`}
                    value={formData.credit}
                    onChange={(val) => handleMoneyChange('credit', val)}
                    required
                  />

                  {/* Live Credit Preview (HTG) */}
                  <AnimatePresence>
                    {Number(formData.credit || 0) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                      >
                        {creditPreview.isValid ? (
                          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                            <span className="text-green-500 font-bold text-sm">
                              Équivalent: {creditPreview.currency} {creditPreview.estimatedAmount}
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

                <div className="space-y-2">
                  <MoneyInput
                    label={t('forms.fee')}
                    value={formData.frais}
                    onChange={(val) => handleMoneyChange('frais', val)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 border-b border-[#2A2A2A] pb-2">Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.idCard')}</Label>
                  <Input id="piece_identite" value={formData.piece_identite} onChange={handleChange} required className="bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-blue-500" placeholder="Numéro ID" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">{t('forms.idType')}</Label>
                  <Select value={formData.id_type} onValueChange={(val) => setFormData(prev => ({ ...prev, id_type: val }))}>
                    <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
                      <SelectValue placeholder={t('forms.idType')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                      <SelectItem value="Passport">Passeport</SelectItem>
                      <SelectItem value="NID">Carte d'identité</SelectItem>
                      <SelectItem value="Other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.id_type && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="col-span-1 md:col-span-2 space-y-2 bg-[#0B0B0B] p-4 rounded-xl border border-dashed border-[#2A2A2A]"
                  >
                    <Label className="text-[#A0A0A0] mb-2 block">{t('forms.uploadIdDocument')}</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <Label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white px-4 py-2 rounded-md border border-[#2A2A2A] flex items-center gap-2 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        {t('forms.selectFile')}
                      </Label>
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-blue-500">
                          <FileCheck className="w-4 h-4" />
                          <span>{selectedFile.name}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#A0A0A0] mt-2">Max 5MB. Formats: JPG, PNG, PDF.</p>
                  </motion.div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || isUploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-xl mt-6 shadow-lg shadow-blue-600/20"
            >
              {isLoading || isUploading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2 w-5 h-5" />}
              {isLoading || isUploading ? t('common.loading') : t('buttons.createAgent')}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateAgentForm;