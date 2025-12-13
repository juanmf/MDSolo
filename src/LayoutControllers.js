function headerController(data){
    return mergeTemplateData('Header', data);
}

function menuController(data){
    return mergeTemplateData('Menu', data);
}

function homeController(data) {
    return mergeTemplateData('Home', data);
}

function calendarController(data) {
    // data.mdCalendarId = Utilities.base64EncodeWebSafe(MD_CALENDAR_ID).replace(/={1,2}$/, '');
    data.mdCalendarId = Utilities.base64EncodeWebSafe(MD_CALENDAR_ID).replace(/={1,2}$/, '');
    data.timeZone = APP_TIME_ZONE;
    Logger.log(data);
    return mergeTemplateData('CalendarContainer', data);
}

/**
 * Fetches all calendar events for today from a specified calendar,
 * extracts the patient ID from the description, and returns a list of patient data.
 * * @param {string} calendarId The ID of the Google Calendar to search (e.g., 'primary' or an email).
 * @returns {Array<Object>} An array of objects containing the event title (patient name) and patient ID.
 */
function todayVisitsController(data) {
  // --- Date Range for Today ---
  const today = new Date();
  // Set start of today (midnight)
  const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  // Set end of today (just before midnight tomorrow)
  const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
  
  const gasUrl = ScriptApp.getService().getUrl();
  
  // --- Fetch Events ---
  try {
    const calendar = CalendarApp.getCalendarById(MD_CALENDAR_ID);
    if (!calendar) {
      Logger.log(`Error: Calendar with ID "${MD_CALENDAR_ID}" not found.`);
      return [];
    }
    
    // Get all events occurring between startTime and endTime
    const events = calendar.getEvents(startTime, endTime);
    Logger.log(`Found ${events.length} events today`);

    const bookedPatients = [];
    
    // --- Process Events ---
    events.forEach(event => {
      const description = event.getDescription();
      const title = event.getTitle();
      
      // Regular expression to find 'patientId: [ID]'
      const patientIdRegex = /patientId: (.+)/;
      const match = description.match(patientIdRegex);
      
      let patientId = null;
      
      if (match && match.length > 1) {
        // match[1] holds the captured group (the ID after 'patientId: ')
        patientId = match[1].trim(); 
      }

      // Only include events that successfully contained a patient ID
      if (patientId) {
        const encodedData = encodeData({ patientId: patientId });
        
        // The "View Patient Sheet" link points to the PatientDetail view
        const patientDetailsLink = `${gasUrl}?page=PatientDetail&data=${encodedData}`;
        bookedPatients.push({
          patientName: title,
          patientDetailsLink: patientDetailsLink,
          eventStartTime: event.getStartTime().toLocaleTimeString(),
        });
      }
    });

    Logger.log(`Found ${bookedPatients.length} patients booked for today.`);
    return mergeTemplateData('TodayVisits', {data: data, bookedPatients: bookedPatients});

  } catch (e) {
    Logger.log(`Failed to fetch calendar events: ${e.message}`);
    return [];
  }
}
