/**
 * Formats a sequential number into a transfer code (e.g., VSX-00001).
 * @param {number} transferNumber - The sequential transfer number.
 * @returns {string} - The formatted code.
 */
export function makeTransferCode(transferNumber) {
  if (transferNumber === undefined || transferNumber === null) return "VSX-????";
  return `VSX-${transferNumber.toString().padStart(5, '0')}`;
}

/**
 * Converts a UUID into a stable short code format VSX-XXXX (Backward Compatibility).
 * @param {string} uuid - The unique identifier (UUID)
 * @returns {string} - The formatted code (e.g., VSX-1234)
 */
export function makeTransferCodeFromId(uuid) {
  if (!uuid || typeof uuid !== 'string') return "VSX-????";
  
  // Extract the last block of the UUID to ensure we use the most variable part
  // UUID format: 8-4-4-4-12 hex characters
  // We take the last 4 characters of the UUID string for calculation
  const suffix = uuid.replace(/-/g, '').slice(-4);
  
  // Convert hex to decimal
  const decimalValue = parseInt(suffix, 16);
  
  // If parsing fails for some reason, return fallback
  if (isNaN(decimalValue)) return "VSX-ERR";

  // Map to 0-9999 range
  const code = decimalValue % 10000;
  
  // Format with leading zeros
  return `VSX-${code.toString().padStart(4, '0')}`;
}

/**
 * Helper to get the best display code for a transfer object.
 * Prioritizes transfer_number, falls back to UUID logic.
 * @param {object} transfer - The transfer object containing transfer_number and/or id.
 * @returns {string} - The formatted code.
 */
export function getTransferCode(transfer) {
  if (transfer?.transfer_number) {
    return makeTransferCode(transfer.transfer_number);
  }
  if (transfer?.id) {
    return makeTransferCodeFromId(transfer.id);
  }
  return "VSX-????";
}