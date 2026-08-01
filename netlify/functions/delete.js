const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { fileId } = JSON.parse(event.body || '{}');
    if (!fileId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'fileId is required' }) };
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({ fileId: fileId });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'File deleted from Google Drive' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
