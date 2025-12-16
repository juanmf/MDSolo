// newVisit.gs

// Replace with the MD's specific calendar ID (get this from Google Calendar settings)
/**
 * Books a visit: creates the Calendar event and updates the patient spreadsheet.
 * @param {string} patientLogSSId Id of the Patient Sheet.
 * @param {string} visitDate Date string (e.g., "2025-12-30").
 * @param {string} visitTime Time string (e.g., "14:00").
 * @param {string} notes Initial notes/diagnosis.
 * @return {string} Success message or error.
 */
function bookNewVisitController(data) {
  // --- ASSUMPTION ---
  // This call should happen from within the patient detail page
  let {patientId, visitDate, visitTime, visitPrice, notes} = data;
  try {
    const patient = Patient.fromSheet(patientId);
    
    // 1. Define Start/End Time (assume 1 hour)
    const startDateTime = new Date(`${visitDate}T${visitTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (VISIT_DURATION_MINUTES * 60 * 1000));

    const eventId = createAndInvitePatientEvent(
        patient.patientName, startDateTime, endDateTime, patient.patientEmail, patient.patientSS, notes);

    const calendar = CalendarApp.getCalendarById(MD_CALENDAR_ID);
    const fullEvent = calendar.getEventById(eventId);

    const visit = new VisitModel(
        startDateTime,
        notes,
        visitPrice,
        '',
        sheetLink(getEventUrl(fullEvent, eventId), "View Event", null, true),
        'Pending',
        patient);

    visit.persist();

    return redirectToPatientDetailPageResponse(patient);
    // TODO: set the following message as a flash message upon redirect.
    // return `Visit successfully booked for ${patient.patientName} on ${startDateTime.toLocaleString()}.`;

  } catch (e) {
    // If the spreadsheet append fails, you may want to delete the event to prevent a ghost booking!
    Logger.log("Booking error: " + e);
    data.error = `Error booking visit: ${e.message}`;
    return mergeTemplateData('NewVisitForm', {patient: patient, data: data});

  }
}

/**
 * Creates a calendar event and sends an invitation email to the patient.
 * NOTE: Requires the "Calendar API" service to be enabled in the Apps Script project.
 * @param {string} patientName The patient's name (event title).
 * @param {Date} startDateTime The event start time (Date object).
 * @param {Date} endDateTime The event end time (Date object).
 * @param {string} patientEmail The email address of the patient.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} logSS The patient's log spreadsheet.
 * @returns {string} The ID of the created event.
 */
function createAndInvitePatientEvent(patientName,
                                     startDateTime,
                                     endDateTime,
                                     patientEmail,
                                     logSS,
                                     notes) {
  // Configuration: Replace with your actual calendar ID
  let atendees = []
  if (patientEmail) {
    atendees = [
      { email: patientEmail } // Patient's email
      // You can add other staff emails here if needed
    ];
  }
  // 1. Build the Event Resource Object
  const eventResource = {
    summary: patientName,
    description: `Initial Notes: ${notes} \n  View Patient Details (Click 'More Details' first to activate link): \
    ${logSS.getUrl()}\n patientId: ${logSS.getId()}`,

    // Convert JavaScript Date objects to RFC3339 format for the API
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Session.getScriptTimeZone() // Use the script's default time zone
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Session.getScriptTimeZone()
    },

    // 2. Define the Patient as an Attendee
    attendees: atendees,

    // Optional: Controls attendee privileges
    guestsCanModify: false,
    guestsCanInviteOthers: false,
    guestsCanSeeOtherGuests: false
  };

  // 3. Use the Advanced Service to Insert the Event and Send Notifications
  try {
    const createdEvent = Calendar.Events.insert(
        eventResource,
        MD_CALENDAR_ID,
        {
          // *** CRITICAL STEP ***: This flag triggers the email notification
          sendNotifications: true
        }
    );

    Logger.log(`Event created and email sent for Patient: ${patientName}. Event ID: ${createdEvent.id}`);
    return createdEvent.id;

  } catch (e) {
    Logger.log(`Error creating event via Calendar API: ${e.message}`);
    throw new Error('Failed to create calendar event and send invite.');
  }
}

function getBaseEventId(fullEventId, calendarId) {
  // Finds the '@' symbol and returns the substring before it.
  const atIndex = fullEventId.indexOf('@');
  let eventId = "";
  if (atIndex !== -1) {
     eventId = fullEventId.substring(0, atIndex);
  } else {
     eventId = fullEventId; // Fallback, though typically not needed for GCal IDs
  }
  return Utilities.base64EncodeWebSafe(eventId + " " + calendarId).replace(/={1,2}$/, '');
}

function getEventUrl(fullEvent, eventId) {
  let calendarUrl;
  try {
      // This should now work on the re-fetched object
      // TODO: still fails double check API docs.
      calendarUrl = fullEvent.getHtmlLink(); 
  } catch (e) {
      // Fallback: If it still fails, use the simpler public event link format
      Logger.log(e);
      Logger.log("getHtmlLink failed even after re-fetch. Falling back to base ID URL.");
      // Could resort to getOriginalCalendarId() if more than one Calendar become in use. 
      const baseEventId = getBaseEventId(eventId, MD_CALENDAR_ID);
      // const srcParam = encodeURIComponent(MD_CALENDAR_ID);
      calendarUrl = `https://calendar.google.com/calendar/event?eid=${baseEventId}`;
  }

  return calendarUrl;
}
