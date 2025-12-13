# MDSolo - Medical Document & Schedule Organizer (Google Apps Script WebApp)

MDSolo is a Google Apps Script (GAS) Web Application designed to streamline the management of patient records and scheduling within Google Workspace. It provides features for patient search, detail viewing, and automated calendar event creation with patient email invitations.

This guide details how to set up and deploy the project from scratch using the `clasp` command-line tool.

## 🚀 Prerequisites

Before starting, ensure you have the following installed and set up:

1.  **Node.js & npm:** Required to install `clasp`.
2.  **clasp (Command Line Apps Script Project):** Install globally via npm.
    ```bash
    npm install -g @google/clasp
    ```
3.  **Google Account:** With access to Google Sheets and Google Calendar.
4.  **Initial Setup:** Create the following Google resources:
    * **Master Patient Index Sheet:** An empty Google Sheet that will serve as the index for all patients.
    * **Dedicated Google Calendar:** A calendar for scheduling patient appointments.

## ⚙️ Setup and Configuration

### Step 1: Clone the Repository and Log in to Clasp

1.  Clone the project repository:

    ```bash
    git clone https://github.com/juanmf/MDSolo.git
    cd MDSolo
    ```

2.  Log in to your Google Account via `clasp`:

    ```bash
    clasp login
    ```

    This will open a browser window asking you to grant permissions.

3.  Clone the associated Apps Script project. If this is a brand new project, you'll need to create the script first.

    * **If your project is new:**
      ```bash
      clasp create --title "MDSolo WebApp" --type webapp --rootDir ./src
      ```
    * **If you are linking to an existing project:**
      ```bash
      clasp clone <Script ID>
      ```

### Step 2: Configure Project Constants

Navigate to the `src/Constants.js` file to configure the IDs for your Google Workspace resources.

| Constant | Description | Value to Use |
| :--- | :--- | :--- |
| `MASTER_SHEET_ID` | The ID of the Google Sheet that holds your master list of patients. | `[Your Master Index Sheet ID]` |
| `MD_CALENDAR_ID` | The ID of the Google Calendar used for booking appointments. | `[Your Calendar ID] (e.g., your-email@gmail.com)` |

**`src/Constants.js` example:**

```javascript
const MASTER_SHEET_ID = "1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz0"; 
const MD_CALENDAR_ID = "your.email.or.calendar.id@group.calendar.google.com";
```

### 🛑 Step 3: Enable the Advanced Calendar API Service (CRITICAL)

The event creation logic relies on the Advanced Calendar API to send email invites (`sendNotifications: true`). This service must be enabled manually and then synchronized with `clasp`.

1.  **Synchronize the Manifest:** If you cloned a new project, run a quick push/pull to ensure your local `appsscript.json` is ready.

    ```bash
    clasp push
    clasp pull
    ```

2.  **Manually Edit `appsscript.json`:** Open the local `appsscript.json` file and ensure the following dependency block exists under the main object:

    ```json
    "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Calendar",
        "version": "v3", 
        "serviceId": "calendar"
      }
    ]
    },
    ```

    *If you skip this step, deployment will remove the API, and your script will fail with the error `Calendar is not defined`.*

## 🚀 Deployment

The deployment workflow uses `clasp push` to sync code and `clasp deploy` to publish the Web App URL.

### Step 1: Push Local Code to GAS Server

Push your local files (including the configured `Constants.js` and the updated `appsscript.json`) to the Google Apps Script project:

```bash
clasp push
```

### Step 2: Create the Initial Web App Deployment

This command creates the first stable version (e.g., Version 1) and generates your permanent Web App URL.

```bash
clasp deploy --description "Initial stable deployment of MDSolo MVP."
```

When prompted, select **Web App** as the deployment type and configure:

* **Execute as:** `Me` (your Google Account).
* **Who has access:** Typically `Anyone` or `Anyone within your domain` for a Web App.

After deployment, **copy the resulting Deployment ID.**

### Step 3: Update Existing Deployment

To update the code running behind your active Web App URL without changing the URL, use the `--deploymentId` flag with the ID you copied in Step 2.

```bash
# Replace AKfycb... with your actual Deployment ID
clasp deploy --deploymentId AKfycb...ProdURL --description "Feature update: Added today's appointment list."
```

Your Web App is now running at the published URL\!
It will create a directory structure under folder `ROOT_FOLDER_ID` (where should `MASTER_SHEET_ID` reside):
```
<PATIENT_NAME_TimespatmpOfCreation> e.g.:
Pepe_1765594453472
  -> Pepe - Visit Log // Dedicate spreadsheet 
```

You can manually add Documents to the folder, which can be opened from the web app. 
Spreadsheet is used as database. Do not modify structure added by script.
