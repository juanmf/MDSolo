# MDSolo - Medical Document & Schedule Organizer (Google Apps Script WebApp)

**Your practice, in your pocket.**

MDSolo is a mobile-first command center designed to transform your Google Sheets and Calendar into a sleek, 
smartphone-optimized interface. Manage patient records, search histories, and automate scheduling with a single 
tap—wherever your practice takes you.

### Why Doctors Love MD Solo:
* 📱 **Built for Mobile:** No more tiny spreadsheet cells. Big buttons and a clean layout designed for one-handed use.
* ⚡ **One-Tap Scheduling:** Instantly create calendar events and send patient invitations directly from the app.
* 🛡️ **Private & Secure:** Runs entirely within your own Google account. You own your data; no third-party servers involved.
* 🚀 **Zero Installation:** No App Store downloads. Access your portal via a secure web link on any device.


This guide details how to set up and deploy the project from scratch, MD friendly for non-tech savvy people.

*For developers, further instructions are provided for local development using the `clasp` command-line tool.*

## 🩺 Quick Start Guide for Medical Professionals

**MD Solo** is designed to be "Plug & Play." By default, it automatically connects to your current Google Spreadsheet and your primary Google Calendar.

### 1. Create Your Private Copy
1. Open the [MDSolo Master Spreadsheet](https://docs.google.com/spreadsheets/d/1itYDA0akNvXsHSmsgxObwguLonNvjxWoifgf60JTOYc/edit?gid=0#gid=0).
2. In the top menu, go to **File > Make a copy**.
3. Name it (e.g., `My Medical Practice`) and click **Make a copy**.

---

### 2. Understanding the Defaults (No Action Required)
Out of the box, the app is configured with the following "Smart Defaults":
* **Calendar:** It uses your primary Gmail calendar.
* **Storage:** It creates a folder named `MD-SOLO-PRACTICE` in your Google Drive for patient records.
* **Database:** It uses the spreadsheet you just copied as master index. Then creates a dedicated folder per patient, 
containing a dedicated spreadsheet per patient for visits log. You can then use the folder and spreadsheet to add
documents and notes manually (avoiding modifying automated fields). 

> **⚠️ Limitation:** Because it uses your primary email-based calendar and static root folder name, you can only run 
> **one** instance of MD Solo per Gmail account by default. If you need multiple separate practices on one email, see the 
> *Advanced Configuration* section below.

---

### 3. Launch the Web Interface
To access your patient portal, you must "Deploy" your copy:
1. In your spreadsheet, go to **Extensions** > **Apps Script**.
2. At the top right, click the blue **Deploy** button > **New deployment**.
3. Click the **Select type** (gear icon) and choose **Web app**.
4. Set these fields:
    * **Execute as**: `Me`
    * **Who has access**: `Only myself` (Crucial for HIPAA/Privacy).
5. Click **Deploy**.

---

### 4. Authorization (The "Safety" Screen)
1. Click **Authorize access** and choose your Google account.
2. You will see a "Google hasn't verified this app" warning.
    * Click **Advanced** (bottom left).
    * Click **Go to MDSolo (unsafe)**.
3. Click **Allow**.

**Copy the "Web App URL" provided.** Bookmark this link on your phone or computer—this is your portal to manage patients.

---

### ⚙️ Advanced Configuration (Optional)
If you want to change the folder name or run a **second instance** of the app on the same Gmail account:
1. Open the **Apps Script** editor.
2. Click `Constants.gs` on the left.
3. You can manually override the following lines by removing the `//` and typing your specific details:

```javascript
// Example: Use a specific calendar instead of your primary one
const MD_CALENDAR_ID = 'private-practice-1@gmail.com';

// Example: Change your patient records folder name
const ROOT_FOLDER_ID = 'Custom-Folder-Name';
```

# For Developers

This application is implemented as a "hidden" (albeit still incomplete) micro-framework web with MVC design pattern 
abstracting persistence (folder&spreadsheet) layer behind relevant Model classes.

Controllers are implemented as functions following `<fn>Controller` naming convention.

The View layer is teh strongest aspect so far, designed as a tree of embedded controllers with their respective template 
presentation that can render both as part of a full web request through `doGet()` as well as AJAX-like through 
`google.script.run.asyncEmbedController('<fn>', data)`. Where `<fn>` should match some controller function 
`<fn>Controller(data)`.

Example from `Index.html` of the neatness of embedded controllers.
```html
<html>
<head>
    <base target="_top">
    <?!= includeStaticTemplate('PicoCSS', null)?>
</head>
<body>
    <?!= includeStaticTemplate('IndexScripts', null)?>

    <?!= embedController(headerController, {user_name: user_name}); ?>
    <?!= embedController(menuController, {gasUrl: gasUrl}); ?>

    <div id="main-content">
        <?!= embedController(pageController, queryData); ?>
    </div>

</body>
</html>

```
## Command line deployments and Local Development 
### 🚀 Prerequisites

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

### ⚙️ Setup and Configuration

#### Step 1: Clone the Repository and Log in to Clasp

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

#### Step 2: Configure Project Constants

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

#### 🛑 Step 3: Enable the Advanced Calendar API Service (CRITICAL)

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

### 🚀 Deployment

The deployment workflow uses `clasp push` to sync code and `clasp deploy` to publish the Web App URL.

#### Step 1: Push Local Code to GAS Server

Push your local files (including the configured `Constants.js` and the updated `appsscript.json`) to the Google Apps Script project:

```bash
clasp push
```

#### Step 2: Create the Initial Web App Deployment

This command creates the first stable version (e.g., Version 1) and generates your permanent Web App URL.

```bash
clasp deploy --description "Initial stable deployment of MDSolo MVP."
```

When prompted, select **Web App** as the deployment type and configure:

* **Execute as:** `Me` (your Google Account).
* **Who has access:** Typically `Anyone` or `Anyone within your domain` for a Web App.

After deployment, **copy the resulting Deployment ID.**

#### Step 3: Update Existing Deployment

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

## TODO

Check TODO.js for what might be comming next, or contribution ideas.
If you feel like contributing feel free to PR unit tests :).
