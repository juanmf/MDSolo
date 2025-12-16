class Patient {
  constructor(data) {
    this.patientName = data.patientName;
    this.patientGovId = data.patientGovId;
    this.patientPhone = data.patientPhone;
    this.patientEmail = data.patientEmail;
    this.rootFolder = data.rootFolder;
    // TODO: define folder input type, name, id, object...
    if (data.sheetId) {
      // Assets exist.
      this.setAssetsRelatedAttributes(data);
    }
  }

  setAssetsRelatedAttributes(data) {
    this.id = data.sheetId;
    this.patientFolder = data.patientFolder;
    this.patientSS = data.sheetId ? SpreadsheetApp.openById(data.sheetId) : null;
    this.logSheet = data.logSheet;
    this.lastVisit = VisitModel.fromPatientSheetLastRow(this.logSheet, this);
  }

  createAssets(){
    if (this.patientSS) {
      throw new Error("Patient assets already created.");
    }
    let data = {folder: null, sheetId: null, logSheet: null};

    // 1a. Create the patient-specific folder
    const folderName = this.patientName.replace(/[^a-z0-9]/gi, '_') + '_' + new Date().getTime();
    data.patientFolder = this.rootFolder.createFolder(folderName);

    // 1b. Create the patient-specific spreadsheet inside the new folder
    let patientSS = SpreadsheetApp.create(`${this.patientName} - Visit Log`);
    data.logSheet = patientSS.getSheets()[0];

    // Move the new sheet into the patient's folder
    DriveApp.getFileById(patientSS.getId()).moveTo(data.patientFolder);
    data.sheetId = patientSS.getId();

    // 1c. Set up the header and visit log structure
    this.setupPatientLogSheet(data.logSheet, data.patientFolder);

    this.setAssetsRelatedAttributes(data);
  }

  setupPatientLogSheet(sheet, patientFolder) {

    // Header Information (e.g., lines 1-5)
    sheet.getRange('A1').setValue('Patient Name:');
    sheet.getRange('B1').setValue(this.patientName);
    sheet.getRange('A2').setValue('Phone:');
    sheet.getRange('B2').setValue(this.patientPhone);
    sheet.getRange('A3').setValue('Gov Id:');
    sheet.getRange('B3').setValue(this.patientGovId);
    sheet.getRange('A4').setValue('Patient Folder');
    sheetLink(patientFolder.getUrl(), "Open Patient Folder", sheet.getRange('B4'));

    sheet.getRange('A5').setValue('Patient e-Mail:');
    sheet.getRange('B5').setValue(this.patientEmail);

    VisitModel.setLogSheetVisitsHeader(sheet);
  }

  static fromSheet(sheetId) {
    const patientSS = SpreadsheetApp.openById(sheetId);
    const logSheet = patientSS.getSheets()[0];
    const patientFolder = DriveApp.getFileById(patientSS.getId()).getParents().next();

    let data = {
      patientName: logSheet.getRange('B1').getValue(),
      patientPhone: logSheet.getRange('B2').getValue(),
      patientGovId: logSheet.getRange('B3').getValue(),
      patientEmail: logSheet.getRange('B5').getValue(),
      rootFolder: getOrCreatePatientRootFolder(ROOT_FOLDER_ID),
      patientFolder: patientFolder,
      patientSS: patientSS,
      sheetId: sheetId,
      logSheet: logSheet,
    }

    return new Patient(data);
  }
}

class VisitModel {
  constructor(appointmentDateTime, notes, visitPrice, paid, eventLinkFormula, diagnosis, patient){
    // Date and Time of Appointment	Notes of Visit	Visit Amount	Amount Paid	eventLinkFormula	Diagnosis
    this.appointmentDateTime = appointmentDateTime;
    this.notes = notes;
    this.visitPrice = visitPrice;
    this.paid = paid;
    this.eventLinkFormula = eventLinkFormula;
    this.diagnosis = diagnosis;
    this.patient = patient;
  }

  getFormattedAppointmentDate() {
    if (this.appointmentDateTime instanceof Date && !isNaN(this.appointmentDateTime)) {
      // Format the date for display (adjust timezone and format as needed)
      return Utilities.formatDate(
          this.appointmentDateTime,
          this.patient.patientSS.getSpreadsheetTimeZone(),
          'yyyy-MM-dd HH:mm'
      );
    } else {
      return 'N/A';
    }
  }

  static fromPatientSheetLastRow(logSheet, patient){

    const lastRow = logSheet.getLastRow();

    // Assuming data starts at row 11 (after 10 header rows)
    if (lastRow === 10) {
      // No Visits yet.
      return null;
    }

    // Get values from the last row: Column A (Date) and Column F (Diagnosis).
    // The range starts at lastRow, column 1 (A), width 6 (to include Diagnosis in F).
    const visitData = logSheet.getRange(lastRow, 1, 1, 6).getValues()[0];
    // EventLink is in Sheet Formula format.
    return new VisitModel(visitData[0], visitData[1], visitData[2], visitData[3], visitData[4], visitData[5], patient);
  }

  persist() {

    // 3. Append Row to Patient Log Sheet (Columns A, B, C, D, E, F)
    // Note: Amount and Paid columns are left blank for future billing update.
    const newVisitRow = [
      this.appointmentDateTime, // Column A: Date/Time
      this.notes,         // Column B: Notes
      this.visitPrice,    // Column C: Visit Amount
      this.paid,            // Column D: Amount Paid (blank)
      'TEMP_EVENT_PLACEHOLDER', // Column E: Placeholder
      this.diagnosis      // Column F: Diagnosis (pending)
    ];

    this.patient.logSheet.appendRow(newVisitRow);
    const lastRow =  this.patient.logSheet.getLastRow();
    // Get the cell in Column E of the last row (E is the 5th column)
    const eventCell =  this.patient.logSheet.getRange(lastRow, 5);
    eventCell.setFormula(this.eventLinkFormula);
  }

  static setLogSheetVisitsHeader(sheet) {
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
}
