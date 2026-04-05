import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

export const useAgents = () => {
  const [agents, setAgents] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: agentsData }, { data: workersData }] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('role', 'agent')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('*')
          .eq('role', 'worker')
          .order('created_at', { ascending: false })
      ]);

      setAgents(agentsData || []);
      setWorkers(workersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignAgent = async (agentId, teamId) => {
    try {
      // 1. Get the team to find the worker
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('worker_id, agents_assignes')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // 2. Direct DB Update: Set associated_worker on the Agent (User)
      const { error: userError } = await supabase
        .from('users')
        .update({ associated_worker: team.worker_id })
        .eq('id', agentId);

      if (userError) throw userError;

      // 3. Direct DB Update: Add agent to team array (if not already there)
      const currentAgents = team.agents_assignes || [];
      if (!currentAgents.includes(agentId)) {
        const { error: arrayError } = await supabase
          .from('teams')
          .update({ 
            agents_assignes: [...currentAgents, agentId] 
          })
          .eq('id', teamId);
          
        if (arrayError) throw arrayError;
      }

      toast({
        title: t('common.success'),
        description: t('messages.agentAssigned') || "Agent assigned successfully"
      });
      
      fetchData();
      return true;
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
      return false;
    }
  };

  const moveAgent = async (agentId, targetTeamId) => {
    try {
      // 1. Find all teams to locate current team
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('*');

      if (teamsError) throw teamsError;

      // 2. Find current team of the agent
      const currentTeam = allTeams.find(team => 
        team.agents_assignes?.includes(agentId)
      );

      if (!currentTeam) {
        throw new Error("Agent n'appartient à aucune équipe");
      }

      // 3. Find target team
      const targetTeam = allTeams.find(team => team.id === targetTeamId);

      if (!targetTeam) {
        throw new Error("Équipe cible introuvable");
      }

      // 4. Remove agent from old team's agents_assignes array
      const oldTeamAgents = currentTeam.agents_assignes?.filter(id => id !== agentId) || [];

      const { error: oldTeamError } = await supabase
        .from('teams')
        .update({ agents_assignes: oldTeamAgents })
        .eq('id', currentTeam.id);

      if (oldTeamError) throw oldTeamError;

      // 5. Add agent to new team's agents_assignes array
      const newTeamAgents = [...(targetTeam.agents_assignes || [])];
      
      // Only add if not already present
      if (!newTeamAgents.includes(agentId)) {
        newTeamAgents.push(agentId);
      }

      const { error: newTeamError } = await supabase
        .from('teams')
        .update({ agents_assignes: newTeamAgents })
        .eq('id', targetTeamId);

      if (newTeamError) throw newTeamError;

      // 6. Update agent's associated_worker
      const { error: agentError } = await supabase
        .from('users')
        .update({ associated_worker: targetTeam.worker_id })
        .eq('id', agentId);

      if (agentError) throw agentError;

      toast({
        className: "bg-green-600 text-white border-none",
        title: "Agent déplacé avec succès",
        description: `De "${currentTeam.nom}" vers "${targetTeam.nom}"`,
      });

      fetchData();
      return true;

    } catch (error) {
      console.error('Error moving agent:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || "Erreur lors du déplacement de l'agent"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchData();
    
    const subscription = supabase
      .channel('users_agents_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    agents,
    workers,
    loading,
    assignAgent,
    moveAgent,
    refreshAgents: fetchData
  };
};