process.env.DOTENV_LOADED || require("dotenv").config();
require("colors");
const debug = require("debug")("tests:googleDrive");
const path = require("path");
const Utils = require("../utils");
const gDrive = require("../controllers/googleDrive");

// Configure the following variables
// ==================[ File ]====================================
const fileName = "testFile.txt";
const rootPath = `C:\\Users\\ccollins\\Downloads`;

// ==================[ GLOBALS ]====================================
const localPath = path.join(rootPath, fileName);

// Source and Destination Paths 
const gDrivePath = localPath.split(/[\\\/]/).slice(-1).join('/');
const gDriveDstPath = localPath.split(/[\\\/]/).slice(-1).join('/');

// Source and Destination Prefixes
const gDrivePrefix = gDrivePath.split(/[\\\/]/).slice(0, -1).join('/');
const gDriveDstPrefix = gDriveDstPath.split(/[\\\/]/).slice(0, -1).join('/');

// TEST TO RUN
const TESTS = [
  {
    "name": "File Exists On Google Drive",
    "enabled": false,
    "function": "fileExists",
    "args": { gDrivePath },
  },

  // COPY To/From Google Drive
  {
    "name": "Copy File From Google Drive",
    "enabled": false,
    "function": "pullFile",
    "args": { gDrivePath, 'localPath': rootPath },
  },
  {
    "name": "Copy File To Google Drive",
    "enabled": false,
    "function": "pushFile",
    "args": { gDrivePrefix, localPath },
  },

  // LIST FILES/FOLDERS
  {
    "name": `List Files in ${gDrivePrefix}`,
    "enabled": false,
    "function": "listFiles",
    "args": { gDrivePrefix },
  },
  {
    "name": `List Folders in ${gDrivePrefix}`,
    "enabled": false,
    "function": "listFolders",
    "args": { gDrivePrefix },
  },

  // COPY/DELETE/RENAME/MOVE on Google Drive
  {
    "name": "Copy File On Google Drive",
    "enabled": false,
    "function": "copyFile",
    "args": { gDrivePath, gDriveDstPath },
  },
  {
    "name": "Delete File On Google Drive",
    "enabled": false,
    "function": "deleteFile",
    "args": { gDrivePath },
  },
  {
    "name": `Renaming File ${gDrivePath}`,
    "enabled": false,
    "function": "renameFile",
    "args": { 'gDrivePrefix': gDrivePath, 'fromString': '~', '_toString': '_' },
  },
  {
    "name": `Renaming Files in ${gDrivePrefix}`,
    "enabled": false,
    "function": "renameFile",
    "args": { gDrivePrefix, 'fromString': '~', '_toString': '_' },
  },
  {
    "name": `Move Files in ${gDrivePrefix}`,
    "enabled": false,
    "function": "moveFile",
    "args": { gDrivePrefix, 'gDriveDstPath': gDriveDstPrefix, 'dryRun': true },
  }
];

/**
 * Example Usage: 
 * node --trace-warnings tests/googleDrive.js
 * node tests/googleDrive.js --inputFunction="listFiles" --gDrivePrefix="docs/"
 */
const main = async (inputFunction, inputParams) => {
  // Initiate Arguments
  let args;

  if (process.argv.length > 2) {
    args = require('yargs').argv;
    args.inputParams = {};
    let { gDrivePath, localPath, gDrivePrefix, withString, gDriveDstPath, Quiet, fromString, _toString, dryRun, inputFunction, ...remainingArgs } = require('yargs').argv;
    if (inputFunction) args = { inputFunction };
    if (gDrivePath) args.inputParams = { ...args.inputParams, gDrivePath };
    if (localPath) args.inputParams = { ...args.inputParams, localPath };
    if (gDrivePrefix) args.inputParams = { ...args.inputParams, gDrivePrefix };
    if (gDriveDstPath) args.inputParams = { ...args.inputParams, gDriveDstPath };
    if (withString) args.inputParams = { ...args.inputParams, withString };
    if (Quiet) args.inputParams = { ...args.inputParams, Quiet };
    if (fromString) args.inputParams = { ...args.inputParams, fromString };
    if (_toString) args.inputParams = { ...args.inputParams, _toString };
    if (dryRun) args.inputParams = { ...args.inputParams, dryRun };

  } else if (inputParams) {
    args = { inputFunction, inputParams };

  } else {
    debug("===================================".yellow);
    debug("Invalid arguments passed.".yellow);
    debug({ ...inputParams, ...{ invalid_args: process.argv.slice(2) } });
    debug("\nExample Usage,");
    debug('node tests/googleDrive.js --inputFunction="listFiles" --gDrivePrefix="docs/"'.cyan);
    debug("\nList of functions include: ");
    debug(TESTS.reduce((acc, t, i) => {
      if (t.function && !acc.includes(t.function)) {
        acc.push({
          'inputFunction': t.function,
          'inputParams': Object.keys(t.args)
        });
      }
      return acc;
    }, []))
    debug("===================================".yellow);
    return 1;
  }

  debug("*-*-*-*-*-*-*-[ args ]*-*-*-*-*-*-*-*-*-*".yellow);
  debug(args);
  debug("*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*".yellow);

  // Generate results;
  let results;
  try {
    if (gDrive[args.inputFunction]) {
      let { gDrivePath, localPath, gDrivePrefix, TagSet, withString, gDriveDstPath, Quiet, fromString, _toString, dryRun } = args.inputParams || {};

      if (args.inputFunction === "fileExists") {
        results = await gDrive[args.inputFunction](gDrivePath);

      } else if (['pullFile', 'streamFile'].includes(args.inputFunction)) {
        results = await gDrive[args.inputFunction](gDrivePath, localPath);

      } else if (args.inputFunction === "pushFile") {
        results = await gDrive[args.inputFunction](localPath, gDrivePrefix);

      } else if (['listFiles', 'listFolders'].includes(args.inputFunction)) {
        if (withString) {
          results = await gDrive[args.inputFunction](gDrivePrefix, withString);
        } else {
          results = await gDrive[args.inputFunction](gDrivePrefix);
        }

      } else if (args.inputFunction === "copyFile") {
        results = await gDrive[args.inputFunction](gDrivePath, gDriveDstPath);

      } else if (args.inputFunction === "deleteFile") {
        if (Quiet) {
          results = await gDrive[args.inputFunction](gDrivePath, Quiet);
        } else {
          results = await gDrive[args.inputFunction](gDrivePath);
        }

      } else if (args.inputFunction === "renameFile") {
        if (dryRun) {
          results = await gDrive[args.inputFunction](gDrivePrefix, fromString, _toString, dryRun);
        } else {
          results = await gDrive[args.inputFunction](gDrivePrefix, fromString, _toString);
        }

      } else if (args.inputFunction === "moveFile") {
        if (dryRun) {
          results = await gDrive[args.inputFunction](gDrivePrefix, gDriveDstPath, dryRun);
        } else {
          results = await gDrive[args.inputFunction](gDrivePrefix, gDriveDstPath);
        }

      } else {
        results = await gDrive[args.inputFunction](args.inputParams);
      }

    } else {
      throw Error(`Invalid function: ${args.inputFunction}`.brightRed);
    }

  } catch (error) {
    debug("=========================================".red);
    debug(error);
    debug("=========================================".red);
    return 1;
  }

  debug("____________ results ____________________".brightGreen);
  debug(results)
  debug("_________________________________________".brightGreen);
  return 0;
}

// RUN TESTS
(async () => {
  let exit_code = 1;
  let counter = 0;

  await Utils.asyncForEach(TESTS, async (test) => {
    if (test.enabled) {
      debug(test.name.toString().brightYellow);
      exit_code = await main(test.function, test.args);
      counter++;
    }
  });

  if (counter === 0) {
    exit_code = await main();
  }

  process.exit(exit_code);
})();

/*
// Let's wrap everything in an async function to use await sugar
async function ExampleOperations() {
  const creds_service_user = require(PATH_TO_CREDENTIALS);

  const googleDriveInstance = new NodeGoogleDrive({
    ROOT_FOLDER: YOUR_ROOT_FOLDER
  });

  let gdrive = await googleDriveInstance.useServiceAccountAuth(
    creds_service_user
  );

  // List Folders under the root folder
  let folderResponse = await googleDriveInstance.listFolders(
    YOUR_ROOT_FOLDER,
    null,
    false
  );

  debug({ folders: folderResponse.folders });

  // Create a folder under your root folder
  let newFolder = { name: 'folder_example' + Date.now() },
    createFolderResponse = await googleDriveInstance.createFolder(
      YOUR_ROOT_FOLDER,
      newFolder.name
    );

  newFolder.id = createFolderResponse.id;

  debug(`Created folder ${newFolder.name} with id ${newFolder.id}`.green);

  // List files under your root folder.
  let listFilesResponse = await googleDriveInstance.listFiles(
    YOUR_ROOT_FOLDER,
    null,
    false
  );

  for (let file of listFilesResponse.files) {
    debug({ file });
  }
}

ExampleOperations();

*/
