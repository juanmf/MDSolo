// Using current bound sheet for master Sheet.
const MASTER_SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Uses the user's primary calendar
const MD_CALENDAR_ID = Session.getEffectiveUser().getEmail();

// Default root folder.
const ROOT_FOLDER_ID = 'MD-SOLO-PRACTICE';

// Auto-detection above limits MD-Solo to one instance per gmail account.
// You can set the following manually to run several instances from one gmail account.
// Provided you create calendars per instance to avoid collision. and make further copies of the main spreadsheet.
// const MD_CALENDAR_ID = 'juanmf@gmail.com';
// const ROOT_FOLDER_ID = 'MD-SOLO-PRACTICE';

// TODO: extract following value from main sheet.
const VISIT_DEFAULT_PRICE = 30000.00;
const APP_TIME_ZONE = Session.getScriptTimeZone(); // Get the script's timezone
const VISIT_DURATION_MINUTES = 60;

const HTTP_CODE_SUCCESS = 200;
const HTTP_CODE_REDIRECT = 302;
const HTTP_CODE_BAD_REQUEST = 400;
const HTTP_CODE_UNPROCESSABLE_ENTITY = 422;
const HTTP_CODE_FORBIDDEN = 403;
