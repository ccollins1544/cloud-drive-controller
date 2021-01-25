
/**
 * ===============[ TABLE OF CONTENTS ]=================
 * 0. Initialize
 *   0.1 Libraries 
 *   0.2 Globals
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
 *   2.5 getTags 
 * 
 * 3. Update Functions 
 *   3.1 addTags 
 *   3.2 renameFile 
 *   3.3 moveFile
 * 
 * 4. Delete Functions 
 *   4.1 deleteFile
 * 
 ******************************************************/
/* ===============[ 0. Initialize ]===================*/
// 0.1 Libraries 
process.env.DOTENV_LOADED || require("dotenv").config();
require('colors');
const aws = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const Utils = require("../utils");

// 0.2 Globals 
const region = 'us-west-2';
const Bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ID;
const secretAccessKey = process.env.S3_SECRET;
const options = {
  region,
  accessKeyId,
  secretAccessKey
}

aws.config.setPromisesDependency();
const s3 = new aws.S3(options);

/* ===============[ 1. Create Functions ]=============*/
/**
 * 1.1 copyFile (CREATE)
 * @param {*} s3Path - source s3Path
 * @param {*} s3DstPath - destination s3Path 
 */
const copyFile = async (s3Path, s3DstPath) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket,
      CopySource: `${Bucket}/${s3Path}`,
      Key: s3DstPath
    };

    s3.copyObject(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
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
 * @param {String} s3Path 
 * @return {String} Location 
 */
const pushFile = async (localPath, s3Path) => {
  console.log('Reading Source File');
  const Body = fs.createReadStream(localPath);
  const resp = await s3.upload({ Bucket, Key: s3Path, Body }).promise();
  return resp.Location;
}

/* ===============[ 2. Read Functions ]===============*/
/**
 * 2.1 pullFile (READ)
 * @param {String} s3Path - full file path on s3
 * @param {String} localPath - full file path locally
 */
const pullFile = (s3Path, localPath) => {
  return new Promise((resolve, reject) => {
    var localFile = fs.createWriteStream(localPath);
    localFile.on('close', () => {
      resolve();
    });
    s3.getObject({ Bucket, Key: s3Path }).createReadStream().pipe(localFile);
  });
}

/**
 * 2.2 streamFile (READ)
 * @param {String} s3Path - full file path
 * @param {String} writeStream 
 */
const streamFile = (s3Path, writeStream) => {
  return new Promise((resolve, reject) => {
    writeStream.on('close', () => {
      resolve();
    })
    s3.getObject({ Bucket, Key: s3Path }).createReadStream().pipe(writeStream);
  });
}

/**
 * 2.3 fileExists (READ)
 * @param {String} s3Path - full file path
 * @return {Boolean}
 */
const fileExists = async (s3Path) => {
  try {
    const headCode = await s3.headObject({ Bucket, Key: s3Path }).promise();
    return true;
  }
  catch (headErr) {
    return false
  }
}

/**
 * 2.4 listFiles (READ)
 * @param {String} s3Prefix - directory
 * @param {String} withString 
 * @return {Array} data
 */
const listFiles = async (s3Prefix, withString) => {
  return new Promise((resolve, reject) => {
    s3.listObjectsV2({ Bucket, Prefix: s3Prefix }, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject(new Error(err.stack));
        return;
      }

      if (withString && data.Contents && data.Contents.length > 0) {
        const _regex = new RegExp(withString, "g");
        data.Contents = data.Contents.filter((fileObj) => _regex.test(fileObj.Key));
        data.KeyCount = data.Contents.length;
      }

      resolve(data);
    })
  });
}

/**
 * 2.5 getTags (READ)
 * @param {*} s3Path - full file path 
 */
const getTags = async (s3Path) => {
  return new Promise((resolve, reject) => {
    s3.getObjectTagging({ Bucket, Key: s3Path }, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject(new Error(err.stack));
        return;
      }

      resolve(data);
    });
  });
}

/* ===============[ 3. Update Functions ]=============*/
/**
 * 3.1 addTags (UPDATE)
 * Adds tags to an existing object
 * 
 * @param {String} s3Path = full file path 
 * @param {Array} tagSet = [
 * {
 *   Key: "Key3", 
 *   Value: "Value3"
 * }, 
 * {
 *   Key: "Key4", 
 *   Value: "Value4"
 * }]
 * @return {Array} data 
 */
const addTags = async (s3Path, TagSet) => {
  return new Promise((resolve, reject) => {
    const Tagging = { TagSet };
    s3.putObjectTagging({ Bucket, Key: s3Path, Tagging }, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject(new Error(err.stack));
        return;
      }

      resolve(data);
    })
  });
}

/**
 * 3.2 renameFile (UPDATE)
 * @param {String} s3Prefix - either directory (s3Prefix) or file (s3Path)
 * @param {String} fromString - string in filename being replaced (i.e. ~)
 * @param {String} _toString - string in filename to replace with (i.e. _)
 * @param {Boolean} dryRun - FALSE: copy/delete commands will be executed. TRUE: only console.log and copy/delete will not be executed. 
 */
const renameFile = async (s3Prefix, fromString, _toString, dryRun = false) => {
  // Handle 1 file at s3Prefix
  if (Boolean(path.extname(s3Prefix))) {
    let s3DstPath = s3Prefix.replace(fromString, _toString);
    console.log(`${s3File}`.cyan + " ==> ".yellow + `${s3DstPath}`.green);

    if (!dryRun) {
      await copyFile(s3Prefix, s3DstPath);
      return await deleteFile(s3Prefix);
    }
  }

  // Handle Multiple Files under s3Prefix
  let listFilesObj = await listFiles(s3Prefix, fromString);
  let listFilesArr = listFilesObj.Contents.reduce((acc, fileObj) => {
    if (fileObj.Key) {
      acc.push(fileObj.Key);
    }
    return acc;
  }, []);

  // COPY ALL FILES
  console.log("Copying Files".yellow);
  await Utils.asyncForEach(listFilesArr, async (s3File) => {
    let s3DstPath = s3File.replace(fromString, _toString);

    console.log(`${s3File}`.cyan + " ==> ".yellow + `${s3DstPath}`.green);
    if (!dryRun) {
      await copyFile(s3File, s3DstPath);
    }
  });

  // DELETE ALL FILES
  console.log("Deleting Files".yellow, listFilesArr);
  if (!dryRun) {
    return await deleteFile(listFilesArr);
  }
}

/**
 * 3.3 moveFile (UPDATE)
 * @param {String} s3Prefix - either source directory (s3Prefix) or file (s3Path)
 * @param {String} s3DstPath - either destination directory (s3Prefix) or file (s3Path)
 * @param {Boolean} dryRun - FALSE: copy/delete commands will be executed. TRUE: only console.log and copy/delete will not be executed. 
 */
const moveFile = async (s3Prefix, s3DstPath, dryRun = false) => {
  // Handle 1 file at s3Prefix to s3DstPath
  if (Boolean(path.extname(s3Prefix))) {
    console.log(`${s3File}`.cyan + " ==> ".yellow + `${s3DstPath}`.green);

    if (!dryRun) {
      await copyFile(s3Prefix, s3DstPath);
      return await deleteFile(s3Prefix);
    }
  }

  // Handle Multiple Files under s3Prefix to s3DstPath
  let listFilesObj = await listFiles(s3Prefix);
  let listFilesArr = listFilesObj.Contents.reduce((acc, fileObj) => {
    if (fileObj.Key) {
      acc.push(fileObj.Key);
    }
    return acc;
  }, []);

  // COPY ALL FILES
  console.log("Copying Files".yellow);
  await Utils.asyncForEach(listFilesArr, async (s3File) => {
    let newFile = '/' + s3File.split(/[\\\/]/).slice(-3).pop();

    console.log(`${s3File}`.cyan + " ==> ".yellow + `${s3DstPath}${newFile}`.green);
    if (!dryRun) {
      await copyFile(s3File, `${s3DstPath}${newFile}`);
    }
  });

  // DELETE ALL FILES
  console.log("Deleting Files".yellow, listFilesArr);
  if (!dryRun) {
    return await deleteFile(listFilesArr);
  }
}

/* ===============[ 4. Delete Functions ]=============*/
/**
 * 4.1 deleteFile (DELETE)
 * @param {Array|String} s3Path 
 * @param {Boolean} Quiet
 */
const deleteFile = async (s3Path, Quiet = false) => {
  return new Promise((resolve, reject) => {
    let params = { Bucket };

    if (Array.isArray(s3Path)) {
      let Objects = s3Path.reduce((acc, s3file) => { acc.push({ 'Key': s3file }); return acc }, []);
      params.Delete = { Objects, Quiet };
    } else {
      params.Key = s3Path;
    }

    // Handle Multiple Files under s3Path
    if (Array.isArray(s3Path)) {
      s3.deleteObjects(params, function (err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
          reject(new Error(err.stack));
          return;
        }

        resolve(data);
      });

    } else {
      // Handle 1 File at s3Path
      s3.deleteObject(params, function (err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
          reject(new Error(err.stack));
          return;
        }

        resolve(data);
      })
    }
  });
}

module.exports = {
  copyFile,
  pushFile,
  pullFile,
  streamFile,
  fileExists,
  listFiles,
  addTags,
  getTags,
  renameFile,
  moveFile,
  deleteFile
}
