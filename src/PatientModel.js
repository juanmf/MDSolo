class Patient {
  constructor(data) {
    this.patientName = data.patientName
    this.patientGovId = data.patientGovId
    this.patientPhone = data.patientPhone
    this.patientEmail = data.patientEmail
    this.rootFolder = data.rootFolder
    // TODO: defind filder input type, name, id, object...
    this.patientFolder = data.folder
    this.patientSS = data.sheetId ? SpreadsheetApp.openById(data.sheetId) : null;
  }

  createAssets(){
    if (this.patientSS) {
      throw new Error("Patient assets already created.")
    }
    // 1a. Create the patient-specific folder
    const folderName = this.patientName.replace(/[^a-z0-9]/gi, '_') + '_' + new Date().getTime();
    this.patientFolder = this.rootFolder.createFolder(folderName);
    
    // 1b. Create the patient-specific spreadsheet inside the new folder
    this.patientSS = SpreadsheetApp.create(`${this.patientName} - Visit Log`);
    // Move the new sheet into the patient's folder
    DriveApp.getFileById(this.patientSS.getId()).moveTo(this.patientFolder);
    
    // 1c. Set up the header and visit log structure
    this.setupPatientLogSheet(this.patientSS);
  }

  setupPatientLogSheet(ss) {
    const sheet = ss.getActiveSheet();
    
    // Header Information (e.g., lines 1-5)
    sheet.getRange('A1').setValue('Patient Name:');
    sheet.getRange('B1').setValue(this.patientName);
    sheet.getRange('A2').setValue('Phone:');
    sheet.getRange('B2').setValue(this.patientPhone);
    sheet.getRange('A3').setValue('Gov Id:');
    sheet.getRange('B3').setValue(this.patientGovId);
    sheet.getRange('A4').setValue('Patient Folder');
    sheetLink(this.patientFolder.getUrl(), "Open Patient Folder", sheet.getRange('B4'));

    sheet.getRange('A5').setValue('Patient e-Mail:');
    sheet.getRange('B5').setValue(this.patientEmail);

    // TODO: define VisitModel
    // Visit Log Headers (starting from line 10)
    sheet.getRange('A10:F10').setValues([[
      'Date and Time of Appointment',
      'Notes of Visit',
      'Visit Amount',
      'Amount Paid',
      'Visits',
      'Diagnosis'
    ]]);
    
    // Optional: Apply basic formatting
    sheet.getRange('A10:F10').setFontWeight('bold').setBackground('#f0f0f0');
    sheet.setColumnWidth(2, 300); // Widen the Notes column
  }

  static fromSheet(sheet) {
    return new Patient("...");
  }
}