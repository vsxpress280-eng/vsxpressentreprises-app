import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminUsers } from '@/hooks/useAdminUsers'; 
import { ArrowLeft, Search, Filter, User, Edit, Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UserDetails from './UserDetails';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/formatMoney'; 

const UsersManager = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { users, loading, refreshUsers } = useAdminUsers();
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [workerNames, setWorkerNames] = useState({});
  const [liveBalances, setLiveBalances] = useState({});

  React.useEffect(() => {
    const fetchWorkerNames = async () => {
      const { data } = await supabase.from('users').select('id, nom, prenom').eq('role', 'worker');
      const map = {};
      (data || []).forEach(w => { map[w.id] = `${w.prenom || ''} ${w.nom || ''}`.trim(); });
      setWorkerNames(map);
    };
    fetchWorkerNames();
  }, []);

  React.useEffect(() => {
    const channel = supabase
      .channel('admin-wallet-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions' },
        (payload) => {
          const tx = payload.new;
          if (!tx?.user_id) return;

          const bal = Number(tx.balance_after);
          if (!Number.isFinite(bal)) return;

          setLiveBalances(prev => ({
            ...prev,
            [tx.user_id]: bal
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.prenom || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <Helmet>
        <title>{t('users.title')} - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Button
                  onClick={() => navigate('/admin/dashboard')}
                  variant="ghost"
                  className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4 pl-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('buttons.backToDashboard')}
                </Button>
                <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('users.title')}</h1>
              </div>

              <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl px-4 py-2 text-[#A0A0A0]">
                {t('users.totalUsers')}: <span className="text-[#D4AF37] font-bold">{filteredUsers.length}</span>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] w-4 h-4" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#1E1E1E] border-[#2A2A2A] text-white"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[220px] bg-[#1E1E1E] border-[#2A2A2A] text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1E1E] border border-[#2A2A2A]">
                <SelectItem value="all">{t('status.all')}</SelectItem>
                <SelectItem value="agent">AGENT</SelectItem>
                <SelectItem value="worker">WORKER</SelectItem>
                <SelectItem value="admin">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('users.table.fullName')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('users.table.role')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('users.table.assignedWorker')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('users.table.creditLimit')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('users.table.balance')}</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-[#A0A0A0]">{t('users.table.actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-[#A0A0A0]">{t('common.loading')}</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-[#A0A0A0]">{t('common.noData')}</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const wallet = user.wallets?.[0] || null;

                      const baseBal =
                        wallet?.balance_htg ??
                        wallet?.balance ??
                        wallet?.balance_dop ??
                        0;

                      const liveBal = liveBalances[user.id];
                      const finalBal = (typeof liveBal === 'number')
                        ? liveBal
                        : Number(baseBal);

                      const safeBal = Number.isFinite(finalBal) ? finalBal : 0;

                      const creditLimit =
                        wallet?.credit_limit ??
                        user.credit_limit ??
                        0;

                      const assignedWorkerId = user.associated_worker;
                      const assignedWorker = assignedWorkerId ? workerNames[assignedWorkerId] : null;

                      return (
                        <tr key={user.id} className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B]/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-[#D4AF37]" />
                              </div>
                              <div>
                                <div className="text-white font-semibold">
                                  {(user.prenom || '')} {(user.nom || '')}
                                </div>
                                <div className="text-[#A0A0A0] text-sm">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                user.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : user.role === 'worker'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-white">
                            {assignedWorker ? (
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-[#A0A0A0]" />
                                <span>{assignedWorker}</span>
                              </div>
                            ) : (
                              <span className="text-[#A0A0A0]">-</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-white font-mono">
                            {formatMoney(creditLimit)}
                          </td>

                          <td
                            className={`px-6 py-4 font-bold font-mono ${
                              safeBal < 0 ? 'text-red-500' : 'text-green-500'
                            }`}
                          >
                            {formatMoney(safeBal)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Button
                              onClick={() => setSelectedUser(user)}
                              className="bg-[#0B0B0B] border border-[#2A2A2A] hover:bg-[#1A1A1A] text-[#D4AF37]"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t('users.actions.viewEdit')}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      <UserDetails
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null);
          refreshUsers();
        }}
      />
    </>
  );
};

export default UsersManager;