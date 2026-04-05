import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useRegistrationRequestsNotifications = () => {
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchCount = useCallback(async () => {
    if (!user) return;
    
    // Check if user is admin before fetching sensitive data count
    // (Optimization: though RLS protects data, skipping request saves resources)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('registration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('viewed', false);

      if (error) throw error;
      setUnseenCount(count || 0);
    } catch (err) {
      console.error('Error fetching registration requests count:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel('registration-requests-notification')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registration_requests',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return { unseenCount, loading, error, refresh: fetchCount };
};