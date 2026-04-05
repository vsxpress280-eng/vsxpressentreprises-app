export const formatMoney = (value, decimals = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.00";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatMoneyDOP = (value, decimals = 2) => {
  return `${formatMoney(value, decimals)} DOP`;
};

export const formatMoneyHTG = (value, decimals = 2) => {
  return `${formatMoney(value, decimals)} HTG`;
};