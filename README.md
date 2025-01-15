# Google Cloud Function: Upload Image to Amazon S3 Bucket

This is a [Google Cloud Function] for uploading an image to an Amazon S3 bucket.

## Running the Project Locally

As we know, making changes directly in Google Cloud Functions can be time-consuming since deploying the function takes time. The best approach is to run and test the function locally before deployment.

### Getting Started

1. **Install Dependencies**:
   ```bash
   npm i
   # or
   yarn add
   ```

2. **Create a `.env` File**:
   Add all required environment variables in the `.env` file.
   ```
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET_NAME=your-bucket-name
   ```

3. **Run the Development Server**:
   ```bash
   npm start
   # or
   yarn start
   ```

4. **Test the API**:
   - Use Postman for testing.
   - Make a POST request to the API endpoint (e.g., `http://localhost:8080/`).
   - Set up the request as follows:
     - Method: `POST`
     - Body: `form-data`
     - Key: `file`
     - Type: `file`
     - Value: Select an image to upload.

## Deploying the Project

1. **Copy Code to Google Cloud**:
   - Copy the entire code from `index.js` and paste it into your Google Cloud Function.

2. **Set Dependencies**:
   - Copy the package names from `package.json` and paste them into Google Cloud's dependencies section.

3. **Add Environment Variables**:
   Set the following environment variables in Google Cloud:
   ```
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET_NAME=your-bucket-name
   ```

4. **Run and Test**:
   - Deploy the function.
   - Use Postman to test the deployed URL.
   - Use the same setup as described above for local testing.

---