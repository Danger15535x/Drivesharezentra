const { google } = require('googleapis');

module.exports = async (req, res) => {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

  if (!email || !key || email.includes('your-service-account') || key.length < 30) {
    return res.status(200).json({
      success: true,
      files: [],
      isDemoMode: true,
      message: 'Configure Google Drive Credentials in environment variables to view Drive files',
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

    const query = folderId && folderId !== 'root'
      ? `'${folderId}' in parents and trashed = false`
      : 'trashed = false';

    const gRes = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink, webContentLink, size, createdTime, mimeType)',
      orderBy: 'createdTime desc',
    });

    const files = (gRes.data.files || []).map((file) => ({
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

    return res.status(200).json({
      success: true,
      files,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch files from Google Drive: ${err.message}` });
  }
};
