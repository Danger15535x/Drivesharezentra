const { google } = require('googleapis');

exports.handler = async (event) => {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

  if (!email || !key || email.includes('your-service-account') || key.length < 30) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        files: [],
        isDemoMode: true,
        message: 'Configure Google Drive Credentials in Netlify Environment Variables to view Drive files',
      }),
    };
  }

  try {
    key = key.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const query = folderId && folderId !== 'root'
      ? `'${folderId}' in parents and trashed = false`
      : 'trashed = false';

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink, webContentLink, size, createdTime, mimeType)',
      orderBy: 'createdTime desc',
    });

    const files = (res.data.files || []).map((file) => ({
      id: file.id,
      filename: file.name,
      publicUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      downloadUrl: file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`,
      size: parseInt(file.size || '0', 10),
      uploadedAt: file.createdTime || new Date().toISOString(),
      mimeType: file.mimeType || 'application/pdf',
      folderId: folderId,
      isDemoMode: false,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        files,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch files from Google Drive: ${err.message}` }),
    };
  }
};
