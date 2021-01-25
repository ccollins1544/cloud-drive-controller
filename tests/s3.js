process.env.DOTENV_LOADED || require("dotenv").config();
require("colors");
const debug = require("debug")("tests:s3");
const path = require("path");
const Utils = require("../utils");
const s3 = require("../controllers/s3")

// Configure the following variables
// ==================[ File ]====================================
const fileName = "MyFile.pdf";
const rootPath = `C:\\Users\\ccollins\\Downloads`;

// ==================[ GLOBALS ]====================================
const localPath = path.join(rootPath, fileName);

// Source and Destination Paths 
const s3Path = 'docs/' + localPath.split(/[\\\/]/).slice(-1).join('/');
const s3DstPath = 'docs/' + localPath.split(/[\\\/]/).slice(-1).join('/');

// Source and Destination Prefixes
const s3Prefix = s3Path.split(/[\\\/]/).slice(0, -1).join('/');
const s3DstPrefix = s3DstPath.split(/[\\\/]/).slice(0, -1).join('/');

const TagSet = [
  {
    Key: "status",
    Value: "available"
    // Value: "expired"
  }
]

// TEST TO RUN
const TESTS = [
  {
    "name": "File Exists On S3",
    "enabled": false,
    "function": "fileExists",
    "args": { s3Path },
  },

  // COPY To/From S3
  {
    "name": "Copy File From S3",
    "enabled": false,
    "function": "pullFile",
    "args": { s3Path, localPath },
  },
  {
    "name": "Copy File To S3",
    "enabled": false,
    "function": "pushFile",
    "args": { s3Path, localPath },
  },

  // LIST FILES
  {
    "name": `List Files in ${s3Prefix}`,
    "enabled": false,
    "function": "listFiles",
    "args": { s3Prefix },
  },

  // TAGGING
  {
    "name": 'Add Tags',
    "enabled": false,
    "function": "addTags",
    "args": { s3Path, TagSet },
  },
  {
    "name": "View File Tags",
    "enabled": false,
    "function": "getTags",
    "args": { s3Path },
  },

  // COPY/DELETE/RENAME/MOVE on S3
  {
    "name": "Copy File On S3",
    "enabled": false,
    "function": "copyFile",
    "args": { s3Path, s3DstPath },
  },
  {
    "name": "Delete File On S3",
    "enabled": false,
    "function": "deleteFile",
    "args": { s3Path },
  },
  {
    "name": `Renaming File ${s3Path}`,
    "enabled": false,
    "function": "renameFile",
    "args": { 's3Prefix': s3Path, 'fromString': '~', '_toString': '_' },
  },
  {
    "name": `Renaming Files in ${s3Prefix}`,
    "enabled": false,
    "function": "renameFile",
    "args": { s3Prefix, 'fromString': '~', '_toString': '_' },
  },
  {
    "name": `Move Files in ${s3Prefix}`,
    "enabled": false,
    "function": "moveFile",
    "args": { s3Prefix, 's3DstPath': s3DstPrefix, 'dryRun': true },
  },
];

/**
 * Example Usage: 
 * node --trace-warnings tests/s3.js
 * node tests/s3.js --inputFunction="listFiles" --s3Prefix="docs/"
 */
const main = async (inputFunction, inputParams) => {
  // Initiate Arguments
  let args;

  if (process.argv.length > 2) {
    args = require('yargs').argv;
    args.inputParams = {};
    let { s3Path, localPath, s3Prefix, TagSet, withString, s3DstPath, Quiet, fromString, _toString, dryRun, inputFunction, ...remainingArgs } = require('yargs').argv || {};
    if (inputFunction) args = { inputFunction };
    if (s3Path) args.inputParams = { ...args.inputParams, s3Path };
    if (localPath) args.inputParams = { ...args.inputParams, localPath };
    if (s3Prefix) args.inputParams = { ...args.inputParams, s3Prefix };
    if (TagSet) args.inputParams = { ...args.inputParams, TagSet };
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
    debug('node tests/s3.js --inputFunction="listFiles" --s3Prefix="docs/"'.cyan);
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
    if (s3[args.inputFunction]) {
      let { s3Path, localPath, s3Prefix, TagSet, withString, s3DstPath, Quiet, fromString, _toString, dryRun } = args.inputParams;

      if (args.inputFunction === "fileExists") {
        results = await s3[args.inputFunction](s3Path);

      } else if (args.inputFunction === "pullFile") {
        results = await s3[args.inputFunction](s3Path, localPath);

      } else if (args.inputFunction === "pushFile") {
        results = await s3[args.inputFunction](localPath, s3Path);

      } else if (args.inputFunction === "listFiles") {
        if (withString) {
          results = await s3[args.inputFunction](s3Prefix, withString);
        } else {
          results = await s3[args.inputFunction](s3Prefix);
        }

      } else if (args.inputFunction === "addTags") {
        results = await s3[args.inputFunction](s3Path, TagSet);

      } else if (args.inputFunction === "getTags") {
        results = await s3[args.inputFunction](s3Path);

      } else if (args.inputFunction === "copyFile") {
        results = await s3[args.inputFunction](s3Path, s3DstPath);

      } else if (args.inputFunction === "deleteFile") {
        if (Quiet) {
          results = await s3[args.inputFunction](s3Path, Quiet);
        } else {
          results = await s3[args.inputFunction](s3Path);
        }

      } else if (args.inputFunction === "renameFile") {
        if (dryRun) {
          results = await s3[args.inputFunction](s3Prefix, fromString, _toString, dryRun);
        } else {
          results = await s3[args.inputFunction](s3Prefix, fromString, _toString);
        }

      } else if (args.inputFunction === "moveFile") {
        if (dryRun) {
          results = await s3[args.inputFunction](s3Prefix, s3DstPath, dryRun);
        } else {
          results = await s3[args.inputFunction](s3Prefix, s3DstPath);
        }

      } else if (args.inputFunction === "streamFile") {
        throw Error(`Valid function but we're not set up to test it: ${args.inputFunction}`.brightRed);

      } else {
        results = await s3[args.inputFunction](args.inputParams);
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