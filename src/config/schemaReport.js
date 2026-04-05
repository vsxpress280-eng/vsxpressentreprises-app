/**
 * PHASE 0: DATABASE SCHEMA & CODE MISMATCH REPORT
 * 
 * This file documents inconsistencies found between the Database Schema
 * and the Frontend Codebase during verification.
 */

export const SCHEMA_NOTES = {
  users: {
    exchange_rate: "DB uses 'exchange_rate' and 'taux_change'. Code handles both but prefers 'exchange_rate'.",
    exchange_type: "Present in DB and Code.",
    fees: "DB uses 'frais'. Code maps 'fees' to 'frais'.",
    balance_exchange_rate: "Present in DB. Used for worker balance display.",
  },
  worker_adjustments: {
    status_field: "DB has both 'status' and 'statut'. Code seems to use 'statut' for filters but 'status' in some updates. Standardize on 'statut' is recommended.",
  },
  transfers: {
    amounts: "DB has 'amount_dop', 'total_htg', 'montant_htg'. Code mainly uses 'total_htg' or 'montant_htg'.",
    snapshot: "DB has 'exchange_rate_snapshot'. Code correctly prioritizes this over current user rate.",
  },
  wallets: {
    balance_htg: "DB has 'balance_htg'. Worker dashboard correctly prioritizes this over generic 'balance'.",
  }
};

export default SCHEMA_NOTES;