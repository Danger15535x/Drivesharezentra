module.exports = async (req, res) => {
  const hasCreds = Boolean(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    !process.env.GOOGLE_CLIENT_EMAIL.includes('your-service-account')
  );

  const settings = {
    maxUploadSizeMb: 100,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'root',
    autoPublic: true,
    autoGenerateQr: true,
    autoCopyLink: true,
    autoClearUpload: false,
    darkMode: false,
    googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    hasGoogleCredentials: hasCreds,
  };

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      return res.status(200).json({
        success: true,
        settings: { ...settings, ...body },
        message: 'Settings updated',
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(200).json(settings);
};
