function doGet(e) {

  requestedPage = e.parameter.page||"home"
  controllerData = computeControllerData(requestedPage, e);

  // 1. Create a template from the file
  template = embedController(indexController, controllerData, null, false)
  return template
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('MD Portal');
}

function getCallableController(controllerName) {
  if (typeof controllerName === 'function') {
    return controllerName;
  } 

  const pageName = controllerName.charAt(0).toLowerCase() + controllerName.slice(1);
  const callableName = `${pageName}Controller`;
  const controller = this[callableName];

  if (typeof controller !== 'function') {
    // Handle the case where the function name exists but is not a function
    throw new Error(`Controller function "${callableName}" is not defined or is not callable.`);
  }
  return controller;
}

function computeControllerData(requestedPage, e) {
  const gasUrl = ScriptApp.getService().getUrl();
  controller = getCallableController(requestedPage);
  controllerData = {
    user_name: Session.getActiveUser().getEmail(),
    pageController: controller,
    queryData: e.parameter.data ? JSON.parse(decodeURIComponent(e.parameter.data)) : {},
    gasUrl: gasUrl
  }
  return controllerData;
}

function mergeTemplateData(templateFile, data) {
  templateData = {templateFile: templateFile, responseMetadata: {status: null}, gasUrl: ScriptApp.getService().getUrl()}
  if (data) {
    Object.assign(templateData, data);
  }
  return templateData; 
}

function indexController(data) {
  return mergeTemplateData('Index', data);
}

function includeStaticTemplate(templateFile, data) {
    templateData = mergeTemplateData(templateFile, data);
    template = processTemplate(templateFile, templateData);
    return template.getContent();
}

function asyncEmbedController(controllerFn, data, templateFile=null, renderTemplate=true) {
  template = doEmbedController(controllerFn, data, templateFile);
  return renderTemplate ? asyncRender(template.getContent(), templateData.responseMetadata) : template;
}

function embedController(controllerFn, data, templateFile=null, renderTemplate=true) {
  template = doEmbedController(controllerFn, data, templateFile);
  return renderTemplate ? template.getContent() : template;;
}

function doEmbedController(controllerFn, data, templateFile=null) {
  controllerFn = getCallableController(controllerFn)
  templateData = controllerFn(data);
  templateFile = templateFile || templateData.templateFile;
  template = processTemplate(templateFile, templateData);
  return template;
}

function asyncRender(content, responseMetadata, status=200, ) {
  return {
    status: responseMetadata.status||200,
    content: content,
  }
}

function processTemplate(filename, data) {
  if (data.literalRender) {
    // returns dummy class with getContent() implementation returning literalRender.
    // No template will be rendered but Controller generated String, stored in data.literalRender instead.
    return new LiteralHtmlOutput(data.literalRender);
  }
  const template = HtmlService.createTemplateFromFile(filename);
  // Assign all properties from the data object to the template object
  if (data) {
    Object.assign(template, data);
  }
  
  return template.evaluate();
}

function encodeData(data) {
  // 1. Stringify the object to turn it into a JSON string
  const jsonString = JSON.stringify(data);
  
  // 2. URL-encode the string to make it safe for a URL query parameter
  return encodeURIComponent(jsonString);
}

// (Temporary function)
function checkCalendarPermission() {
  // This line is enough to trigger the Calendar scope request
  const calendar = CalendarApp.getCalendarById(MD_CALENDAR_ID);

  Logger.log(calendar, "Calendar access verified.");
}


/**
 * Mocks the HtmlOutput object returned by HtmlTemplate.evaluate().
 * This allows literal content to be treated like a rendered template.
 * @param {string} content The literal HTML string to be returned by getContent().
 * @return {object} An object matching the necessary HtmlOutput interface.
 */
function LiteralHtmlOutput(content) {
  // The essential method for your rendering pipeline
  this.getContent = function() {
    return content;
  };
  
  // Optional: Include other standard HtmlOutput methods 
  // that might be used by your main template or framework, 
  // like setXFrameOptionsMode() or append().
  this.setXFrameOptionsMode = function(mode) {
    return this; // Return itself to allow chaining
  };
  
  this.setTitle = function(title) {
    return this;
  };
  
  // Note: Only include methods your application actually calls.
}

class ResponseMetadata {
  constructor (status) {
    this.status = status;
  }
}

function errorDetails(e) {
  return ` ${e.name}: ${e.message}. Stack: ${e.stack || 'N/A'}`;
}
