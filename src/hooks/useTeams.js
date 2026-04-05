import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

export const useTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          worker:worker_id (
            id,
            nom,
            prenom,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (workerId, name) => {
    try {
      // Direct DB Insert - VALIDATION 2 Requirement
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          worker_id: workerId,
          nom: name,
          agents_assignes: []
        }])
        .select();

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('messages.teamCreated') || "Team created successfully"
      });
      
      fetchTeams();
      return true;
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
      return false;
    }
  };

  const deleteTeam = async (teamId) => {
    try {
      // Direct DB Delete
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('messages.teamDeleted') || "Team deleted"
      });
      
      fetchTeams();
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTeams();
    
    const subscription = supabase
      .channel('teams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    teams,
    loading,
    createTeam,
    deleteTeam,
    refreshTeams: fetchTeams
  };
};