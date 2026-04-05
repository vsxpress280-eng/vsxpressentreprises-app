import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, User, FileText, Loader2, History, Briefcase, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { checkTransactionStatus } from '@/lib/transactionsGuard';
import MoneyInput from '@/components/ui/MoneyInput';
import { formatMoneyHTG } from '@/lib/formatMoney';

const AdminAdjustments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Data State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Form State
  const [userType, setUserType] = useState('agent'); // 'agent' | 'worker'
  const [selectedUser, setSelectedUser] = useState('');
  const [operationType, setOperationType] = useState('credit'); // 'credit' | 'debit'
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchUsers(userType);
    fetchHistory();
  }, [userType]);

  const fetchUsers = async (type) => {
    setLoadingUsers(true);
    setSelectedUser(''); // Reset selection when type changes
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nom, prenom, email, role')
        .eq('role', type)
        .order('nom', { ascending: true });

      if (error) throw error;
      setUsersList(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: 'destructive', description: "Impossible de charger la liste des utilisateurs." });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchHistory = async () => {
    try {
      // Joining with users table twice: once for admin, once for target
      const { data, error } = await supabase
        .from('adjustments_history')
        .select(`
            *,
            admin:admin_id(nom, prenom),
            target:target_user_id(nom, prenom, role)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser || !amount || !comment) {
      toast({ variant: 'destructive', description: t('validation.required') });
      return;
    }

    // 1. Transaction Guard
    const status = await checkTransactionStatus(user.id);
    if (!status.allowed) {
      toast({ variant: 'destructive', title: "Action refusée", description: status.message });
      return;
    }

    setSubmitting(true);

    try {
      // 2. Prepare Payload
      const numericAmount = parseFloat(amount);
      const finalAmount = operationType === 'debit' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

      // 3. Call Edge Function
      const { data, error } = await supabase.functions.invoke('apply-adjustment', {
        body: {
          target_user_id: selectedUser,
          target_type: userType,
          amount_htg: finalAmount,
          comment: comment
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 4. Success Handling
      toast({
        className: "bg-green-600 text-white border-green-700",
        title: "Ajustement appliqué",
        description: `Nouveau solde: ${formatMoneyHTG(data.new_balance)}`,
      });

      // Reset Form
      setAmount('');
      setComment('');
      
      // Refresh History
      fetchHistory();

    } catch (error) {
      console.error("Adjustment Failed:", error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur", 
        description: error.message || "Échec de l'ajustement." 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Ajustements & Régularisations - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] text-white p-6 pt-20">
        <div className="max-w-7xl mx-auto">
          <Button 
            onClick={() => navigate('/admin/dashboard')} 
            variant="ghost" 
            className="text-[#A0A0A0] hover:text-[#D4AF37] mb-6 pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('buttons.backToDashboard')}
          </Button>

          <div className="flex items-center gap-3 mb-8">
             <div className="bg-[#D4AF37]/10 p-3 rounded-xl">
                <FileText className="w-8 h-8 text-[#D4AF37]" />
             </div>
             <div>
              <h1 className="text-3xl font-bold text-white">Ajustement</h1>
                <p className="text-[#A0A0A0]">Ajustement direct des soldes Agent & Worker</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: FORM */}
            <div className="lg:col-span-5">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 sticky top-24"
              >
                 <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-[#D4AF37]" />
                    Nouvel Ajustement
                 </h2>

                 <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* User Type Selection */}
                    <div className="grid grid-cols-2 gap-4 p-1 bg-[#111] rounded-lg border border-[#333]">
                       <button
                          type="button"
                          onClick={() => setUserType('agent')}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                             userType === 'agent' 
                               ? 'bg-[#D4AF37] text-black shadow-lg' 
                               : 'text-[#A0A0A0] hover:text-white hover:bg-[#222]'
                          }`}
                       >
                          <Briefcase className="w-4 h-4" />
                          Agents
                       </button>
                       <button
                          type="button"
                          onClick={() => setUserType('worker')}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                             userType === 'worker' 
                               ? 'bg-[#D4AF37] text-black shadow-lg' 
                               : 'text-[#A0A0A0] hover:text-white hover:bg-[#222]'
                          }`}
                       >
                          <User className="w-4 h-4" />
                          Workers
                       </button>
                    </div>

                    {/* User Selection */}
                    <div className="space-y-2">
                        <Label className="text-[#A0A0A0]">Utilisateur Cible</Label>
                        <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loadingUsers}>
                            <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white h-12">
                                <SelectValue placeholder={loadingUsers ? "Chargement..." : "Sélectionner un utilisateur"} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white max-h-[300px]">
                                {usersList.length === 0 ? (
                                    <div className="p-3 text-sm text-center text-[#666]">Aucun utilisateur trouvé</div>
                                ) : (
                                    usersList.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.prenom} {u.nom}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Operation Type & Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[#A0A0A0]">Opération</Label>
                            <Select value={operationType} onValueChange={setOperationType}>
                                <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A] text-white h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                                    <SelectItem value="credit" className="text-green-400 font-bold">Crédit (+)</SelectItem>
                                    <SelectItem value="debit" className="text-red-400 font-bold">Débit (-)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <MoneyInput
                                label="Montant (HTG)"
                                value={amount}
                                onChange={setAmount}
                                placeholder="0.00"
                                className={`h-12 text-lg font-bold ${
                                   operationType === 'credit' ? 'text-green-500' : 'text-red-500'
                                }`}
                             />
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <Label className="text-[#A0A0A0]">Motif de l'ajustement <span className="text-red-500">*</span></Label>
                        <Textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Ex: Correction erreur de saisie, Bonus performance..."
                            className="bg-[#0B0B0B] border-[#2A2A2A] text-white min-h-[100px] resize-none"
                        />
                    </div>

                    {/* Submit */}
                    <Button 
                        type="submit" 
                        disabled={submitting || !selectedUser || !amount || !comment}
                        className={`w-full h-12 font-bold text-base transition-all ${
                            operationType === 'credit' 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin mr-2" /> Traitement...
                            </>
                        ) : (
                            operationType === 'credit' ? "Appliquer Crédit" : "Appliquer Débit"
                        )}
                    </Button>

                 </form>
              </motion.div>
            </div>

            {/* RIGHT COLUMN: HISTORY */}
            <div className="lg:col-span-7">
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
               >
                  <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                          <History className="w-5 h-5 text-[#A0A0A0]" />
                          Historique Récent
                      </h2>
                      <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loadingHistory} className="text-[#D4AF37]">
                          Actualiser
                      </Button>
                  </div>

                  {loadingHistory ? (
                      <div className="flex justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      </div>
                  ) : history.length === 0 ? (
                      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8 text-center text-[#666]">
                          Aucun historique d'ajustement disponible.
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {history.map((item) => (
                              <div 
                                key={item.id} 
                                className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#D4AF37]/30 transition-colors"
                              >
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                              item.target_type === 'agent' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                          }`}>
                                              {item.target_type === 'agent' ? 'AG' : 'WK'}
                                          </div>
                                          <div>
                                              <p className="font-bold text-white">
                                                  {item.target?.prenom} {item.target?.nom}
                                              </p>
                                              <p className="text-xs text-[#A0A0A0]">
                                                  Par: Admin {item.admin?.prenom} {item.admin?.nom}
                                              </p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <span className={`text-lg font-mono font-bold ${
                                              item.amount_htg > 0 ? 'text-green-500' : 'text-red-500'
                                          }`}>
                                              {item.amount_htg > 0 ? '+' : ''}{formatMoneyHTG(item.amount_htg)}
                                          </span>
                                          <p className="text-xs text-[#666] mt-1">
                                              {new Date(item.created_at).toLocaleString()}
                                          </p>
                                      </div>
                                  </div>
                                  
                                  <div className="bg-[#111] rounded-lg p-3 text-sm text-[#CCCCCC] border border-[#333]">
                                      <span className="text-[#666] text-xs uppercase font-bold mr-2">Motif:</span>
                                      {item.comment}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
               </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminAdjustments;