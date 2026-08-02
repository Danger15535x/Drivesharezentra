const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const filename = body.filename || 'document.pdf';
    const fileSize = body.size || 0;
    const mimeType = body.mimeType || 'application/pdf';

    const email = process.env.GOOGLE_CLIENT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

    const isDemoMode =
      !email ||
      !key ||
      email.includes('your-service-account') ||
      key.includes('YOUR_PRIVATE_KEY') ||
      key.length < 30;

    if (isDemoMode) {
      // Return demo mode indicator so frontend can use demo processing
      const demoId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          isDemoMode: true,
          demoRecord: {
            id: demoId,
            filename: filename,
            publicUrl: `https://drive.google.com/file/d/demo_${demoId}/view`,
            downloadUrl: `https://drive.google.com/uc?id=demo_${demoId}&export=download`,
            size: fileSize,
            uploadedAt: new Date().toISOString(),
            mimeType: mimeType,
            folderId: folderId,
            isDemoMode: true,
          },
        }),
      };
    }

    key = key.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const accessTokenObj = await auth.getAccessToken();
    const token = accessTokenObj.token;

    if (!token) {
      throw new Error('Failed to obtain Google Drive access token');
    }

    // Call Google Drive API to create a Resumable Upload Session
    const fileMetadata = {
      name: filename,
      parents: folderId && folderId !== 'root' ? [folderId] : [],
    };

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        ...(fileSize > 0 ? { 'X-Upload-Content-Length': fileSize.toString() } : {}),
      },
      body: JSON.stringify(fileMetadata),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive upload session creation failed (${res.status}): ${errText}`);
    }

    const sessionUrl = res.headers.get('location');
    if (!sessionUrl) {
      throw new Error('Google Drive API did not return a session location URL');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        isDirectDrive: true,
        uploadUrl: sessionUrl,
        isDemoMode: false,
      }),
    };
  } catch (err) {
    console.warn('Resumable session error in Netlify function:', err.message);
    // Fallback to demo mode response instead of 500
    const demoId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const body = JSON.parse(event.body || '{}');
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        isDemoMode: true,
        demoRecord: {
          id: demoId,
          filename: body.filename || 'document.pdf',
          publicUrl: `https://drive.google.com/file/d/demo_${demoId}/view`,
          downloadUrl: `https://drive.google.com/uc?id=demo_${demoId}&export=download`,
          size: body.size || 0,
          uploadedAt: new Date().toISOString(),
          mimeType: 'application/pdf',
          folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'root',
          isDemoMode: true,
          message: `Drive Session Note: ${err.message}`,
        },
      }),
    };
  }
};
