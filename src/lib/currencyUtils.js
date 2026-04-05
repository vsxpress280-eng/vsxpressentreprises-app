/**
 * Utility functions for currency conversion and formatting.
 * Assumes Exchange Rate is defined as "HTG per 1 Unit of Foreign Currency".
 * Example: Rate = 13.5 means 1 DOP = 13.5 HTG.
 */

// Helper to safely parse numbers
const safeNumber = (val) => {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Calculates the Foreign Currency amount equivalent to a given HTG amount.
 * Formula: Foreign = HTG / Rate
 * @param {number|string} amountHTG - The amount in HTG
 * @param {number|string} exchangeRate - The exchange rate (HTG per Unit)
 * @returns {number} The equivalent amount in Foreign Currency (e.g., DOP)
 */
export const computeEquivalentFromHTG = (amountHTG, exchangeRate) => {
  const amount = safeNumber(amountHTG);
  const rate = safeNumber(exchangeRate);
  
  if (rate <= 0) return 0;
  
  return amount / rate;
};

/**
 * Calculates the HTG amount equivalent to a given Foreign Currency amount.
 * Formula: HTG = Foreign * Rate
 * @param {number|string} amountForeign - The amount in Foreign Currency (e.g., DOP)
 * @param {number|string} exchangeRate - The exchange rate (HTG per Unit)
 * @returns {number} The equivalent amount in HTG
 */
export const computeHTGFromEquivalent = (amountForeign, exchangeRate) => {
  const qty = safeNumber(amountForeign);
  const rate = safeNumber(exchangeRate);
  
  return qty * rate;
};

/**
 * Formats exchange rate information for display.
 * @param {string} exchangeType - The currency code (e.g., 'DOP', 'USD')
 * @param {number|string} exchangeRate - The rate value
 * @returns {string|null} Formatted string or null if invalid
 */
export const formatExchangeRateInfo = (exchangeType, exchangeRate) => {
  const rate = safeNumber(exchangeRate);
  if (!exchangeType || rate <= 0) return null;
  
  // Format: "Taux: 1 DOP = 13.50 HTG"
  return `Taux: 1 ${exchangeType} = ${rate.toFixed(2)} HTG`;
};

/**
 * Formats a currency value with specific locale settings.
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency suffix (e.g., 'HTG')
 * @returns {string} Formatted string
 */
export const formatCurrency = (amount, currency = 'HTG') => {
  const num = safeNumber(amount);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + (currency ? ` ${currency}` : '');
};