import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  RefreshCw,
  Calendar,
  X,
  Search,
  DollarSign
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { makeTransferCode } from '@/lib/codeUtils';

// Moved outside component to prevent re-declaration on render
const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-3 rounded-full bg-[#0B0B0B] border border-white/10">
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-[#A0A0A0] text-sm font-medium">{title}</p>
    </div>
    <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
    {subtitle && <p className="text-xs text-[#A0A0A0]">{subtitle}</p>}
  </div>
);

const AdminStats = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date filter state (ONLY for Fees tab)
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Stats data
  const [feesData, setFeesData] = useState({
    total: 0,
    transactions: []
  });
  
  const [creditsData, setCreditsData] = useState({
    used: 0,
    total: 0,
    agents: []
  });

  const [workerBalances, setWorkerBalances] = useState({
    totalAdminOwes: 0,
    totalWorkersOwe: 0,
    netBalance: 0,
    totalAdminOwesHTG: 0,
    totalWorkersOweHTG: 0,
    netBalanceHTG: 0,
    workers: []
  });

  const [assetsData, setAssetsData] = useState({
    totalAssets: 0,
    totalAssetsHTG: 0,
    agents: []
  });

  // Calculate date range based on filter (ONLY for Fees)
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(dateFilter) {
      case 'today':
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return {
          start: `${year}-${month}-${day} 00:00:00`,
          end: `${year}-${month}-${day} 23:59:59`
        };
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return {
            start: new Date(customDateRange.start).toISOString(),
            end: new Date(customDateRange.end + 'T23:59:59').toISOString()
          };
        }
        return { start: null, end: null };
      default:
        startDate.setHours(0, 0, 0, 0);
    }
    
    return {
      start: startDate.toISOString(),
      end: now.toISOString()
    };
  };

  // Fetch Fees Data with date filter
  const fetchFeesData = async () => {
    try {
      const dateRange = getDateRange();
      
      if (!dateRange.start || !dateRange.end) {
        setFeesData({ total: 0, transactions: [] });
        return;
      }

      let transfersQuery = supabase
        .from("transfers")
        .select(`
          id,
          transfer_number,
          fees,
          amount_dop,
          total_htg,
          status,
          created_at,
          beneficiary_name,
          beneficiary_phone,
          operator,
          proof_url,
          notes,
          exchange_rate_snapshot,
          agent:agent_id (id, nom, prenom, email, exchange_rate),
          worker:worker_id (nom, prenom)
        `)
        .in('status', ['validated', 'completed'])
        .not('fees', 'is', null)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      const transfersRes = await transfersQuery;

      if (transfersRes.error) throw transfersRes.error;

      const formattedTransfers = (transfersRes.data || []).map(t => ({
        id: t.id,
        transfer_number: t.transfer_number,
        type: 'Transfer',
        fee: parseFloat(t.fees || 0),
        amount: parseFloat(t.total_htg || 0),
        amountDop: parseFloat(t.amount_dop || 0),
        status: t.status,
        date: t.created_at,
        agent: t.agent ? `${t.agent.nom} ${t.agent.prenom}` : 'N/A',
        agentEmail: t.agent?.email,
        worker: t.worker ? `${t.worker.nom} ${t.worker.prenom}` : 'N/A',
        beneficiaryName: t.beneficiary_name,
        beneficiaryPhone: t.beneficiary_phone,
        operator: t.operator,
        proofUrl: t.proof_url,
        notes: t.notes,
        exchangeRateSnapshot: t.exchange_rate_snapshot ?? t.agent?.exchange_rate ?? 0
      }));

      const totalFees = formattedTransfers.reduce((sum, t) => sum + t.fee, 0);

      setFeesData({
        total: totalFees,
        transactions: formattedTransfers
      });

    } catch (error) {
      console.error("Error fetching fees data:", error);
    }
  };

  // Fetch Credits Data
  const fetchCreditsData = async () => {
    try {
      const { data: agents, error: agentsError } = await supabase
        .from("users")
        .select("id, nom, prenom, email, credit_limit, exchange_rate, role")
        .eq('role', 'agent');

      if (agentsError) throw agentsError;

      const agentIds = (agents || []).map(a => a.id);

      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("user_id, balance_htg, credit_limit")
        .in('user_id', agentIds);

      if (walletsError) throw walletsError;

      const walletMap = new Map();
      (wallets || []).forEach(w => {
        walletMap.set(w.user_id, {
          balance_htg: parseFloat(w.balance_htg || 0),
          credit_limit: parseFloat(w.credit_limit || 0)
        });
      });

      let totalCreditLimitSystem = 0;
      let totalCreditUsed = 0;

      const agentsWithUsage = (agents || []).map(agent => {
        const wallet = walletMap.get(agent.id);
        
        const creditLimitDOP = wallet?.credit_limit || parseFloat(agent.credit_limit || 0);
        const exchangeRate = parseFloat(agent.exchange_rate || 13.5);
        const balanceHTG = wallet?.balance_htg || 0;

        const balanceDOP = balanceHTG / exchangeRate;

        totalCreditLimitSystem += creditLimitDOP;

        const creditAvailableDOP = creditLimitDOP + balanceDOP;
        const creditUsedDOP = creditLimitDOP - creditAvailableDOP;

        if (creditUsedDOP > 0) {
          totalCreditUsed += creditUsedDOP;
        }

        return {
          id: agent.id,
          name: `${agent.nom} ${agent.prenom}`,
          email: agent.email,
          exchangeRate,
          creditLimit: creditLimitDOP,
          creditUsed: creditUsedDOP,
          creditAvailable: creditAvailableDOP,
          balance: balanceDOP
        };
      })
      .filter(agent => agent.creditLimit > 0); // MODIFIED: Changed from 'agent.creditLimit > 0 && agent.creditUsed > 0'

      agentsWithUsage.sort((a, b) => (b.creditUsed || 0) - (a.creditUsed || 0));

      setCreditsData({
        used: totalCreditUsed,
        total: totalCreditLimitSystem,
        agents: agentsWithUsage
      });

    } catch (error) {
      console.error("Error fetching credits data:", error);
    }
  };

  // Fetch Worker Balances
  const fetchWorkerBalances = async () => {
    try {
      const { data: workers, error: workersError } = await supabase
        .from("users")
        .select("id, nom, prenom, email, exchange_rate, exchange_type")
        .eq('role', 'worker');

      if (workersError) throw workersError;

      const workersList = workers || [];
      
      if (workersList.length === 0) {
        setWorkerBalances({
          totalAdminOwes: 0,
          totalWorkersOwe: 0,
          netBalance: 0,
          totalAdminOwesHTG: 0,
          totalWorkersOweHTG: 0,
          netBalanceHTG: 0,
          workers: []
        });
        return;
      }

      const workerIds = workersList.map(w => w.id);
      
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("user_id, balance_htg")
        .in('user_id', workerIds);

      if (walletsError) throw walletsError;

      const walletMap = new Map();
      (wallets || []).forEach(w => {
        walletMap.set(w.user_id, parseFloat(w.balance_htg || 0));
      });

      let totalAdminOwes = 0;
      let totalWorkersOwe = 0;
      let totalAdminOwesHTG = 0;
      let totalWorkersOweHTG = 0;

      const formattedWorkers = workersList.map(worker => {
        const balanceHTG = walletMap.get(worker.id) || 0;
        const exchangeRate = parseFloat(worker.exchange_rate || 0);
        const exchangeType = worker.exchange_type;
        
        let finalBalanceUSDT = 0;

        if (balanceHTG !== 0 && exchangeRate > 0 && exchangeType) {
          finalBalanceUSDT = balanceHTG / exchangeRate;
        }

        if (finalBalanceUSDT > 0.01) {
          totalAdminOwes += finalBalanceUSDT;
          totalAdminOwesHTG += balanceHTG;
        } else if (finalBalanceUSDT < -0.01) {
          totalWorkersOwe += Math.abs(finalBalanceUSDT);
          totalWorkersOweHTG += Math.abs(balanceHTG);
        }

        return {
          id: worker.id,
          name: `${worker.nom} ${worker.prenom}`,
          email: worker.email,
          balance: finalBalanceUSDT,
          exchangeRate: exchangeRate,
          exchangeType: exchangeType,
          balanceHTG: balanceHTG,
          status: finalBalanceUSDT > 0.01 ? 'admin_owes' : finalBalanceUSDT < -0.01 ? 'worker_owes' : 'balanced'
        };
      });

      formattedWorkers.sort((a, b) => b.balance - a.balance);

      const netBalance = totalAdminOwes - totalWorkersOwe;
      const netBalanceHTG = totalAdminOwesHTG - totalWorkersOweHTG;

      setWorkerBalances({
        totalAdminOwes,
        totalWorkersOwe,
        netBalance,
        totalAdminOwesHTG,
        totalWorkersOweHTG,
        netBalanceHTG,
        workers: formattedWorkers
      });

    } catch (error) {
      console.error("❌ Error fetching worker balances:", error);
    }
  };

  // Fetch Assets Data
  const fetchAssetsData = async () => {
    try {
      const { data: agents, error: agentsError } = await supabase
        .from("users")
        .select("id, nom, prenom, email, exchange_rate")
        .eq('role', 'agent');

      if (agentsError) throw agentsError;

      const agentsList = agents || [];
      
      if (agentsList.length === 0) {
        setAssetsData({
          totalAssets: 0,
          totalAssetsHTG: 0,
          agents: []
        });
        return;
      }

      const agentIds = agentsList.map(a => a.id);
      
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("user_id, balance_htg")
        .in('user_id', agentIds);

      if (walletsError) throw walletsError;

      const walletMap = new Map();
      (wallets || []).forEach(w => {
        walletMap.set(w.user_id, parseFloat(w.balance_htg || 0));
      });

      let totalAssets = 0;
      let totalAssetsHTG = 0;

      const agentsWithBalances = agentsList
        .map(agent => {
          const balanceHTG = walletMap.get(agent.id) || 0;
          const exchangeRate = parseFloat(agent.exchange_rate || 13.5);
          
          const balanceDOP = balanceHTG / exchangeRate;

          return {
            id: agent.id,
            name: `${agent.nom} ${agent.prenom}`,
            email: agent.email,
            balanceHTG: balanceHTG,
            balanceDOP: balanceDOP,
            exchangeRate: exchangeRate
          };
        })
        .filter(agent => agent.balanceDOP >= 0)
        .sort((a, b) => b.balanceDOP - a.balanceDOP);

      totalAssets = agentsWithBalances.reduce((sum, a) => sum + a.balanceDOP, 0);
      totalAssetsHTG = agentsWithBalances.reduce((sum, a) => sum + a.balanceHTG, 0);

      setAssetsData({
        totalAssets,
        totalAssetsHTG,
        agents: agentsWithBalances
      });

    } catch (error) {
      console.error("❌ Error fetching assets data:", error);
    }
  };

  // Filter transactions based on search query
  const filteredTransactions = feesData.transactions.filter(txn => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const transferCode = txn.transfer_number 
      ? makeTransferCode(txn.transfer_number).toLowerCase() 
      : txn.id.toLowerCase();
    
    return (
      transferCode.includes(query) ||
      txn.id.toLowerCase().includes(query) ||
      txn.agent.toLowerCase().includes(query) ||
      txn.agentEmail?.toLowerCase().includes(query) ||
      txn.worker.toLowerCase().includes(query) ||
      txn.beneficiaryName?.toLowerCase().includes(query) ||
      txn.beneficiaryPhone?.toLowerCase().includes(query) ||
      txn.operator?.toLowerCase().includes(query)
    );
  });

  // Filter agents based on search query
  const filteredAgents = creditsData.agents.filter(agent => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query)
    );
  });

  // Filter workers based on search query
  const filteredWorkers = workerBalances.workers.filter(worker => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    return (
      worker.name.toLowerCase().includes(query) ||
      worker.email.toLowerCase().includes(query)
    );
  });

  // Filter assets agents based on search query
  const filteredAssetsAgents = assetsData.agents.filter(agent => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchFeesData(), 
        fetchCreditsData(), 
        fetchWorkerBalances(),
        fetchAssetsData()
      ]);
      setLoading(false);
    };
    
    fetchData();
  }, [dateFilter, customDateRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFeesData(), 
      fetchCreditsData(), 
      fetchWorkerBalances(),
      fetchAssetsData()
    ]);
    setRefreshing(false);
  };

  const formatCurrency = (amount, currency = 'HTG') => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' ' + currency;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Stats - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pt-[84px]">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/admin/dashboard")}
                variant="ghost"
                size="icon"
                className="text-white/80 hover:bg-white/5"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Statistiques</h1>
            </div>

            <Button
              onClick={handleRefresh}
              variant="ghost"
              className="text-white/80 hover:bg-white/5 border border-white/10"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : (
            <Tabs defaultValue="fees" className="w-full">
              {/* Existing Tabs Content - keeping layout same, just showing Dialog changes at end */}
              <TabsList className="bg-[#1E1E1E] border border-[#2A2A2A] mb-6">
                <TabsTrigger value="fees">% des Frais</TabsTrigger>
                <TabsTrigger value="credits">Crédits</TabsTrigger>
                <TabsTrigger value="assets">Actifs</TabsTrigger>
                <TabsTrigger value="worker-thunes">Worker Thunes</TabsTrigger>
              </TabsList>

              <TabsContent value="fees" className="space-y-4">
                 {/* ... Fees Tab Content (same as before) ... */}
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <StatCard icon={TrendingUp} title="Total des Frais" value={`${formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.fee, 0), 'DOP')}`} subtitle={`${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} ${searchQuery ? 'filtrée(s)' : 'complétée(s)'}`} color="#10B981" />
                </motion.div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-medium text-white">Période</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {['today', 'week', 'month', 'year', 'custom'].map(filter => (
                          <Button key={filter} onClick={() => setDateFilter(filter)} size="sm" className={`${dateFilter === filter ? 'bg-[#D4AF37] text-black' : 'bg-[#0B0B0B] text-white hover:bg-[#2A2A2A]'}`}>
                            {filter === 'today' ? "Aujourd'hui" : filter === 'week' ? "7 jours" : filter === 'month' ? "30 jours" : filter === 'year' ? "1 an" : "Personnalisé"}
                          </Button>
                       ))}
                    </div>
                    {dateFilter === 'custom' && (
                      <div className="flex gap-3 mt-3">
                        <input type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })} className="bg-[#0B0B0B] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm flex-1" />
                        <span className="text-[#A0A0A0] self-center">à</span>
                        <input type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })} className="bg-[#0B0B0B] border border-[#2A2A2A] text-white rounded px-3 py-2 text-sm flex-1" />
                      </div>
                    )}
                  </div>
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-medium text-white">Recherche</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                      <Input type="text" placeholder="Code VSX, agent, bénéficiaire..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#0B0B0B] border-[#2A2A2A] text-white placeholder:text-[#A0A0A0] focus:border-[#D4AF37] focus:ring-[#D4AF37]" />
                      {searchQuery && (
                        <Button onClick={() => setSearchQuery('')} variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {searchQuery && <p className="text-xs text-[#A0A0A0] mt-2">{filteredTransactions.length} résultat{filteredTransactions.length !== 1 ? 's' : ''}</p>}
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Transaction</th>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Type</th>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Agent</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Montant (DOP)</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Frais (DOP)</th>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-[#A0A0A0]">{searchQuery ? 'Aucune transaction ne correspond à votre recherche' : 'Aucune transaction pour cette période'}</td></tr>
                        ) : (
                          filteredTransactions.map((txn) => (
                            <tr key={txn.id} className="border-b border-[#2A2A2A] hover:bg-[#252525] cursor-pointer transition-colors" onClick={() => handleTransactionClick(txn)}>
                              <td className="p-4 text-sm text-white/90 font-mono font-bold">{txn.transfer_number ? makeTransferCode(txn.transfer_number) : txn.id.slice(0, 8)}</td>
                              <td className="p-4 text-sm text-white/80"><span className={`px-2 py-1 rounded text-xs ${txn.type === 'Transfer' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{txn.type}</span></td>
                              <td className="p-4 text-sm text-white/80">{txn.agent}</td>
                              <td className="p-4 text-sm text-white/90 text-right font-medium">{formatCurrency(txn.amountDop, 'DOP')}</td>
                              <td className="p-4 text-sm text-green-400 text-right font-bold">{formatCurrency(txn.fee, 'DOP')}</td>
                              <td className="p-4 text-sm text-white/60">{formatDate(txn.date)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="credits" className="space-y-4">
                 {/* ... Credits Tab Content (Same as before) ... */}
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard icon={Wallet} title="Crédit Total Système" value={`${formatCurrency(creditsData.total, 'DOP')}`} subtitle={`${creditsData.agents.length} agent${creditsData.agents.length !== 1 ? 's' : ''} utilisant du crédit`} color="#3B82F6" />
                  <StatCard icon={CreditCard} title="Crédit Utilisé Global" value={`${formatCurrency(creditsData.used, 'DOP')}`} subtitle={`${((creditsData.used / creditsData.total) * 100 || 0).toFixed(1)}% utilisé sur ${formatCurrency(creditsData.total, 'DOP')}`} color="#F59E0B" />
                </motion.div>
                <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-sm font-medium text-white">Recherche</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                    <Input type="text" placeholder="Rechercher un agent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#0B0B0B] border-[#2A2A2A] text-white placeholder:text-[#A0A0A0] focus:border-[#D4AF37] focus:ring-[#D4AF37]" />
                     {/* ... */}
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    {/* ... Credits Table ... */}
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Agent</th>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Email</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Limite (DOP)</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Disponible (DOP)</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Utilisé (DOP)</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Usage %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAgents.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-[#A0A0A0]">{searchQuery ? 'Aucun agent ne correspond à votre recherche' : 'Aucun agent avec crédit utilisé'}</td></tr>
                        ) : (
                          filteredAgents.map((agent) => {
                            const rawPercent = agent.creditLimit > 0 ? (agent.creditUsed / agent.creditLimit * 100) : 0;
                            const cappedPercent = Math.min(Math.max(rawPercent, -100), 100);
                            const isOverLimit = agent.creditAvailable < 0;
                            return (
                              <tr key={agent.id} className="border-b border-[#2A2A2A] hover:bg-[#252525] transition-colors">
                                <td className="p-4 text-sm text-white/90 font-medium">{agent.name}</td>
                                <td className="p-4 text-sm text-white/60">{agent.email}</td>
                                <td className="p-4 text-sm text-white/90 text-right">{formatCurrency(agent.creditLimit, 'DOP')}</td>
                                <td className="p-4 text-sm text-right"><span className={`font-medium ${isOverLimit ? 'text-red-400' : 'text-white/80'}`}>{formatCurrency(agent.creditAvailable, 'DOP')}</span></td>
                                <td className="p-4 text-sm text-right"><span className={`font-medium ${cappedPercent > 80 ? 'text-red-400' : cappedPercent > 50 ? 'text-yellow-400' : 'text-green-400'}`}>{formatCurrency(agent.creditUsed, 'DOP')}</span></td>
                                <td className="p-4 text-sm text-right"><span className={`px-2 py-1 rounded text-xs font-bold ${isOverLimit ? 'bg-red-500/20 text-red-400' : cappedPercent > 80 ? 'bg-red-500/20 text-red-400' : cappedPercent > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{cappedPercent >= 100 ? '+100%' : cappedPercent <= -100 ? '-100%' : `${cappedPercent.toFixed(1)}%`}</span></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="assets" className="space-y-4">
                 {/* ... Assets Tab Content (Same as before) ... */}
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 rounded-full bg-[#0B0B0B] border border-white/10">
                        <DollarSign className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <p className="text-[#A0A0A0] text-sm font-medium">Total des Actifs (Agents)</p>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(assetsData.totalAssets, 'DOP')}</h3>
                    <p className="text-sm text-[#10B981] font-medium">{formatCurrency(assetsData.totalAssetsHTG, 'HTG')}</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">{assetsData.agents.length} agent{assetsData.agents.length !== 1 ? 's' : ''} avec solde positif</p>
                  </div>
                </motion.div>
                <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
                    {/* ... Search ... */}
                    <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-sm font-medium text-white">Recherche</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                    <Input type="text" placeholder="Rechercher un agent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#0B0B0B] border-[#2A2A2A] text-white placeholder:text-[#A0A0A0] focus:border-[#D4AF37] focus:ring-[#D4AF37]" />
                     {/* ... */}
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    {/* ... Assets Table ... */}
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Agent</th>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Email</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Solde (DOP)</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Taux</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Solde (HTG)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssetsAgents.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-[#A0A0A0]">{searchQuery ? 'Aucun agent ne correspond à votre recherche' : 'Aucun agent avec solde positif'}</td></tr>
                        ) : (
                          filteredAssetsAgents.map((agent) => (
                            <tr key={agent.id} className="border-b border-[#2A2A2A] hover:bg-[#252525] transition-colors">
                              <td className="p-4 text-sm text-white/90 font-medium">{agent.name}</td>
                              <td className="p-4 text-sm text-white/60">{agent.email}</td>
                              <td className="p-4 text-right"><span className="text-lg font-bold text-green-400 font-mono">{formatCurrency(agent.balanceDOP, 'DOP')}</span></td>
                              <td className="p-4 text-right"><span className="text-xs text-[#A0A0A0] font-mono">1 DOP = {agent.exchangeRate.toFixed(2)} HTG</span></td>
                              <td className="p-4 text-right"><span className="text-lg font-bold text-green-400 font-mono">{formatCurrency(agent.balanceHTG, 'HTG')}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="worker-thunes" className="space-y-4">
                 {/* ... Worker Thunes Tab Content (Same as before) ... */}
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {/* ... Cards ... */}
                   <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 rounded-full bg-[#0B0B0B] border border-white/10">
                        <TrendingUp className="w-5 h-5 text-[#EF4444]" />
                      </div>
                      <p className="text-[#A0A0A0] text-sm font-medium">Admin doit aux Workers</p>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(workerBalances.totalAdminOwes, 'USDT')}</h3>
                    <p className="text-sm text-[#EF4444] font-medium">{formatCurrency(workerBalances.totalAdminOwesHTG, 'HTG')}</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">{workerBalances.workers.filter(w => w.status === 'admin_owes').length} worker(s)</p>
                  </div>
                  {/* ... */}
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 rounded-full bg-[#0B0B0B] border border-white/10">
                        <Wallet className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <p className="text-[#A0A0A0] text-sm font-medium">Workers doivent à l'Admin</p>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(workerBalances.totalWorkersOwe, 'USDT')}</h3>
                    <p className="text-sm text-[#10B981] font-medium">{formatCurrency(workerBalances.totalWorkersOweHTG, 'HTG')}</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">{workerBalances.workers.filter(w => w.status === 'worker_owes').length} worker(s)</p>
                  </div>
                  {/* ... */}
                   <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 rounded-full bg-[#0B0B0B] border border-white/10">
                        <DollarSign className="w-5 h-5" style={{ color: workerBalances.netBalance >= 0 ? "#EF4444" : "#10B981" }} />
                      </div>
                      <p className="text-[#A0A0A0] text-sm font-medium">Balance Nette</p>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{formatCurrency(Math.abs(workerBalances.netBalance), 'USDT')}</h3>
                    <p className={`text-sm font-medium ${workerBalances.netBalance >= 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{formatCurrency(Math.abs(workerBalances.netBalanceHTG), 'HTG')}</p>
                    <p className="text-xs text-[#A0A0A0] mt-1">{workerBalances.netBalance >= 0 ? 'En faveur des workers' : 'En faveur de l\'admin'}</p>
                  </div>
                </motion.div>
                <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
                    {/* ... Search ... */}
                    <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-sm font-medium text-white">Recherche</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                    <Input type="text" placeholder="Rechercher un worker..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#0B0B0B] border-[#2A2A2A] text-white placeholder:text-[#A0A0A0] focus:border-[#D4AF37] focus:ring-[#D4AF37]" />
                     {/* ... */}
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    {/* ... Workers Table ... */}
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-[#A0A0A0]">Worker</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Solde (USDT)</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Taux</th>
                          <th className="text-right p-4 text-sm font-medium text-[#A0A0A0]">Solde (HTG)</th>
                          <th className="text-center p-4 text-sm font-medium text-[#A0A0A0]">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkers.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-[#A0A0A0]">{searchQuery ? 'Aucun worker ne correspond à votre recherche' : 'Aucun worker disponible'}</td></tr>
                        ) : (
                          filteredWorkers.map((worker) => {
                            const balance = parseFloat(worker.balance) || 0;
                            const balanceHTG = parseFloat(worker.balanceHTG) || 0;
                            const isPositive = balance > 0.01;
                            const isNegative = balance < -0.01;
                            const isBalanced = Math.abs(balance) <= 0.01;
                            return (
                              <tr key={worker.id} className="border-b border-[#2A2A2A] hover:bg-[#252525] transition-colors">
                                <td className="p-4 text-sm text-white/90 font-medium">{worker.name}</td>
                                <td className="p-4 text-right"><span className={`text-lg font-bold font-mono ${isPositive ? 'text-red-400' : isNegative ? 'text-green-400' : 'text-blue-400'}`}>{balance > 0 ? '+' : ''}{formatCurrency(balance, 'USDT')}</span></td>
                                <td className="p-4 text-right">{worker.exchangeRate && worker.exchangeType ? (<span className="text-xs text-[#A0A0A0] font-mono">1 {worker.exchangeType} = {worker.exchangeRate.toFixed(2)} HTG</span>) : (<span className="text-xs text-yellow-500/70">N/A</span>)}</td>
                                <td className="p-4 text-right"><span className={`text-lg font-bold font-mono ${isPositive ? 'text-red-400' : isNegative ? 'text-green-400' : 'text-blue-400'}`}>{balanceHTG > 0 ? '+' : ''}{formatCurrency(balanceHTG, 'HTG')}</span></td>
                                <td className="p-4 text-center">
                                  {isPositive && (<span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 inline-block">🔴 Admin doit</span>)}
                                  {isNegative && (<span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 inline-block">🟢 Worker doit</span>)}
                                  {isBalanced && (<span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-block">🔵 Équilibré</span>)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal - COMPACT VERSION */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white max-w-xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Détails de la Transaction</span>
              <Button
                onClick={() => setModalOpen(false)}
                variant="ghost"
                size="icon"
                className="text-white/80 hover:bg-white/5 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-3 mt-3">
              <div className="bg-[#0B0B0B] p-3 rounded-lg">
                <p className="text-xs text-[#A0A0A0] mb-1">Code VSX</p>
                <p className="text-base font-mono text-white font-bold">
                  {selectedTransaction.transfer_number 
                    ? makeTransferCode(selectedTransaction.transfer_number) 
                    : selectedTransaction.id.slice(0, 8)}
                </p>
                <p className="text-xs text-[#A0A0A0] mt-1 font-mono">ID: {selectedTransaction.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-1">Type</p>
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedTransaction.type === 'Transfer' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {selectedTransaction.type}
                  </span>
                </div>
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-1">Statut</p>
                  <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-1">Agent</p>
                  <p className="text-sm text-white font-medium">{selectedTransaction.agent}</p>
                  {selectedTransaction.agentEmail && (
                    <p className="text-xs text-[#A0A0A0] mt-1">{selectedTransaction.agentEmail}</p>
                  )}
                </div>
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-1">Worker</p>
                  <p className="text-sm text-white font-medium">{selectedTransaction.worker}</p>
                </div>
              </div>

              {selectedTransaction.type === 'Transfer' && selectedTransaction.beneficiaryName && (
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-2">Bénéficiaire</p>
                  <p className="text-sm text-white font-medium">{selectedTransaction.beneficiaryName}</p>
                  <p className="text-xs text-[#A0A0A0] mt-1">{selectedTransaction.beneficiaryPhone}</p>
                  {selectedTransaction.operator && (
                    <p className="text-xs text-[#A0A0A0] mt-1">Opérateur: {selectedTransaction.operator}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedTransaction.amountDop && (
                  <div className="bg-[#0B0B0B] p-3 rounded-lg">
                    <p className="text-xs text-[#A0A0A0] mb-1">Montant (DOP)</p>
                    <p className="text-base text-white font-bold">{formatCurrency(selectedTransaction.amountDop, 'DOP')}</p>
                  </div>
                )}
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-1">Total (HTG)</p>
                  <p className="text-base text-white font-bold">{formatCurrency(selectedTransaction.amount, 'HTG')}</p>
                </div>
              </div>

              <div className="bg-[#0B0B0B] p-3 rounded-lg">
                <p className="text-xs text-[#A0A0A0] mb-1">Pourcentage des frais</p>
                <p className="text-xl text-white font-bold">
                  {selectedTransaction.amountDop > 0
                    ? `${((selectedTransaction.fee / selectedTransaction.amountDop) * 100).toFixed(2)}%`
                    : '0%'}
                </p>
              </div>

              <div className="bg-[#0B0B0B] p-3 rounded-lg">
                <p className="text-xs text-[#A0A0A0] mb-1">Taux de change de l'agent</p>
                <p className="text-base text-white font-bold">
                  {selectedTransaction.exchangeRateSnapshot
                    ? `${parseFloat(selectedTransaction.exchangeRateSnapshot).toFixed(2)} HTG`
                    : 'N/A'}
                </p>
              </div>

              <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-3 rounded-lg">
                <p className="text-xs text-[#10B981] mb-1">Frais perçus</p>
                <p className="text-xl text-[#10B981] font-bold">
                  {formatCurrency(selectedTransaction.fee, 'DOP')}
                </p>
              </div>

              <div className="bg-[#0B0B0B] p-3 rounded-lg">
                <p className="text-xs text-[#A0A0A0] mb-1">Date de création</p>
                <p className="text-sm text-white">{formatDate(selectedTransaction.date)}</p>
              </div>

              {selectedTransaction.notes && (
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-1">Notes</p>
                  <p className="text-sm text-white">{selectedTransaction.notes}</p>
                </div>
              )}

              {selectedTransaction.proofUrl && (
                <div className="bg-[#0B0B0B] p-3 rounded-lg">
                  <p className="text-xs text-[#A0A0A0] mb-2">Preuve</p>
                  <a 
                    href={selectedTransaction.proofUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-[#D4AF37] hover:underline"
                  >
                    Voir la preuve →
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminStats;