import { supabase } from '@/lib/supabase';

export const AdjustmentApi = {
  // Upload proof image to storage
  uploadProofImage: async (file) => {
    try {
      if (!file) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('adjustment-proofs')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('adjustment-proofs')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      throw error;
    }
  },

  // Create a new adjustment
  createAdjustment: async ({ targetUserId, amount, currency, direction, reason, proofFile }) => {
    try {
      let proofUrl = null;
      if (proofFile) {
        proofUrl = await AdjustmentApi.uploadProofImage(proofFile);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('adjustments')
        .insert({
          target_user_id: targetUserId,
          admin_id: user.id,
          amount,
          currency,
          direction,
          reason,
          status: 'pending',
          proof_url: proofUrl
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating adjustment:', error);
      return { data: null, error };
    }
  },

  // Get all adjustments (Admin)
  getAdjustments: async (limit = 20, offset = 0, statusFilter = 'all') => {
    try {
      let query = supabase
        .from('adjustments')
        .select(`
          *,
          target_user:users!target_user_id(nom, prenom, email),
          admin:users!admin_id(nom, prenom)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;
      return { data, count, error: null };
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      return { data: [], count: 0, error };
    }
  },

  // Get current user's adjustments
  getUserAdjustments: async (limit = 20, offset = 0) => {
    try {
      // Using direct query for better filtering/sorting options than the simple RPC
      const { data, count, error } = await supabase
        .from('adjustments')
        .select('*', { count: 'exact' })
        .eq('target_user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data, count, error: null };
    } catch (error) {
      console.error('Error fetching user adjustments:', error);
      return { data: [], count: 0, error };
    }
  },

  // Get count of pending adjustments for current user
  getPendingCount: async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_adjustments_count');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  },

  // Apply (Accept) adjustment - Finalizes transaction
  applyAdjustment: async (adjustmentId) => {
    try {
      const { data, error } = await supabase.rpc('apply_adjustment', {
        p_adjustment_id: adjustmentId
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Reject adjustment
  rejectAdjustment: async (adjustmentId) => {
    try {
      const { data, error } = await supabase.rpc('reject_adjustment', {
        p_adjustment_id: adjustmentId
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Approve adjustment (Admin step, usually)
  approveAdjustment: async (adjustmentId) => {
    try {
      const { data, error } = await supabase
        .from('adjustments')
        .update({ status: 'approved' })
        .eq('id', adjustmentId)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};