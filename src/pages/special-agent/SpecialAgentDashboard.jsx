import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldCheck, TrendingUp, Users } from 'lucide-react';

const SpecialAgentDashboard = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ agents: 0, transactions: 0 });

  useEffect(() => {
    // Basic stats for Special Agent
    const fetchStats = async () => {
        // Mocking logic - usually special agents supervise a specific region or group
        // Here we just count visible items
        const { count: agentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'agent');
        const { count: txCount } = await supabase.from('transfers').select('*', { count: 'exact', head: true });
        setStats({ agents: agentCount || 0, transactions: txCount || 0 });
    };
    fetchStats();
  }, []);

  return (
    <>
      <Helmet>
        <title>Special Agent - Dashboard</title>
      </Helmet>
      
      <div className="min-h-screen bg-[#0B0B0B] text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                Special Agent Portal
              </h1>
              <p className="text-[#A0A0A0] mt-1">Welcome back, {user?.user_metadata?.prenom || user?.email}</p>
            </div>
            <Button onClick={signOut} variant="outline" className="border-red-900 text-red-500 hover:bg-red-900/20">
              <LogOut className="w-4 h-4 mr-2" /> {t('common.logout')}
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A]">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#A0A0A0]">Agents Overseen</h3>
                  <Users className="text-[#D4AF37]" />
               </div>
               <p className="text-3xl font-bold">{stats.agents}</p>
            </div>
            
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2A2A2A]">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#A0A0A0]">Network Activity</h3>
                  <TrendingUp className="text-[#D4AF37]" />
               </div>
               <p className="text-3xl font-bold">{stats.transactions}</p>
            </div>
          </div>
          
          <div className="p-8 bg-[#111] rounded-xl border border-[#2A2A2A] text-center">
             <h2 className="text-xl font-semibold mb-2">Restricted Access Area</h2>
             <p className="text-[#666]">
                As a Special Agent, you have viewing rights to network performance and agent statuses.
                <br/>Additional management features are currently restricted by Admin.
             </p>
          </div>

        </div>
      </div>
    </>
  );
};

export default SpecialAgentDashboard;