/**
 * MDSolo - Medical Document & Schedule Organizer
 * Copyright (C) 2025  Juan M. Fernandez (juanmf@gmail.com).
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * * For commercial licensing inquiries, contact: juanmf@gmail.com
 */

/**
 *
 * Handles the initial Web App GET request. This function acts as the primary
 * router, determining which controller to execute based on the URL parameter 'page'.
 *
 * @param {GoogleAppsScript.Events.DoGet} e The event parameter passed to the doGet handler.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The rendered HTML output for the browser.
 */
function doGet(e) {
  const requestedPage = e.parameter.page || "home";
  const controllerData = computeControllerData(requestedPage, e);

  // Use the main routing function to embed the Index template.
  const template = embedController(indexController, controllerData, null, false);

  return template
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle('MD Portal');
}

/**
 * Resolves a controller name (string) or function reference into a callable function.
 * This supports dynamic routing based on the 'page' parameter.
 *
 * @param {string | Function} controllerName The name of the controller function (e.g., 'home') or the function itself.
 * @returns {Function} The resolved controller function.
 * @throws {Error} If the controller function is not defined or is not callable.
 */
function getCallableController(controllerName) {
  if (typeof controllerName === 'function') {
    return controllerName;
  }

  // Convert 'home' to 'homeController'
  const pageName = controllerName.charAt(0).toLowerCase() + controllerName.slice(1);
  const callableName = `${pageName}Controller`;
  const controller = this[callableName]; // 'this' refers to the global scope in GAS

  if (typeof controller !== 'function') {
    throw new Error(`Controller function "${callableName}" is not defined or is not callable.`);
  }
  return controller;
}

/**
 * Prepares the standard data payload passed to all controllers.
 * This includes user context, URL details, and parsed query parameters.
 *
 * @param {string} requestedPage The name of the page requested by the user.
 * @param {GoogleAppsScript.Events.DoGet} e The event object from doGet.
 * @returns {object} The standardized controller data object.
 */
function computeControllerData(requestedPage, e) {
  const gasUrl = ScriptApp.getService().getUrl();
  const controller = getCallableController(requestedPage);

  const queryData = e.parameter.data
      ? JSON.parse(decodeURIComponent(e.parameter.data))
      : {};

  return {
    user_name: Session.getActiveUser().getEmail(),
    pageController: controller,
    queryData: queryData,
    gasUrl: gasUrl
  };
}

/**
 * Creates a base data object for template rendering, including the template file name
 * and response metadata. Merges any provided data into this object.
 *
 * @param {string} templateFile The name of the HTML file to be rendered (e.g., 'Index').
 * @param {object} [data] Additional data to be merged into the template context.
 * @returns {object} The merged data object ready for template processing.
 */
function mergeTemplateData(templateFile, data) {
  const templateData = {
    templateFile: templateFile,
    responseMetadata: new ResponseMetadata(null),
    gasUrl: ScriptApp.getService().getUrl()
  };
  if (data) {
    Object.assign(templateData, data);
  }
  return templateData;
}

/**
 * The default controller for the main 'index' page. It primarily returns the base template data.
 *
 * @param {object} data The standardized controller data object.
 * @returns {object} The template data object ready for rendering the 'Index' file.
 */
function indexController(data) {
  return mergeTemplateData('Index', data);
}

/**
 * Processes and renders a static HTML template file and returns the resulting HTML content string.
 * This is typically used for rendering partial views or components.
 *
 * @param {string} templateFile The name of the static HTML file (e.g., 'PatientTable').
 * @param {object} [data] Data to be bound to the template.
 * @returns {string} The HTML content string.
 */
function includeStaticTemplate(templateFile, data) {
  const templateData = mergeTemplateData(templateFile, data);
  const template = processTemplate(templateFile, templateData);
  return template.getContent();
}

/**
 * Executes a controller function and renders the resulting template.
 * This is typically used for synchronous server-side rendering in doGet.
 *
 * @param {Function | string} controllerFn The controller function or its name.
 * @param {object} data The standardized controller data object.
 * @param {string} [templateFile] Optional: Override the template file name returned by the controller.
 * @param {boolean} [renderTemplate=true] Whether to return the final content string or the HtmlOutput object.
 * @returns {string | GoogleAppsScript.HTML.HtmlOutput} The rendered HTML content or the raw HtmlOutput object.
 */
function embedController(controllerFn, data, templateFile = null, renderTemplate = true) {
  const {template, templateData} = doEmbedController(controllerFn, data, templateFile);
  return renderTemplate ? template.getContent() : template;
}

/**
 * Helper function that executes the controller, gets the template data, and processes the template.
 *
 * @param {Function | string} controllerFn The controller function or its name.
 * @param {object} data The standardized controller data object.
 * @param {string} [templateFile] Optional: Override the template file name returned by the controller.
 * @returns {{template: GoogleAppsScript.HTML.HtmlOutput, templateData: object}} An object containing the evaluated
 *   template and the data used.
 */
function doEmbedController(controllerFn, data, templateFile = null) {
  const resolvedController = getCallableController(controllerFn);
  const templateData = resolvedController(data);
  const finalTemplateFile = templateFile || templateData.templateFile;
  return {template: processTemplate(finalTemplateFile, templateData), templateData: templateData};
}

/**
 * Renders the final HTML output using the HtmlService.
 *
 * @param {string} filename The name of the HTML file to load.
 * @param {object} data The data object to bind to the template scriptlets.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The evaluated template object ready to be served.
 */
function processTemplate(filename, data) {
  if (data.literalRender) {
    // If literalRender is present, use the custom class to return the raw string
    return new LiteralHtmlOutput(data.literalRender);
  }

  const template = HtmlService.createTemplateFromFile(filename);

  // Assign all properties from the data object to the template object
  if (data) {
    Object.assign(template, data);
  }

  return template.evaluate();
}

/**
 * URL-encodes a JavaScript object into a string suitable for passing as a URL query parameter.
 * Used for routing between views (e.g., passing patientId).
 *
 * @param {object} data The data object to be encoded.
 * @returns {string} The URL-encoded JSON string.
 */
function encodeData(data) {
  // 1. Stringify the object to turn it into a JSON string
  const jsonString = JSON.stringify(data);

  // 2. URL-encode the string to make it safe for a URL query parameter
  return encodeURIComponent(jsonString);
}

/**
 * Mocks the HtmlOutput object returned by HtmlTemplate.evaluate().
 * This allows literal content to be treated like a rendered template.
 *
 * @param {string} content The literal HTML string to be returned by getContent().
 * @constructor
 */
class LiteralHtmlOutput {

  constructor(content) {
    this.content = content;
  }

  getContent() {
    return this.content;
  };

  // Include standard HtmlOutput methods used by doGet for safe chaining
  setXFrameOptionsMode(mode) {
    return this;
  };

  setTitle(title) {
    return this;
  };
}

/**
 * Handles error details extraction, typically for logging or user display.
 *
 * @param {Error} e The error object.
 * @returns {string} A formatted string containing error name, message, and stack trace.
 */
function errorDetails(e) {
  return ` ${e.name}: ${e.message}. Stack: ${e.stack || 'N/A'}`;
}

// =========================================================================
// ASYNCHRONOUS/UTILITY FUNCTIONS (less critical for synchronous routing)
// =========================================================================

/**
 * Executes a controller function and returns a standardized JSON object for
 * asynchronous calls (via google.script.run).
 *
 * @param {Function | string} controllerFn The controller function or its name.
 * @param {object} data The standardized controller data object.
 * @param {string} [templateFile] Optional: Override the template file name.
 * @param {boolean} [renderTemplate=true] If true, the template content is returned; otherwise, the HtmlOutput is returned.
 * @returns {object} A standardized JSON response object for client-side consumption.
 */
function asyncEmbedController(controllerFn, data, templateFile = null, renderTemplate = true) {
  const {template, templateData} = doEmbedController(controllerFn, data, templateFile);
  // This line implies that the content is being rendered for client-side insertion
  const content = renderTemplate ? template.getContent() : template;

  return asyncRender(content, templateData.responseMetadata);
}

/**
 * Creates a standardized JSON response envelope for asynchronous (google.script.run) calls.
 *
 * @param {string} content The HTML content string or JSON payload.
 * @param {object} responseMetadata Contains status and other metadata.
 * @param {number} [status=200] The HTTP-like status code.
 * @returns {object} The final standardized JSON response object.
 */
function asyncRender(content, responseMetadata, status = 200) {
  return {
    status: responseMetadata.status || status,
    content: content,
  };
}

/**
 * Temporary function to test and ensure the Calendar scope is requested by GAS.
 *
 * @returns {void}
 */
function checkCalendarPermission() {
  // This line is enough to trigger the Calendar scope request
  const calendar = CalendarApp.getCalendarById(MD_CALENDAR_ID);

  Logger.log(calendar, "Calendar access verified.");
}

/**
 * Class representing metadata for the API response.
 *
 * @constructor
 * @param {number} status The HTTP status code.
 */
class ResponseMetadata {
  constructor(status) {
    this.status = status;
  }
}
