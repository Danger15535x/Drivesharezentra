exports.handler = async (event) => {
  const hasCreds = Boolean(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    !process.env.GOOGLE_CLIENT_EMAIL.includes('your-service-account')
  );

  const settings = {
    maxUploadSizeMb: 100,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '1a2b3c4d5e6f7g8h9i0j',
    autoPublic: true,
    autoGenerateQr: true,
    autoCopyLink: true,
    autoClearUpload: false,
    darkMode: false,
    googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    hasGoogleCredentials: hasCreds,
  };

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          settings: { ...settings, ...body },
          message: 'Settings updated'
        }),
      };
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(settings),
  };
};
