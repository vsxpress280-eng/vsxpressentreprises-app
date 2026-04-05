import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export const useAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_users_with_wallets');

      if (rpcError) throw rpcError;
      
      // Transform the flat RPC response to match the structure expected by components.
      // Specifically, components expect a 'wallets' array with the first element containing credit_limit/balance.
      const formattedUsers = (data || []).map(u => ({
        ...u,
        wallets: [{
          credit_limit: u.credit_limit,
          balance: u.balance,
          balance_htg: u.balance_htg,
          balance_dop: u.balance_dop
        }]
      }));

      setUsers(formattedUsers);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users list. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();

    // Subscribe to changes to keep the list fresh
    const userSub = supabase
      .channel('admin-users-list-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, fetchUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(userSub);
    };
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refreshUsers: fetchUsers
  };
};