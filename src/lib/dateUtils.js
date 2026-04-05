/**
 * Safely converts a value to a Date object.
 * Handles strings that might be missing timezone information by assuming UTC ('Z') if looks like ISO.
 * @param {string|Date} value - The date value to convert
 * @returns {Date|null} - Date object or null if invalid
 */
export const toDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  let dateString = String(value);
  
  // If it looks like an ISO string (has T) but no timezone indicator (Z, +, - at end), append Z to assume UTC
  const hasTime = dateString.includes('T');
  const hasZ = dateString.endsWith('Z');
  const hasOffset = /[+-]\d{2}:?\d{2}$/.test(dateString);
  
  if (hasTime && !hasZ && !hasOffset) {
    dateString += 'Z';
  }
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Formats date only (DD/MM/YYYY)
 * @param {string|Date} value 
 * @param {string} locale 
 * @returns {string}
 */
export const formatDateLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (e) { return ''; }
};

/**
 * Formats time only (HH:mm)
 * @param {string|Date} value 
 * @param {string} locale 
 * @returns {string}
 */
export const formatTimeLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) { return ''; }
};

/**
 * Formats date and time short format (DD/MM/YYYY HH:mm)
 * @param {string|Date} value 
 * @param {string} locale 
 * @returns {string}
 */
export const formatDateTimeLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) { return ''; }
};

/**
 * Formats date and time long format (D month YYYY HH:mm)
 * @param {string|Date} value 
 * @param {string} locale 
 * @returns {string}
 */
export const formatDateTimeLongLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) { return ''; }
};

/**
 * Formats date long format (D month YYYY)
 * @param {string|Date} value 
 * @param {string} locale 
 * @returns {string}
 */
export const formatDateLongLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch (e) { return ''; }
};

/**
 * Gets today's date in Haiti timezone (EST/EDT) formatted as YYYY-MM-DD
 * Haiti uses America/Port-au-Prince timezone
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const getTodayHaitiString = () => {
  const haitiDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Port-au-Prince'
  });
  const date = new Date(haitiDate);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Converts a Haiti date string (YYYY-MM-DD) to ISO format with UTC timezone
 * Assumes the input date is in Haiti timezone and converts to ISO UTC
 * @param {string} haitiDateString - Date string in YYYY-MM-DD format (Haiti timezone)
 * @returns {string} - ISO date string with Z suffix (UTC)
 */
export const convertHaitiDateToISO = (haitiDateString) => {
  if (!haitiDateString) return null;
  
  // Parse the date string as if it's in Haiti timezone
  const [year, month, day] = haitiDateString.split('-');
  
  // Create a date in Haiti timezone
  const haitiDateStr = new Date(year, parseInt(month) - 1, parseInt(day)).toLocaleString('en-US', {
    timeZone: 'America/Port-au-Prince',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parse back and create UTC date
  const [m, d, y] = haitiDateStr.split('/');
  const utcDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));
  
  return utcDate.toISOString();
};