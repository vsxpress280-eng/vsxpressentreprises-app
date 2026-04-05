import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatMoney, formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';

export const useWallet = () => {
  const { user } = useAuth();

  const [balanceHtg, setBalanceHtg] = useState(0);
  const [balanceDop, setBalanceDop] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loading, setLoading] = useState(true);

  // Task 4: Parallel Fetching & Correct Calculation
  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // (1) Fetch wallet and user rate in parallel
      const [walletRes, userRes] = await Promise.all([
        supabase
          .from('wallets')
          .select('balance_htg, balance_dop, credit_limit')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('users')
          .select('exchange_rate, taux_change')
          .eq('id', user.id)
          .single()
      ]);

      if (walletRes.error) throw walletRes.error;
      if (userRes.error) throw userRes.error;

      // Parse Wallet Data
      const htg = Number(walletRes.data?.balance_htg) || 0;
      const dop = Number(walletRes.data?.balance_dop) || 0;
      const limit = Number(walletRes.data?.credit_limit) || 0;

      // Parse Rate (Priority: exchange_rate > taux_change > 1)
      const rateRaw = Number(userRes.data?.exchange_rate) || Number(userRes.data?.taux_change) || 1;
      const rate = rateRaw > 0 ? rateRaw : 1;

      setBalanceHtg(htg);
      setBalanceDop(dop);
      setCreditLimit(limit);
      setExchangeRate(rate);

    } catch (error) {
      console.error('Error fetching wallet/rate:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWalletData();

    // Subscribe to changes
    const walletSub = supabase
      .channel(`wallet-realtime-${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user?.id}` }, 
        (payload) => {
          if (payload.new) {
            setBalanceHtg(Number(payload.new.balance_htg) || 0);
            setBalanceDop(Number(payload.new.balance_dop) || 0);
            setCreditLimit(Number(payload.new.credit_limit) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletSub);
    };
  }, [user?.id, fetchWalletData]);

  // (2) & (3) Calculate available balances
  // availableBalanceHtg = actual HTG balance + (Credit Limit converted to HTG)
  const availableBalanceHtg = balanceHtg + (creditLimit * exchangeRate);

  // availableBalanceDop = actual DOP balance + Credit Limit (DOP) + (HTG balance converted to DOP)
  // Note: Usually agents operate in HTG negative, so this conversion logic depends on if HTG is positive or negative.
  // Standard logic requested: 
  const availableBalanceDop = balanceDop + creditLimit + (balanceHtg / (exchangeRate > 0 ? exchangeRate : 1));

  return {
    balanceHtg,
    balanceDop,
    creditLimit,
    exchangeRate, 
    availableBalanceHtg,
    availableBalanceDop,
    formattedBalanceHtg: formatMoneyHTG(balanceHtg),
    formattedBalanceDop: formatMoneyDOP(balanceDop),
    formattedCreditLimit: formatMoneyDOP(creditLimit),
    formattedAvailableHtg: formatMoneyHTG(availableBalanceHtg),
    formattedAvailableDop: formatMoneyDOP(availableBalanceDop),
    loading,
    refreshWallet: fetchWalletData
  };
};

export default useWallet;