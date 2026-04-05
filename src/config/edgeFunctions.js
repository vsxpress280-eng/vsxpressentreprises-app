/**
 * PHASE 0: EDGE FUNCTION AUDIT
 * 
 * This file lists all Supabase Edge Functions currently invoked by the frontend application.
 * Generated during environment verification.
 */

export const EDGE_FUNCTIONS = [
  // Auth & Admin
  'create-admin-account',
  'create-user',
  'create-agent-account',
  'create-worker',
  'create-special-agent',
  'upload-id-document',
  
  // User Management
  'update-user',
  'delete-user',
  
  // Teams
  'create-team',
  'delete-team',
  'assign-agent-to-team',
  'update-agent-team',
  
  // Transfers
  'create-transfer',
  'upload-transfer-proof',
  'validate-transfer',
  'reject-transfer',
  'reassign-transfers',
  
  // Deposits
  'process-deposit',
  
  // Worker Adjustments & Stats
  'approve-adjustment',
  'get-worker-stats',
];

export default EDGE_FUNCTIONS;