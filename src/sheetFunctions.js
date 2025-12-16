function sheetLink(url, label, cell, returnFormula = false) {
  const formula = `=HYPERLINK("${url}", "${label}")`;
  if (returnFormula) {
    return formula;
  }
  cell.setFormula(formula); 
}
