// Environment variables for local configuration
require('dotenv').config(); // remove it when deploying to production environment

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Add your environment variables in Google Cloud Functions or .env file
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'aws-key' // Only add here directly for testing purposes
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'aws-secret'
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'bucket-name'


const s3 = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  },
  region: 'eu-central-1'
});

exports.uploadImageToS3 = (req, res) => {
  (async () => {
    try {

      if (req.method !== 'POST') {
        // Return a "method not allowed" error
        return res.status(405).end();
      }
      const busboy = Busboy({headers: req.headers});
      const tmpdir = os.tmpdir();
    
      // This object will accumulate all the fields, keyed by their name
      const fields = {};
    
      // This object will accumulate all the uploaded files, keyed by their name.
      const uploads = {};
    
      // This code will process each non-file field in the form.
      busboy.on('field', (fieldname, val) => {
        /**
         *  TODO(developer): Process submitted field values here
         */
        console.log(`Processed field ${fieldname}: ${val}.`);
        fields[fieldname] = val;
      });
    
      const fileWrites = [];
    
      // This code will process each file uploaded.
      busboy.on('file', (fieldname, file, {filename}) => {
        // Note: os.tmpdir() points to an in-memory file system on GCF
        // Thus, any files in it must fit in the instance's memory.
        console.log(`Processed file ${filename}`);
        const filepath = path.join(tmpdir, filename);
        uploads[fieldname] = filepath;
    
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);
    
        // File was processed by Busboy; wait for it to be written.
        const promise = new Promise((resolve, reject) => {
          file.on('end', () => {
            writeStream.end();
          });
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        fileWrites.push(promise);
      });
    
      // Triggered once all uploaded files are processed by Busboy.
      // We still need to wait for the disk writes (saves) to complete.
      busboy.on('finish', async () => {
        await Promise.all(fileWrites);

        if (!uploads?.file)
          return res.status(400).send(JSON.stringify({'success': false, 'message': "Please provide 'file' in form-data"}))

        const filename = await s3UploadObject(uploads.file)

        await getPresignedUrl(filename)
  
        for (const file in uploads) {
          fs.unlinkSync(uploads[file]);
        }

        return res.status(200).send(JSON.stringify({status: true}))
      });
      busboy.end(req.rawBody);
    }
    catch (err) {
      return res.status(400).send(JSON.stringify({'success': false, 'message': err.message}))
    }
  })()
};

const s3UploadObject = (filePath) => {
  return new Promise((resolve, reject) => {
    console.log("filePath --> ", filePath)
    
    const filename = path.basename(filePath);

    const uploadParams = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: filename,
      Body: fs.createReadStream(filePath),
      ACL: 'private'
    };

    s3.send(new PutObjectCommand(uploadParams))
      .then(() => resolve(filename))
      .catch((err) => reject(err));
  });
};


exports.getUrl = (req, res) => {
  (async () => {
    try {

      res.set('Access-Control-Allow-Origin', "*")
      res.set('Access-Control-Allow-Methods', 'GET, POST')

      if (req.method === "OPTIONS") {
        // stop preflight requests here
        res.set('Access-Control-Allow-Headers', '*')
        res.status(204).send('');
        return
      }

      const data = req?.body?.data
      if (!data)
        return res.sendStatus(400)

      const filename = data?.filename
      const url = await getPresignedUrl(filename)

      return res.status(200).send(JSON.stringify({'success': true, url}))
    }
    catch (err) {
      return res.status(400).send(JSON.stringify({'success': false, 'message': err.message}))
    }
  })()
};

const getPresignedUrl = async (filename) => {
  try {

    // Prepare the GetObjectCommand
    const getObjectParams = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: filename,
    };

    const command = new GetObjectCommand(getObjectParams);

    // Generate the presigned URL
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour

    console.log("url ----> ", url)

    return url;
  } catch (err) {
    throw new Error(`Failed to generate presigned URL: ${err.message}`);
  }
};