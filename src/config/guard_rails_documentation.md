# Guard-Rails Documentation

## Input Validation
- **Frontend:** All forms utilize controlled components with Zod or manual validation before submission (checking email formats, phone lengths, positive amounts).
- **Edge Functions:** All inputs are validated on the server-side using strict type checking and existence checks before processing.
- **Database:** Supabase RLS policies enforce row-level security, ensuring users cannot spoof IDs to access unauthorized data.
- **Example:** `CreateTransferForm` validates amount > 0, phone format is valid, and beneficiary name is present.

## Error Boundaries
- **ErrorBoundary.jsx:** Wraps the entire application to catch React component tree errors, displaying a user-friendly fallback UI with a "Reload" button.
- **Try-catch blocks:** All asynchronous operations (Supabase calls, API fetches) are wrapped in try-catch blocks.
- **User feedback:** Toast notifications (`useToast`) provide immediate visual feedback for both success and error states.
- **Example:** If a transfer submission fails due to network issues, the user sees a specific error message and can retry without losing form data.

## Structured Logging
- **Privacy:** No sensitive data is logged (passwords, tokens, full phone numbers are redacted or omitted).
- **Traceability:** All operations are logged with timestamps and associated user IDs to trace actions.
- **Context:** Error logs include error types and stack traces (in dev mode) or specific error codes (in prod).
- **Example:** "Transfer validation started for ID: 550e8400..." provides context without exposing PII.

## RLS Policies
- **Isolation:** Users can strictly only view/edit their own data.
- **Hierarchy:** Admins have global access, but controlled via specific `is_admin` checks.
- **Workers:** Can only view transfers explicitly assigned to them via the `worker_id` column.
- **Agents:** Can only view their own transfers via the `agent_id` column.
- **Example:** SELECT policy on transfers: `(auth.uid() = agent_id) OR (auth.uid() = worker_id) OR is_admin()`

## Transaction Guards
- **transactionsGuard.js:** Central utility to check if transactions are enabled globally or per-user.
- **Logic:** Before any financial operation, `checkTransactionStatus(userId)` is called.
- **Prevention:** If `transactions_disabled` is true for a user or globally, the operation is blocked at the UI and API level.
- **Example:** A suspended agent attempting a transfer will receive a "Service Unavailable" or "Account Suspended" message.