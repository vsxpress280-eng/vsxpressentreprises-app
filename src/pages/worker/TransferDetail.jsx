// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, User, Phone, Calendar, FileText, 
  CheckCircle, XCircle, MessageSquare, AlertCircle, Upload, Eye, Loader2 
} from 'lucide-react';
import TransferChat from '@/components/TransferChat';
import { useAuth } from '@/contexts/AuthContext';
import { computeEquivalentFromHTG, formatExchangeRateInfo } from '@/lib/currencyUtils';
import { checkTransactionStatus } from '@/lib/transactionsGuard';
import { getTransferCode } from '@/lib/codeUtils';
import WorkerReceipt from '@/components/WorkerReceipt';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';
import { formatDateTimeLocal, formatDateTimeLongLocal } from '@/lib/dateUtils';

const TransferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [showReceipt, setShowReceipt] = useState(false);
  const [validatedTransfer, setValidatedTransfer] = useState(null);

  const fetchTransfer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          agent:agent_id(nom, prenom, email, exchange_type, exchange_rate),
          worker:worker_id(nom, prenom)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTransfer(data);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', description: t('error.fetchFailed') });
      navigate('/worker/transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
    
    const sub = supabase
      .channel(`transfer-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transfers', filter: `id=eq.${id}` }, 
        (payload) => {
          setTransfer(prev => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', description: t("error.file.tooLarge") });
        return;
      }
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const uploadProof = async () => {
    if (!proofFile) return null;
    
    const fileExt = proofFile.name.split('.').pop();
    const fileName = `${id}_validation_${Date.now()}.${fileExt}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('transfer-proofs')
        .upload(fileName, proofFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('transfer-proofs')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(t("error.upload.failed"));
    }
  };

  const handleDownloadReceipt = () => {
    if (!validatedTransfer) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 600;
      const height = 850;

      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Header Background
      const gradient = ctx.createLinearGradient(0, 0, width, 120);
      gradient.addColorStop(0, '#15803d');
      gradient.addColorStop(1, '#22c55e');
      ctx.fillStyle = gradient;
      ctx.fillRect(12, 12, width - 24, 120);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VALIDATION RÉUSSIE', width / 2, 70);
      
      ctx.font = '16px Arial';
      ctx.fillText('Transaction validée par VS XPRESS', width / 2, 100);

      // Transaction Code
      const code = getTransferCode(validatedTransfer);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 40px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(code, width / 2, 180);

      // Section Divider
      const drawDivider = (y) => {
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      };

      // Beneficiary Section
      let currentY = 240;
      ctx.fillStyle = '#9ca3af'; 
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('BÉNÉFICIAIRE', 40, currentY);

      currentY += 30;
      ctx.fillStyle = '#D4AF37'; 
      ctx.font = 'bold 24px Arial';
      ctx.fillText(validatedTransfer.beneficiary_name || '', 40, currentY);

      currentY += 25;
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Courier New';
      ctx.fillText(validatedTransfer.beneficiary_phone || '', 40, currentY);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(validatedTransfer.operator || '', width - 40, currentY);

      currentY += 30;
      drawDivider(currentY);

      // Amounts Section
      currentY += 40;
      
      // Amount DOP
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Montant Brut (DOP)', 40, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(formatMoneyDOP(validatedTransfer.amount_dop), width - 40, currentY);

      currentY += 30;

      // Fees
      if (validatedTransfer.fees > 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'left';
        ctx.fillText('Frais', 40, currentY);
        ctx.fillStyle = '#ef4444'; 
        ctx.textAlign = 'right';
        ctx.fillText('-' + formatMoneyDOP(validatedTransfer.fees), width - 40, currentY);
        currentY += 30;
      }

      // Net Amount
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Net en DOP', 40, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(formatMoneyDOP(validatedTransfer.net_amount_dop), width - 40, currentY);

      currentY += 40;

      // Total HTG Box
      ctx.fillStyle = '#14532d'; 
      ctx.fillRect(30, currentY, width - 60, 100);
      ctx.strokeStyle = '#22c55e';
      ctx.strokeRect(30, currentY, width - 60, 100);

      ctx.fillStyle = '#4ade80'; 
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MONTANT FINAL (HTG)', width / 2, currentY + 35);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Courier New';
      ctx.fillText(formatMoneyHTG(validatedTransfer.total_htg), width / 2, currentY + 80);

      currentY += 140;

      // Validator Info
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('VALIDÉ PAR', 40, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(validatedTransfer.worker_name || 'Worker', 140, currentY);

      currentY += 40;

      // Date
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Arial';
      ctx.fillText('DATE', 40, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      const dateStr = validatedTransfer.validated_at || validatedTransfer.updated_at || validatedTransfer.created_at;
      ctx.fillText(formatDateTimeLongLocal(dateStr), 140, currentY);

      // Footer
      ctx.fillStyle = '#374151';
      ctx.fillRect(12, height - 50, width - 24, 38);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Reçu généré par VS XPRESS - vsxpress.com', width / 2, height - 25);

      // Convert and Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `validation-${code}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Téléchargement réussi",
        description: "Le reçu a été enregistré sur votre appareil.",
        className: "bg-green-600 border-none text-white",
      });

    } catch (error) {
      console.error('Canvas error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer l'image du reçu.",
      });
    }
  };

  const handleStatusChange = async (newStatus) => {
    setProcessing(true);
    try {
      const status = await checkTransactionStatus(user.id);
      if (!status.allowed) {
        toast({ variant: 'destructive', title: t("common.error"), description: status.message });
        setProcessing(false);
        return;
      }

      let currentProofUrl = transfer.proof_url;

      if (newStatus === 'approved') {
        if (!proofFile && !currentProofUrl) {
          toast({ 
            variant: 'destructive', 
            title: t("transfer.detail.proofRequired"),
            description: t("transfer.detail.proofRequired")
          });
          setProcessing(false);
          return;
        }

        if (proofFile) {
          setUploading(true);
          const url = await uploadProof();
          currentProofUrl = url;
          setUploading(false);
        }
      }

      const action = newStatus === 'approved' ? 'validate' : 'reject';
      
      const { data, error } = await supabase.functions.invoke('validate-transfer', {
        body: { 
          transfer_id: id, 
          worker_id: user.id, 
          action,
          proof_url: currentProofUrl
        }
      });

      if (error) {
         if (error.context?.response?.status === 403) {
            throw new Error(t("error.transaction.disabled"));
         }
         throw error;
      }
      if (data?.error) throw new Error(data.error);

      if (newStatus === 'approved') {
         const { data: receiptData, error: receiptError } = await supabase
            .from('transfers')
            .select(`
              *,
              agent:agent_id ( nom, prenom, email ),
              worker:worker_id ( nom, prenom, email )
            `)
            .eq('id', id)
            .single();

         if (!receiptError && receiptData) {
            const enrichedData = {
               ...receiptData,
               worker_name: receiptData.worker ? `${receiptData.worker.prenom} ${receiptData.worker.nom}` : 'N/A',
               agent_name: receiptData.agent ? `${receiptData.agent.prenom} ${receiptData.agent.nom}` : 'N/A',
            };
            setValidatedTransfer(enrichedData);
            setShowReceipt(true);
         }
      }

      toast({
        className: newStatus === 'approved' ? "bg-green-600 text-white" : "bg-red-600 text-white",
        title: t('common.success'),
        description: newStatus === 'approved' 
          ? t('messages.transferValidated')
          : t('messages.transferRefused')
      });
      
      setProofFile(null);
      if (proofPreview) URL.revokeObjectURL(proofPreview);
      setProofPreview(null);
      
      fetchTransfer();

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', description: error.message || t('common.error') });
    } finally {
      setProcessing(false);
      setUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white">{t('common.loading')}</div>;
  if (!transfer) return null;

  const displayCode = getTransferCode(transfer);
  const exchangeRate = transfer.exchange_rate_snapshot || transfer.agent?.exchange_rate;
  const exchangeType = transfer.exchange_type_snapshot || transfer.agent?.exchange_type;
  
  const equivalent = exchangeRate > 0 
    ? computeEquivalentFromHTG(transfer.total_htg, exchangeRate) 
    : 0;

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    en_attente: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-500 border-green-500/20',
    validated: 'bg-green-500/10 text-green-500 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    cancel_requested: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  };

  const currentStatus = transfer.status === 'validated' ? 'approved' : transfer.status;
  const isPending = ['pending', 'en_attente', 'cancel_requested'].includes(currentStatus);

  return (
    <>
      <Helmet>
        <title>{t('transfer.detail.title')} - {displayCode}</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-4 sm:p-6 text-white pb-24">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/worker/transfers')}
            className="mb-6 pl-0 text-[#A0A0A0] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('transfer.detail.backTransfers')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              >
                <div className="p-6 border-b border-[#2A2A2A] flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold mb-1">{t('transfer.detail.title')}</h1>
                    <div className="text-sm text-[#D4AF37] font-mono font-bold tracking-wider">{displayCode}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[currentStatus] || statusColors.pending}`}>
                    {(t(`status.${currentStatus}`) || currentStatus).toUpperCase()}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.beneficiary')}</p>
                        <p className="font-medium">{transfer.beneficiary_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.phone')}</p>
                        <p className="font-medium">{transfer.beneficiary_phone}</p>
                        <p className="text-xs text-[#D4AF37]">{transfer.operator}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.date')}</p>
                        <p className="font-medium">{formatDateTimeLocal(transfer.created_at)}</p>
                      </div>
                    </div>

                     <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#A0A0A0]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('transfer.detail.agent')}</p>
                        <p className="font-medium">{transfer.agent?.prenom} {transfer.agent?.nom}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#111] border-t border-[#2A2A2A]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#A0A0A0] mb-1">{t('transfer.detail.amountSent')}</p>
                      <p className="text-xl font-bold">{Number(transfer.amount_dop).toFixed(2)} DOP</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-[#A0A0A0] mb-1">{t('transfer.detail.totalReceive')}</p>
                       <p className="text-xl font-bold text-[#D4AF37]">{Number(transfer.total_htg).toFixed(2)} HTG</p>
                       {exchangeType && (
                         <div className="mt-1">
                            <p className="text-sm font-medium text-white/80">≈ {equivalent.toFixed(2)} {exchangeType}</p>
                            <p className="text-[10px] text-[#666]">
                              {formatExchangeRateInfo(exchangeType, exchangeRate)}
                            </p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>

               <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              >
                <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                   <h3 className="font-semibold flex items-center gap-2">
                     <MessageSquare className="w-4 h-4" />
                     {t('transfer.messages.title')}
                   </h3>
                   <Button size="sm" variant="ghost" onClick={() => setShowChat(!showChat)}>
                     {showChat ? t('transfer.messages.hide') : t('transfer.messages.show')}
                   </Button>
                </div>
                {showChat && (
                  <div className="h-[400px]">
                    <TransferChat transferId={id} status={transfer.status} />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="space-y-6">
              
              {transfer.proof_url && (
                 <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4"
                 >
                    <h3 className="text-sm font-semibold mb-3 text-[#A0A0A0] flex items-center gap-2">
                       <FileText className="w-4 h-4" />
                       {t('transfer.detail.proofAgent')}
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-[#2A2A2A] group relative cursor-pointer aspect-video bg-black" onClick={() => window.open(transfer.proof_url, '_blank')}>
                       <img src={transfer.proof_url} alt="Transfer proof" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-6 h-6 text-white" />
                       </div>
                    </div>
                 </motion.div>
              )}

              {isPending && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-5 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-[#A0A0A0]">{t('transfer.detail.validation')}</h3>
                  
                  {currentStatus === 'cancel_requested' && (
                      <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg text-orange-200 text-sm mb-4">
                          <AlertCircle className="w-4 h-4 inline-block mr-2 mb-0.5" />
                          {t('transfer.detail.cancelRequestedAlert')}
                      </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs text-[#A0A0A0]">{t('transfer.detail.proofRequired')}</Label>
                    <div className={`border border-dashed rounded-lg p-4 text-center transition-colors relative cursor-pointer bg-[#111] 
                        ${(!proofFile && !transfer.proof_url) ? 'border-yellow-500/50 hover:border-yellow-500' : 'border-[#333] hover:border-[#D4AF37]'}`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={handleFileChange}
                      />
                      {proofPreview ? (
                        <div className="relative aspect-video">
                          <img src={proofPreview} alt="Preview" className="w-full h-full object-contain rounded" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold">{t('transfer.detail.changeProof')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-2">
                          <Upload className="w-6 h-6 text-[#666] mb-2" />
                          <span className="text-xs text-[#666]">{t('transfer.detail.addProof')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <Button 
                      onClick={() => handleStatusChange('approved')} 
                      disabled={processing || uploading}
                      className="w-full bg-[#0E7A57] hover:bg-[#16A34A] text-white font-bold h-12 shadow-lg shadow-green-900/20"
                    >
                      {(processing || uploading) ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <CheckCircle className="mr-2 w-4 h-4" />}
                      {t('buttons.validate')}
                    </Button>

                    <Button 
                      onClick={() => handleStatusChange('rejected')} 
                      disabled={processing || uploading}
                      variant="destructive"
                      className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-900 text-red-200"
                    >
                       {processing ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <XCircle className="mr-2 w-4 h-4" />}
                      {t('buttons.reject')}
                    </Button>
                  </div>
                </motion.div>
              )}

              {transfer.notes && (
                 <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4">
                    <h3 className="text-sm font-semibold mb-2 text-[#A0A0A0] flex items-center gap-2">
                       <AlertCircle className="w-4 h-4" />
                       {t('pages.transferDetail.notes')}
                    </h3>
                    <p className="text-sm text-white/80 bg-black/20 p-3 rounded-lg border border-white/5 italic">
                       "{transfer.notes}"
                    </p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReceipt && validatedTransfer && (
        <WorkerReceipt
          transferData={validatedTransfer}
          onClose={() => setShowReceipt(false)}
          onDownload={handleDownloadReceipt}
        />
      )}
    </>
  );
};

export default TransferDetail;