import { supabase } from '@/lib/supabase';
import { default as i18next } from 'i18next'; // Direct access to translations for non-hook usage

/**
 * Checks if transactions are allowed for a specific user (or globally if no user provided).
 * @param {string} userId - The UUID of the user attempting the transaction.
 * @returns {Promise<{allowed: boolean, message: string|null}>}
 */
export const checkTransactionStatus = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_transactions_status', { p_user_id: userId });
    
    if (error) {
      console.error('Error checking transaction status:', error);
      return { allowed: false, message: i18next.t('error.transaction.checkFailed') };
    }

    if (data && data.disabled) {
      return { 
        allowed: false, 
        message: i18next.t('error.transaction.disabled')
      };
    }

    return { allowed: true, message: null };
  } catch (err) {
    console.error('Unexpected error in transaction guard:', err);
    return { allowed: false, message: i18next.t('error.unexpected') };
  }
};