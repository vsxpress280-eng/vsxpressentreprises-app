/**
 * Credit preview util (supporte DOP<->HTG)
 *
 * rate = "1 DOP = X HTG"
 *
 * @param {Object} params
 * @param {string|number} params.creditInput - montant saisi
 * @param {string|number} params.rate - X (HTG par 1 DOP)
 * @param {'DOP'|'HTG'} params.inputCurrency - devise du champ saisi
 * @param {'DOP'|'HTG'} params.outputCurrency - devise de l'estimation
 * @returns {Object} { isValid, estimatedAmount, formula, currency, errorMessage }
 */
export const computeCreditPreview = ({
  creditInput,
  rate,
  inputCurrency,
  outputCurrency,
}) => {
  const c = parseFloat(creditInput);
  const r = parseFloat(rate);

  if (!inputCurrency || !outputCurrency) {
    return {
      isValid: false,
      errorMessage: "devise non définie",
      estimatedAmount: null,
      formula: null,
      currency: null,
    };
  }

  // Champ vide / zéro => pas d'erreur, juste pas de preview
  if (creditInput === undefined || creditInput === null || creditInput === "") {
    return {
      isValid: false,
      errorMessage: "",
      estimatedAmount: null,
      formula: null,
      currency: null,
    };
  }

  if (isNaN(c) || c <= 0) {
    return {
      isValid: false,
      errorMessage: "",
      estimatedAmount: null,
      formula: null,
      currency: null,
    };
  }

  const needsRate = inputCurrency !== outputCurrency;
  if (needsRate) {
    if (rate === "" || rate === null || rate === undefined || isNaN(r) || r <= 0) {
      return {
        isValid: false,
        errorMessage: "rate invalide",
        estimatedAmount: null,
        formula: null,
        currency: null,
      };
    }
  }

  let estimated = c;
  let formula = `${c}`;

  // rate = HTG par 1 DOP
  if (inputCurrency === "DOP" && outputCurrency === "HTG") {
    estimated = c * r;
    formula = `${c} × ${r}`;
  } else if (inputCurrency === "HTG" && outputCurrency === "DOP") {
    estimated = c / r;
    formula = `${c} ÷ ${r}`;
  }

  const symbol = outputCurrency === "DOP" ? "RD$" : outputCurrency;

  return {
    isValid: true,
    estimatedAmount: estimated.toFixed(2),
    formula,
    currency: symbol,
    errorMessage: null,
  };
};