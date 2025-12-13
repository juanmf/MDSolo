function patientDetailController(data) {
    const patientSS = SpreadsheetApp.openById(data.patientId);
    const logSheet = patientSS.getSheets()[0]; 
    const patientFolder = DriveApp.getFileById(patientSS.getId()).getParents().next();
    // Initialize the details object
    const details = {
        patientSSUrl: patientSS.getUrl(),
        folderUrl: patientFolder.getUrl(),
        patientId: data.patientId, // Keep the ID for passing to the New Visit form
        patientName: 'N/A',
        lastVisit: 'N/A',
        lastDiagnosis: 'N/A',
        notes: 'No general notes available.' // Placeholder for general notes if needed later
    };

    // --- 1. Get Patient Name from Header (Cell B1) ---
    // Assuming the patient log sheet has the name in cell B1.
    details.patientName = logSheet.getRange('B1').getValue();
    details.patientPhone = logSheet.getRange('B2').getValue();
    details.patientEmail = logSheet.getRange('B5').getValue();

    // --- 2. Get Last Visit and Diagnosis from Log (Last Row) ---

    const lastRow = logSheet.getLastRow();

    // Assuming data starts at row 11 (after 10 header rows)
    if (lastRow > 10) { 
        // Get values from the last row: Column A (Date) and Column F (Diagnosis).
        // The range starts at lastRow, column 1 (A), width 6 (to include Diagnosis in F).
        const visitData = logSheet.getRange(lastRow, 1, 1, 6).getValues()[0];
        
        const visitDate = visitData[0]; // Column A: Date/Time Object
        const diagnosis = visitData[5]; // Column F: Diagnosis
        
        // Check if the date is a valid object before formatting
        if (visitDate instanceof Date && !isNaN(visitDate)) {
            // Format the date for display (adjust timezone and format as needed)
            details.lastVisit = Utilities.formatDate(
                visitDate, 
                patientSS.getSpreadsheetTimeZone(), 
                'yyyy-MM-dd HH:mm'
            );
        }
        
        details.lastDiagnosis = diagnosis || 'N/A';
    }
    return mergeTemplateData('PatientDetailForm', {details: details});  

}

function newVisitController (data) {
    return mergeTemplateData('NewVisitForm', {details: data});
}

function newPatientController(data) {
    return mergeTemplateData('NewPatientForm', {details: data});

}

function createNewPatientController(patientData) {
  const patientName = patientData.patientName;
  const patientGovId = patientData.patientGovId;
  const patientPhone = patientData.patientPhone;
  const patientEmail = patientData.patientEmail;

  let inputHasErrors = hasErrors(patientName, patientGovId, patientPhone)
  if (inputHasErrors) {
    // TODO: Handle error as template
    return mergeTemplateData('NewPatientForm', 
        {error: inputHasErrors, patientData: patientData, responseMetadata: new ResponseMetadata(HTTP_CODE_UNPROCESSABLE_ENTITY)});
  } 

  const patient = doCreateNewPatient(patientName, patientGovId, patientPhone, patientEmail);
  const gasUrl = ScriptApp.getService().getUrl();
  return mergeTemplateData(null, 
        // TODO: MAKE ROUTER
        {literalRender: `${gasUrl}?page=PatientDetail&data=${encodeData({patientId: patient.patientSS.getId()})}`, 
         responseMetadata: new ResponseMetadata(HTTP_CODE_REDIRECT)});
}

function hasErrors(patientName, patientGovId, patientPhone) {

  if (!patientName) {
    return "Error: Patient name cannot be empty.";
  }
  if (!patientGovId) {
    return "Error: patient Gov Id name cannot be empty.";
  }
  if (!patientPhone) {
    return "Error: patient Phone name cannot be empty.";
  }
  return false;
}

/**
 * Creates a new patient record, including a Drive folder, 
 * a structured spreadsheet, and a master index entry.
 * @param {string} patientName The name entered by the user.
 * @return {string} Success or error message.
 */
function doCreateNewPatient(patientName, patientGovId, patientPhone, patientEmail) {
  if (!patientName) {
    return "Error: Patient name cannot be empty.";
  }

  try {
    // --- Step 1: Create Drive Folder and Patient Spreadsheet ---
    
    // Define the root folder where all patient records are stored (replace with your actual folder ID)
    const rootFolder = getOrCreatePatientRootFolder(ROOT_FOLDER_ID);
    data = {
      patientName: patientName, 
      patientGovId: patientGovId, 
      patientPhone: patientPhone,
      patientEmail: patientEmail,
      rootFolder: rootFolder,
      folder: null,
      sheetId: null,
    };
    const patient = new Patient(data);
    patient.createAssets();
    updateMasterSheet(patient)
    return patient;
    
  } catch (e) {
    // TODO handle error, revisit
    const error = errorDetails(e)
    Logger.log('Error creating patient: ' + error);
    throw e;
  }
}

function updateMasterSheet(patient) {
    // --- Step 2: Update the Master Sheet ---
    
    // IMPORTANT: Make sure MASTER_SHEET_ID is defined globally or passed in.
    const masterSS = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const masterSheet = masterSS.getSheets()[0]; 

    // 2a. Prepare the initial row data with a placeholder for the hyperlink column (Column B)
    // We only include the plain text columns here (A and C)
    const newRowData = [
      patient.patientName,                                    // Column A: name
      patient.patientGovId,                                    // Column B: gov Id
      'TEMP_FOLDER_PLACEHOLDER',                      // Column C: placeholder (will be overwritten with formula)
      'TEMP_SHEET_PLACEHOLDER',                      // Column D: placeholder (will be overwritten with formula)
      patient.patientSS.getId(),                      // Column D: placeholder (will be overwritten with formula)
      `${new Date().toLocaleDateString()}`    // Column E: notes
    ];
    
    // Get the URL of the newly created folder
    const folderUrl = patient.patientFolder.getUrl(); 
    const sheetUrl = patient.patientSS.getUrl(); 
    
    masterSheet.appendRow(newRowData);
    const lastRow = masterSheet.getLastRow();
        
    const folderCell = masterSheet.getRange(lastRow, 3); 
    sheetLink(folderUrl, "View Folder", folderCell);

    const sheetCell = masterSheet.getRange(lastRow, 4); 
    sheetLink(sheetUrl, "View Patient Sheet", sheetCell);
}

function getOrCreatePatientRootFolder(folderName) {
  
  // 1. Search for a folder with the exact name in the user's Drive
  // Note: Searching the entire drive can be slow if the user has many files.
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    // 2. If the folder exists, return the first one found
    return folders.next();
  } else {
    // 3. If the folder does not exist, create it in the user's root Drive.
    Logger.log(`Root folder "${folderName}" not found. Creating a new one.`);
    return DriveApp.createFolder(folderName);
  }
}
