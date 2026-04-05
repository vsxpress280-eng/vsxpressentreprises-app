import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          wallets (
            balance,
            credit_limit
          )
        `);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const userSub = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .subscribe();
      
    const walletSub = supabase
      .channel('public:wallets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, fetchUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(userSub);
      supabase.removeChannel(walletSub);
    };
  }, []);

  const updateUser = async (userId, updates) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { user_id: userId, ...updates }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return true;
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    updateUser,
    deleteUser,
    refreshUsers: fetchUsers
  };
};