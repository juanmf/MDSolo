function sheetLink(url, label, cell) {
  const formula = `=HYPERLINK("${url}", "${label}")`;
  cell.setFormula(formula); 
}
