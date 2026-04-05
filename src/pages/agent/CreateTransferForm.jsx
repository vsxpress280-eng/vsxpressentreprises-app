import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { checkTransactionStatus } from '@/lib/transactionsGuard';
import MoneyInput from '@/components/ui/MoneyInput';
import TransferReceipt from '@/components/TransferReceipt';
import { getTransferCode } from '@/lib/codeUtils';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const CreateTransferForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { 
    balanceHtg, 
    creditLimit, 
    exchangeRate, 
    availableBalanceDop,
    refreshWallet 
  } = useWallet();

  const [step, setStep] = useState('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedWorkerId, setAssignedWorkerId] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState(null);

  const [formData, setFormData] = useState({
    beneficiaryName: '',
    beneficiaryPhone: '509 ',
    amount: '',
    proof: null,
    notes: ''
  });

  const [operator, setOperator] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [calculations, setCalculations] = useState({
    feesAmount: 0,
    netAmount: 0,
    totalHtg: 0
  });

  // Load Agent Data
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from('users')
        .select('frais, associated_worker')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setAgentData(data);
        setAssignedWorkerId(data.associated_worker);
      }
    };
    fetchData();
  }, [user]);

  // Phone Validation Logic
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('509 ')) val = '509 ';
    setFormData(prev => ({ ...prev, beneficiaryPhone: val }));
    
    const raw = val.replace(/\D/g, '').substring(3);
    if (raw.length >= 2) {
      const prefix = parseInt(raw.substring(0, 2), 10);
      const digicelPrefixes = [30, 31, 34, 36, 37, 38, 39, 44, 46, 47, 48, 49];
      const natcomPrefixes = [32, 33, 35, 40, 41, 42, 43, 55];
      if (digicelPrefixes.includes(prefix)) setOperator('Digicel (MonCash)');
      else if (natcomPrefixes.includes(prefix)) setOperator('Natcom (NatCash)');
      else setOperator(null);
    } else {
      setOperator(null);
    }
  };

  // Step 1: Verification Logic
  const handleVerify = () => {
    if (!assignedWorkerId) {
      toast({ variant: "destructive", title: t('common.error'), description: t('error.noWorkerAssigned') || "Aucun worker assigné." });
      return;
    }
    if (!formData.beneficiaryName || !formData.beneficiaryPhone) {
      toast({ variant: "destructive", description: t('common.requiredField') });
      return;
    }

    const amountDOP = safeNum(formData.amount, 0);
    if (amountDOP <= 0) {
      toast({ variant: "destructive", description: t('common.invalidFormat') });
      return;
    }

    if (amountDOP > availableBalanceDop) {
      toast({
        variant: "destructive",
        title: t('transfer.insufficientFunds'),
        description: `Requis: ${amountDOP.toFixed(2)} DOP | Dispo: ${availableBalanceDop.toFixed(2)} DOP`
      });
      return;
    }

    const feesPercent = safeNum(agentData?.frais, 0);
    const feesAmount = (amountDOP * feesPercent) / 100;
    const netAmount = amountDOP - feesAmount;
    const totalHtg = netAmount * exchangeRate;

    setCalculations({ feesAmount, netAmount, totalHtg });
    setStep('summary');
  };

  // Upload Logic
  const uploadProof = async () => {
    if (!formData.proof) return null;
    
    try {
      const BUCKET_NAME = 'transfers';
      const fileName = `${user.id}_${Date.now()}.${formData.proof.name.split('.').pop()}`;
      
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, formData.proof);
      
      if (error) {
        console.error("Upload proof error:", error);
        if (error.message && error.message.includes('Bucket not found')) {
          throw new Error(`Le dossier de stockage '${BUCKET_NAME}' est introuvable.`);
        }
        throw error;
      }
      
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Upload proof error:", err);
      throw new Error("Impossible d'uploader la preuve: " + (err.message || "Erreur inconnue"));
    }
  };

  // Download Receipt using Native Canvas API
  const handleDownloadReceipt = async () => {
    if (!createdTransfer) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set dimensions
      canvas.width = 600;
      canvas.height = 800;
      
      // Background
      ctx.fillStyle = '#111827'; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Border
      ctx.strokeStyle = '#D4AF37'; // Gold border
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      
      // Title
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('REÇU DE TRANSFERT', canvas.width / 2, 80);
      
      // Content Styles
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      
      const startX = 60;
      let currentY = 140;
      const lineHeight = 40;
      
      // Helper to draw rows
      const drawRow = (label, value) => {
        ctx.fillStyle = '#A0A0A0'; // Label color
        ctx.fillText(label, startX, currentY);
        
        ctx.fillStyle = '#FFFFFF'; // Value color
        ctx.textAlign = 'right';
        ctx.fillText(value, canvas.width - 60, currentY);
        
        ctx.textAlign = 'left'; // Reset
        currentY += lineHeight;
      };

      const transferCode = getTransferCode(createdTransfer);

      // Draw Data
      drawRow(`${t('common.date')}:`, new Date(createdTransfer.created_at).toLocaleString());
      drawRow('ID Transaction:', transferCode);
      
      currentY += 20; // Spacer
      
      drawRow(`${t('transfer.beneficiary')}:`, createdTransfer.beneficiary_name);
      drawRow(`${t('common.phone')}:`, createdTransfer.beneficiary_phone);
      drawRow(`${t('forms.operator')}:`, createdTransfer.operator);
      
      currentY += 20; // Spacer
      
      ctx.fillStyle = '#D4AF37'; // Highlight amount
      ctx.font = 'bold 24px Arial';
      drawRow(`${t('transfer.amountSent')}:`, `${Number(createdTransfer.amount_dop).toFixed(2)} DOP`);
      
      ctx.font = '20px Arial'; // Reset font
      drawRow(`${t('transfer.fees')}:`, `${Number(createdTransfer.fees).toFixed(2)} DOP`);
      drawRow(`${t('transfer.totalPaid')} (HTG):`, `${Number(createdTransfer.total_htg).toFixed(2)} HTG`);
      
      // Footer
      currentY = canvas.height - 60;
      ctx.fillStyle = '#A0A0A0';
      ctx.font = 'italic 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Merci de votre confiance.', canvas.width / 2, currentY);

      // Convert to image and download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `recu-${transferCode}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: t('transfer.downloadReceipt'),
        description: t('transfer.receiptGenerated'),
        className: "bg-green-600 text-white"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('transfer.generateError')
      });
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    navigate('/agent/dashboard');
  };

  // Confirm Transfer
  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let debitTransactionId = null;
    const amountDOP = safeNum(formData.amount);

    try {
      const status = await checkTransactionStatus(user.id);
      if (!status.allowed) throw new Error(status.message);

      const { data: debitData, error: debitError } = await supabase.rpc('debit_agent_wallet_secure', {
        p_user_id: user.id,
        p_amount_dop: amountDOP,
        p_exchange_rate: exchangeRate
      });

      if (debitError) throw new Error(debitError.message || "Échec du débit wallet.");
      if (!debitData.success) throw new Error("Échec du débit wallet (Erreur inconnue).");

      debitTransactionId = debitData.transaction_id;

      let proofUrl = await uploadProof();

      const { data: funcData, error: funcError } = await supabase.functions.invoke('create-transfer', {
        body: {
          agent_id: user.id,
          worker_id: assignedWorkerId,
          beneficiary_name: formData.beneficiaryName,
          beneficiary_phone: formData.beneficiaryPhone,
          operator: operator || 'Unknown',
          amount_dop: amountDOP,
          fees: calculations.feesAmount,
          net_amount_dop: calculations.netAmount,
          total_htg: calculations.totalHtg,
          proof_url: proofUrl,
          notes: formData.notes
        }
      });

      if (funcError) throw funcError;
      if (funcData?.error) throw new Error(funcData.error);

      if (debitTransactionId && funcData.transfer_id) {
         await supabase.from('wallet_transactions').update({ transfer_id: funcData.transfer_id }).eq('id', debitTransactionId);
      }
      
      // Fetch the transfer to get the transfer_number if it was created
      const { data: fetchTransfer, error: fetchError } = await supabase
        .from('transfers')
        .select('transfer_number, created_at')
        .eq('id', funcData.transfer_id)
        .single();

      if (fetchError) console.error("Could not fetch transfer number:", fetchError);

      // Préparer les données du reçu
      const transferData = {
        id: funcData.transfer_id,
        transfer_number: fetchTransfer?.transfer_number,
        beneficiary_name: formData.beneficiaryName,
        beneficiary_phone: formData.beneficiaryPhone,
        operator: operator || 'Unknown',
        amount_dop: amountDOP,
        fees: calculations.feesAmount,
        net_amount_dop: calculations.netAmount,
        total_htg: calculations.totalHtg,
        notes: formData.notes,
        created_at: fetchTransfer?.created_at || new Date().toISOString()
      };

      setCreatedTransfer(transferData);
      setShowReceipt(true);
      refreshWallet();

    } catch (error) {
      console.error("Transfer Creation Failed:", error);

      if (debitTransactionId) {
        try {
          await supabase.rpc('rollback_agent_debit_secure', {
            p_user_id: user.id,
            p_amount_dop: amountDOP,
            p_exchange_rate: exchangeRate,
            p_original_tx_id: debitTransactionId,
            p_reason: error.message
          });

          toast({
            variant: "destructive",
            title: t('transfer.transferError'),
            description: `Erreur: ${error.message}. Votre solde a été restauré.`
          });
        } catch (rollbackError) {
          console.error("CRITICAL: Rollback Failed", rollbackError);
          toast({
            variant: "destructive",
            title: "ERREUR CRITIQUE",
            description: "Contactez le support. Échec transaction + Échec rollback."
          });
        }
      } else {
        toast({ variant: "destructive", title: t('common.error'), description: error.message });
      }

    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Helmet><title>{t('transfer.newTransfer')}</title></Helmet>
      <div className="min-h-screen bg-[#0B0B0B] p-4 text-[#EAEAEA]">
        <div className="max-w-3xl mx-auto">
          <Button onClick={() => navigate('/agent/dashboard')} variant="ghost" className="text-[#A0A0A0] mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')}
          </Button>

          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-[#111827] p-6 rounded-xl border border-[#2A2A2A] space-y-4">
                  <h1 className="text-2xl font-bold">{t('transfer.newTransfer')}</h1>
                  
                  <div className="space-y-2">
                    <Label>{t('transfer.beneficiaryName')}</Label>
                    <Input value={formData.beneficiaryName} onChange={e => setFormData({...formData, beneficiaryName: e.target.value})} className="bg-black border-[#333]" />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('transfer.phoneNumber')}</Label>
                    <Input value={formData.beneficiaryPhone} onChange={handlePhoneChange} className="bg-black border-[#333]" />
                    {operator && <span className="text-green-500 text-sm flex items-center gap-1"><CheckCircle className="w-3" /> {operator}</span>}
                  </div>

                  <div className="space-y-2">
                    <MoneyInput
                        label={t('transfer.amountDOP')}
                        value={formData.amount}
                        onChange={(val) => setFormData({...formData, amount: val})}
                        className="text-lg font-bold"
                    />
                    <p className="text-xs text-gray-400">
                      {t('transfer.available')} {availableBalanceDop.toFixed(2)} DOP (≈ {safeNum(balanceHtg + creditLimit*exchangeRate).toFixed(2)} HTG)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('transfer.notes')}</Label>
                    <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-black border-[#333]" />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('transfer.proof')}</Label>
                    <Input type="file" accept="image/*" onChange={e => {
                        const f = e.target.files[0];
                        if(f) { setFormData({...formData, proof: f}); setPreviewUrl(URL.createObjectURL(f)); }
                    }} className="bg-black border-[#333]" />
                    {previewUrl && <img src={previewUrl} className="h-20 rounded" alt="Preview" />}
                  </div>

                  <Button onClick={handleVerify} className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                    {t('common.next')}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-[#111827] p-6 rounded-xl border border-[#D4AF37] space-y-6">
                  <h2 className="text-xl font-bold text-[#D4AF37]">{t('transfer.confirmation')}</h2>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-gray-400">{t('transfer.beneficiary')}</div>
                    <div className="text-right font-medium">{formData.beneficiaryName}</div>
                    
                    <div className="text-gray-400">{t('common.phone')}</div>
                    <div className="text-right font-medium">{formData.beneficiaryPhone}</div>
                    
                    <div className="text-gray-400">{t('common.amount')}</div>
                    <div className="text-right font-bold text-white">{safeNum(formData.amount).toFixed(2)} DOP</div>
                    
                    <div className="text-gray-400">{t('transfer.rate')}</div>
                    <div className="text-right">1 DOP = {exchangeRate} HTG</div>

                    <div className="text-gray-400 pt-2 border-t border-gray-800">{t('transfer.totalHTG')}</div>
                    <div className="text-right pt-2 border-t border-gray-800 font-bold text-[#D4AF37]">{calculations.totalHtg.toFixed(2)} HTG</div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep('form')} disabled={isSubmitting} className="flex-1">{t('common.back')}</Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
                      {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      {isSubmitting ? t('transfer.transferring') : t('common.confirm')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && createdTransfer && (
        <TransferReceipt
          transferData={createdTransfer}
          onClose={handleCloseReceipt}
          onDownload={handleDownloadReceipt}
        />
      )}
    </>
  );
};

export default CreateTransferForm;