/**
 * ===============[ TABLE OF CONTENTS ]=================
 * 0. Initialize
 *   0.1 Libraries 
 *   0.2 Globals
 *   0.3 Check Access
 * 
 * 1. Create Functions 
 *   1.1 copyFile 
 *   1.2 pushFile
 * 
 * 2. Read Functions 
 *   2.1 pullFile
 *   2.2 streamFile 
 *   2.3 fileExists 
 *   2.4 listFiles 
 *   2.5 listFolders
 * 
 * 3. Update Functions 
 *   3.1 renameFile 
 *   3.2 moveFile
 * 
 * 4. Delete Functions 
 *   4.1 deleteFile
 * 
 ******************************************************
 googleDriveInstance functions available, 
{
  files: {
    copy: [Function: copy],
    create: [Function: create],
    delete: [Function: delete],
    emptyTrash: [Function: emptyTrash],
    export: [Function: export],
    generateIds: [Function: generateIds],
    get: [Function: get],
    list: [Function: list],
    update: [Function: update],
    watch: [Function: watch],
    copyAsync: [Function: ret],
    createAsync: [Function: ret],
    deleteAsync: [Function: ret],
    emptyTrashAsync: [Function: ret],
    exportAsync: [Function: ret],
    generateIdsAsync: [Function: ret],
    getAsync: [Function: ret],
    listAsync: [Function: ret],
    updateAsync: [Function: ret],
    watchAsync: [Function: ret]
  }
} 
/* ===============[ 0. Initialize ]===================*/
// 0.1 Libraries 
process.env.DOTENV_LOADED || require('dotenv').config();
require('colors');
const debug = require('debug')('tests:googleDrive'.brightWhite);
const fs = require('fs');
const path = require('path');
const Utils = require('../utils');
const NodeGoogleDrive = require('node-google-drive');

// 0.2 Globals 
const YOUR_ROOT_FOLDER = process.env.GDRIVE_ROOT_FOLDER;
const PATH_TO_CREDENTIALS = path.resolve(__dirname, '../config/google-drive.json');

const creds_service_user = require(PATH_TO_CREDENTIALS);
const googleDriveInstance = new NodeGoogleDrive({
  ROOT_FOLDER: YOUR_ROOT_FOLDER
});

// 0.3 Check Access
const checkAccess = async () => {
  try {
    // Check if we have access 
    let gdrive = await googleDriveInstance.useServiceAccountAuth(creds_service_user);
  } catch (ex) {
    debug("===============[ Error ]=================".red);
    debug(ex.stack);
    debug("=========================================".red);
  }
}

/* ===============[ 1. Create Functions ]=============*/
/**
 * 1.1 copyFile (CREATE)
 * @todo consider using copyAsync
 * **BUG** Won't move into destination folder
 * 
 * @param {*} gDrivePath - source gDrivePath
 * @param {*} gDriveDstPath - destination gDrivePath 
 */
const copyFile = async (gDrivePath, gDriveDstPath) => {
  console.log({ gDrivePath, gDriveDstPath });
  await checkAccess();
  let request = {};
  let copyRequest = {};

  // Set copyRequest.parents
  if (!gDriveDstPath) {
    debug(`Saving to ROOT_FOLDER ${googleDriveInstance.options.ROOT_FOLDER}`.cyan);
    copyRequest.parents = googleDriveInstance.options.ROOT_FOLDER;

  } else {
    const allFolders = await googleDriveInstance.listFolders(YOUR_ROOT_FOLDER, null, true);
    const foundFolder = allFolders.folders.find(({ name }) => name === gDriveDstPath.split(/[\\\/]/).slice(-1).join('/'));

    if (foundFolder && Object.keys(foundFolder).length) {
      debug(`Saving to ${foundFolder.name} ${foundFolder.id}`.cyan);
      copyRequest.parents = foundFolder.id;
    } else {
      debug(`Folder '${gDriveDstPath.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
    }
  }

  // Set request and copyRequest.name
  if (typeof gDrivePath === "object" && gDrivePath.id && gDrivePath.name && gDrivePath.mimeType) {
    copyRequest.name = gDrivePath.name;
    request.fileId = gDrivePath.id;
    request.requestBody = copyRequest;

  } else {
    const allFiles = await googleDriveInstance.listFiles(YOUR_ROOT_FOLDER, null, true);
    const foundFile = allFiles.files.find(({ name }) => name === gDrivePath.split(/[\\\/]/).slice(-1).join('/'));

    if (foundFile && Object.keys(foundFile).length) {
      copyRequest.name = foundFile.name;
      request.fileId = foundFile.id;
      request.requestBody = copyRequest;
    } else {
      debug(`File '${gDrivePath.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
    }
  }

  // debug("==================================================".rainbow);
  // debug({ copyRequest, request });
  // debug("==================================================".rainbow);

  return new Promise((resolve, reject) => {
    googleDriveInstance.service.files
      .copy(request, function (err, data) {
        if (err) {
          debug(err, err.message, err.stack);
          reject(new Error(err.stack));
          return;
        }

        resolve(data);
      })
  });
}

/**
 * 1.2 pushFile (CREATE)
 * @param {String} localPath 
 * @param {String} gDrivePrefix - directory
 * @return {String} Location 
 */
const pushFile = async (localPath, gDrivePrefix) => {
  await checkAccess();

  if (!gDrivePrefix) {
    return await googleDriveInstance.writeFile(localPath);
  }

  const allFolders = await googleDriveInstance.listFolders(YOUR_ROOT_FOLDER, null, true);
  const foundFolder = allFolders.folders.find(({ name }) => name === gDrivePrefix.split(/[\\\/]/).slice(-1).join('/'));
  if (foundFolder && Object.keys(foundFolder).length) {
    return await googleDriveInstance.writeFile(localPath, foundFolder.id);
  } else {
    debug(`Folder '${gDrivePrefix.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
  }
}

/* ===============[ 2. Read Functions ]===============*/
/**
 * 2.1 pullFile (READ)
 * @param {String} gDrivePath - full file path on Google Drive
 * @param {String} localPath - full file path locally
 */
const pullFile = async (gDrivePath, localPath) => {
  await checkAccess();

  if (typeof gDrivePath === "object" && gDrivePath.id && gDrivePath.name && gDrivePath.mimeType) {
    return path.resolve(await googleDriveInstance.getFile(gDrivePath, localPath));
  }

  const allFiles = await googleDriveInstance.listFiles(YOUR_ROOT_FOLDER, null, true);
  const foundFile = allFiles.files.find(({ name }) => name === gDrivePath.split(/[\\\/]/).slice(-1).join('/'));

  if (foundFile && Object.keys(foundFile).length) {
    return path.resolve(await googleDriveInstance.getFile(foundFile, localPath));

  } else {
    debug(`File '${gDrivePath.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
  }
}

/**
 * 2.2 streamFile (READ)
 * @todo what is the difference between getFile and exportFile 
 * 
 * @param {String} gDrivePath - full file path
 * @param {String} localPath - The destination folder to download (use absolute path to avoid surprises)
 */
const streamFile = async (gDrivePath, localPath) => {
  await checkAccess();
  if (typeof gDrivePath === "object" && gDrivePath.id && gDrivePath.name && gDrivePath.mimeType) {
    return await googleDriveInstance.exportFile(gDrivePath, localPath);
  }

  const allFiles = await googleDriveInstance.listFiles(YOUR_ROOT_FOLDER, null, true);
  const foundFile = allFiles.files.find(({ name }) => name === gDrivePath.split(/[\\\/]/).slice(-1).join('/'));

  if (foundFile && Object.keys(foundFile).length) {
    return await googleDriveInstance.exportFile(gDrivePath, localPath);

  } else {
    debug(`File '${gDrivePath.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
  }
}

/**
 * 2.3 fileExists (READ)
 * @todo 
 * 
 * @param {String} gDrivePath - full file path
 * @return {Boolean}
 */
const fileExists = async (gDrivePath) => {
  await checkAccess();
  debug("fileExists not done yet".yellow);
  return;
}

/**
 * 2.4 listFiles (READ)
 * NOTE: Will also list folders
 * @param {String} gDrivePrefix - directory
 * @param {String} withString 
 */
const listFiles = async (gDrivePrefix, withString) => {
  await checkAccess();

  if (!gDrivePrefix) {
    return googleDriveInstance.listFiles(YOUR_ROOT_FOLDER, null, true);
  }

  const allFolders = await googleDriveInstance.listFolders(YOUR_ROOT_FOLDER, null, true);
  const foundFolder = allFolders.folders.find(({ name }) => name === gDrivePrefix.split(/[\\\/]/).slice(-1).join('/'));

  if (foundFolder && Object.keys(foundFolder).length) {
    return googleDriveInstance.listFiles(foundFolder.id, null, false);
  } else {
    debug(`Folder '${gDrivePrefix.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
  }
}

/**
 * 2.5 listFolders (READ)
 * NOTE: Will only list folders
 * @param {String} gDrivePrefix - directory
 * @param {String} withString 
 */
const listFolders = async (gDrivePrefix, withString) => {
  await checkAccess();

  const allFolders = await googleDriveInstance.listFolders(YOUR_ROOT_FOLDER, null, true);
  if (!gDrivePrefix) {
    return allFolders;
  }

  const foundFolder = allFolders.folders.find(({ name }) => name === gDrivePrefix.split(/[\\\/]/).slice(-1).join('/'));
  if (foundFolder && Object.keys(foundFolder).length) {
    return googleDriveInstance.listFolders(foundFolder.id, null, false);
  } else {
    debug(`Folder '${gDrivePrefix.split(/[\\\/]/).slice(-1).join('/')}' not found!`.yellow);
  }
}

/* ===============[ 3. Update Functions ]=============*/
/**
 * 3.1 renameFile (UPDATE)
 * @todo 
 * 
 * @param {String} gDrivePrefix - either directory (gDrivePrefix) or file (gDrivePath)
 * @param {String} fromString - string in filename being replaced (i.e. ~)
 * @param {String} _toString - string in filename to replace with (i.e. _)
 * @param {Boolean} dryRun - FALSE: copy/delete commands will be executed. TRUE: only debug and copy/delete will not be executed. 
 */
const renameFile = async (gDrivePrefix, fromString, _toString, dryRun = false) => {
  await checkAccess();
  debug("renameFile not done yet".yellow);
  return;
}

/**
 * 3.2 moveFile (UPDATE)
 * @todo 
 * 
 * @param {String} gDrivePrefix - either source directory (gDrivePrefix) or file (gDrivePath)
 * @param {String} gDriveDstPath - either destination directory (gDrivePrefix) or file (gDrivePath)
 * @param {Boolean} dryRun - FALSE: copy/delete commands will be executed. TRUE: only debug and copy/delete will not be executed. 
 */
const moveFile = async (gDrivePrefix, gDriveDstPath, dryRun = false) => {
  await checkAccess();
  debug("moveFile not done yet".yellow);
  return;
}

/* ===============[ 4. Delete Functions ]=============*/
/**
 * 4.1 deleteFile (DELETE)
 * @todo handle Array, Strings 
 * 
 * @param {Array|String} gDrivePath 
 * @param {Boolean} Quiet
 */
const deleteFile = async (gDrivePath, Quiet = false) => {
  await checkAccess();
  return await googleDriveInstance.removeFile(gDrivePath);
}

module.exports = {
  copyFile,
  pushFile,
  pullFile,
  streamFile,
  fileExists,
  listFiles,
  listFolders,
  renameFile,
  moveFile,
  deleteFile
}