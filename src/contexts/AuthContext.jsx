import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true);
  const { toast } = useToast();
  usePushNotifications(); 

  // Helper to safely log only in dev and avoid console noise in production
  const logDev = (msg, ...args) => {
    if (import.meta.env.DEV) {
      console.log(`[Auth] ${msg}`, ...args);
    }
  };

  const refreshSecurityStatus = useCallback(async (userId) => {
    if (!userId) {
      setHasSecurityQuestion(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('security_questions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logDev("Security status check failed", error);
        setHasSecurityQuestion(true);
      } else {
        setHasSecurityQuestion(!!data);
      }
    } catch (e) {
      logDev("Security status exception", e);
      setHasSecurityQuestion(true);
    }
  }, []);

  const clearLocalAuth = useCallback(() => {
    try {
      setUser(null);
      setHasSecurityQuestion(true);
      
      const storageKey = 'vsxpress-auth-token';
      if (window.localStorage.getItem(storageKey)) {
        window.localStorage.removeItem(storageKey);
      }
      
      const legacyKeys = ['supabase.auth.token', 'sb-access-token', 'sb-refresh-token'];
      legacyKeys.forEach(key => window.localStorage.removeItem(key));
      
    } catch (e) {
      console.warn("Error clearing local auth:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          const msg = String(error.message || '').toLowerCase();
          const isBadRefresh =
            msg.includes('refresh_token_not_found') ||
            msg.includes('invalid refresh token') ||
            msg.includes('not logged in');

          if (isBadRefresh) {
            logDev("Stale session detected. Clearing.");
            clearLocalAuth();
          } else {
            if (import.meta.env.DEV) console.error("Session check error:", error);
          }
        }

        if (mounted) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            await refreshSecurityStatus(currentUser.id);
          }
        }
      } catch (error) {
        logDev('Session check exception:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      logDev(`Auth state change: ${event}`);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        clearLocalAuth();
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
           await refreshSecurityStatus(currentUser.id);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshSecurityStatus, clearLocalAuth]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Sign in error:', error.message);
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      clearLocalAuth();
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        const msg = String(error.message || '');
        const isIgnorable =
          error.status === 403 ||
          error.status === 401 ||
          msg.includes('session_not_found') ||
          msg.includes('jwt') || 
          msg.includes('refresh_token_not_found');
          
        if (!isIgnorable && import.meta.env.DEV) {
          console.warn("SignOut server warning:", error);
        }
      }
    } catch (error) {
      logDev("SignOut exception (ignored):", error);
    }
  }, [clearLocalAuth]);

  const getUserRole = useCallback(async () => {
    if (!user) return null;
    if (user.user_metadata?.role) return user.user_metadata.role;
    if (user.app_metadata?.role) return user.app_metadata.role; 
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) return null;
      return data?.role || null;
    } catch (error) {
      return null;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
    getUserRole,
    hasSecurityQuestion,
    refreshSecurityStatus: (uid) => refreshSecurityStatus(uid || user?.id),
  }), [user, loading, signIn, signOut, getUserRole, hasSecurityQuestion, refreshSecurityStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};