// ==== Google Apps Script - להדביק ב-script.google.com ====
// אחרי ההדבקה:
// 1. לחץ Deploy > New deployment
// 2. בחר Type: Web app
// 3. Execute as: Me
// 4. Who has access: Anyone
// 5. לחץ Deploy ותעתיק את ה-URL
// 6. הדבק את ה-URL ב-config.js בשדה appsScriptUrl

var FOLDER_NAME = 'הנצחה דניאל אלימלך - תמונות';
var PASSWORD = '3008';

function getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'updateDesc') {
      var file = DriveApp.getFileById(data.fileId);
      var meta = {};
      try { meta = JSON.parse(file.getDescription()); } catch (x) {}
      meta.description = data.desc || '';
      file.setDescription(JSON.stringify(meta));
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var folder = getOrCreateFolder();
    var fileData = Utilities.base64Decode(data.file);
    var blob = Utilities.newBlob(fileData, data.mimeType, data.fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var meta = {
      description: data.description || '',
      timestamp: new Date().toISOString(),
      fileId: file.getId()
    };
    file.setDescription(JSON.stringify(meta));

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      url: 'https://drive.google.com/uc?id=' + file.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;

    if (action === 'updateDesc') {
      var fileId = e.parameter.fileId;
      var desc = e.parameter.desc || '';
      var file = DriveApp.getFileById(fileId);
      var meta = {};
      try { meta = JSON.parse(file.getDescription()); } catch (x) {}
      meta.description = desc;
      file.setDescription(JSON.stringify(meta));
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      var pass = e.parameter.pass;
      if (pass !== PASSWORD) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false, error: 'סיסמה שגויה'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var fileId = e.parameter.fileId;
      DriveApp.getFileById(fileId).setTrashed(true);
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: list files
    var folder = getOrCreateFolder();
    var files = folder.getFiles();
    var result = [];

    while (files.hasNext()) {
      var file = files.next();
      var meta = {};
      try { meta = JSON.parse(file.getDescription()); } catch (x) {}

      result.push({
        fileId: file.getId(),
        name: file.getName(),
        url: 'https://drive.google.com/uc?id=' + file.getId(),
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
        mimeType: file.getMimeType(),
        description: meta.description || '',
        timestamp: meta.timestamp || file.getDateCreated().toISOString()
      });
    }

    result.sort(function(a, b) { return b.timestamp.localeCompare(a.timestamp); });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      files: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
