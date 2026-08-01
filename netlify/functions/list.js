const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const query = folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false';

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink, webContentLink, size, createdTime, mimeType)',
      orderBy: 'createdTime desc',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        files: res.data.files || [],
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
