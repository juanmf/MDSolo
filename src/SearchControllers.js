function patientSearchController(data) {
  return mergeTemplateData('SearchForm', {data: data||{}})
}

function doPatientSearchController(data) {
  patients = findPatients(data.searchTerm, data.diagnosisKeyword);
  return mergeTemplateData('SearchResults', {data: data, matches: patients})
}

function findPatients(searchTerm, diagnosisKeyword) {
  if (!searchTerm && !diagnosisKeyword) {
    return [];
  }

  const term = searchTerm.toLowerCase();  
  const keyword = diagnosisKeyword.toLowerCase();
  
  const masterSS = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const masterSheet = masterSS.getSheets()[0];
  
  // Assume data starts at row 2 and has columns: Name, GovID, Link1, Link2, SheetID (Column E), Date
  // Adjust range based on your actual master sheet structure!
  const range = masterSheet.getRange('A2:F' + masterSheet.getLastRow());
  const masterData = range.getValues();
  
  const results = [];
  
  masterData.forEach(row => {
      const [name, govId, folderLink, sheetLink, patientSheetId, dateCreated] = row;
      
      // 1. Check General Match (Name or GovID)
      const generalMatch = (term && (name.toString().toLowerCase().includes(term) || 
                                      govId.toString().toLowerCase().includes(term)));
      
      // 2. Check Diagnosis Match (Expensive operation)
      let diagnosisMatch = false;
      if (keyword && patientSheetId) {
          try {
              diagnosisMatch = searchPatientNotes(patientSheetId, keyword);
          } catch (e) {
              Logger.log(`Skipping patient ${name} due to error: ${e.message}`);
          }
      }

      // 3. Add to results if criteria met
      // If the user provided both, ALL criteria must be met (AND logic).
      if ((term && generalMatch) || (keyword && diagnosisMatch) || (!term && !keyword)) {
          // Include link to the Patient Details controller
          const data = encodeData({ patientId: patientSheetId });
          const patientDetailsLink = `?page=PatientDetail&data=${data}`;

          results.push({ 
              name, 
              govId, 
              dateCreated: dateCreated instanceof Date ? Utilities.formatDate(dateCreated, masterSS.getSpreadsheetTimeZone(), 'yyyy-MM-dd') : 'N/A',
              detailsLink: patientDetailsLink
          });
      }
  });

  return results;
}