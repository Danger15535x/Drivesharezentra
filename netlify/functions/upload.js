const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  return new Promise((resolve) => {
    try {
      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
        });
      }

      const busboy = Busboy({ headers: { 'content-type': contentType } });
      let fileBuffer = null;
      let fileName = 'document.pdf';

      busboy.on('file', (fieldname, file, info) => {
        const { filename } = info;
        fileName = filename || 'document.pdf';

        const chunks = [];
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('finish', async () => {
        if (!fileBuffer) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'No file binary data received' }),
          });
        }

        const email = process.env.GOOGLE_CLIENT_EMAIL;
        let key = process.env.GOOGLE_PRIVATE_KEY;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

        if (!email || !key || email.includes('your-service-account') || key.length < 30) {
          // Demo fallback response if credentials are not yet configured in Netlify environment variables
          const demoId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          return resolve({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              id: demoId,
              filename: fileName,
              publicUrl: `https://drive.google.com/file/d/demo_${demoId}/view`,
              downloadUrl: `https://drive.google.com/uc?id=demo_${demoId}&export=download`,
              size: fileBuffer.length,
              uploadedAt: new Date().toISOString(),
              mimeType: 'application/pdf',
              folderId: folderId,
              isDemoMode: true,
              message: 'Uploaded in Demo Mode (Configure Google Drive Credentials in Netlify Environment Variables for real Drive storage)',
            }),
          });
        }

        try {
          key = key.replace(/\\n/g, '\n');
          const auth = new google.auth.JWT({
            email,
            key,
            scopes: ['https://www.googleapis.com/auth/drive'],
          });

          const drive = google.drive({ version: 'v3', auth });

          const fileMetadata = {
            name: fileName,
            parents: folderId && folderId !== 'root' ? [folderId] : [],
          };

          const media = {
            mimeType: 'application/pdf',
            body: Readable.from(fileBuffer),
          };

          const gFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink, size, createdTime, mimeType',
          });

          const uploadedId = gFile.data.id;

          // Make publicly readable
          try {
            await drive.permissions.create({
              fileId: uploadedId,
              requestBody: { role: 'reader', type: 'anyone' },
            });
          } catch (pErr) {
            console.warn('Permission creation warning:', pErr);
          }

          return resolve({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              id: uploadedId,
              filename: gFile.data.name || fileName,
              publicUrl: gFile.data.webViewLink || `https://drive.google.com/file/d/${uploadedId}/view`,
              downloadUrl: gFile.data.webContentLink || `https://drive.google.com/uc?id=${uploadedId}&export=download`,
              size: parseInt(gFile.data.size || fileBuffer.length, 10),
              uploadedAt: gFile.data.createdTime || new Date().toISOString(),
              mimeType: 'application/pdf',
              folderId: folderId,
              isDemoMode: false,
            }),
          });
        } catch (uploadErr) {
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: `Google Drive upload error: ${uploadErr.message}` }),
          });
        }
      });

      busboy.on('error', (err) => {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ error: `Upload stream error: ${err.message}` }),
        });
      });

      const buffer = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body || '', 'utf8');

      busboy.end(buffer);
    } catch (err) {
      return resolve({
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      });
    }
  });
};
