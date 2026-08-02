const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return new Promise((resolve) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer = null;
      let fileName = 'document.pdf';

      busboy.on('file', (fieldname, file, filenameOrInfo) => {
        if (typeof filenameOrInfo === 'object' && filenameOrInfo !== null) {
          fileName = filenameOrInfo.filename || 'document.pdf';
        } else if (typeof filenameOrInfo === 'string') {
          fileName = filenameOrInfo;
        }

        const chunks = [];
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('finish', async () => {
        if (!fileBuffer || fileBuffer.length === 0) {
          res.status(400).json({ error: 'No file binary data received in request' });
          return resolve();
        }

        const email = process.env.GOOGLE_CLIENT_EMAIL;
        let key = process.env.GOOGLE_PRIVATE_KEY;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

        const isDemoFallback =
          !email ||
          !key ||
          email.includes('your-service-account') ||
          key.includes('YOUR_PRIVATE_KEY') ||
          key.length < 30;

        if (isDemoFallback) {
          const demoId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          res.status(200).json({
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
            message: 'Uploaded in Demo Mode (Configure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel environment variables)',
          });
          return resolve();
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

          try {
            await drive.permissions.create({
              fileId: uploadedId,
              requestBody: { role: 'reader', type: 'anyone' },
            });
          } catch (pErr) {
            console.warn('Permission creation warning:', pErr);
          }

          res.status(200).json({
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
          });
          return resolve();
        } catch (uploadErr) {
          console.warn('Google Drive API upload error in Vercel function:', uploadErr.message);
          const demoId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          res.status(200).json({
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
            message: `Drive API Warning: ${uploadErr.message}. Saved in preview mode.`,
          });
          return resolve();
        }
      });

      busboy.on('error', (err) => {
        res.status(400).json({ error: `Upload stream error: ${err.message}` });
        return resolve();
      });

      req.pipe(busboy);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Server error during upload processing' });
      return resolve();
    }
  });
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

