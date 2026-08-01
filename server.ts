import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Local storage directory for uploads and persisted metadata
const UPLOADS_DIR = path.join(process.cwd(), 'uploads_storage');
const DB_FILE = path.join(process.cwd(), 'uploads_db.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory or persisted metadata
interface FileRecord {
  id: string;
  filename: string;
  publicUrl: string;
  downloadUrl: string;
  size: number;
  uploadedAt: string;
  mimeType: string;
  folderId: string;
  isDemoMode: boolean;
  localPath?: string;
}

let fileDatabase: FileRecord[] = [];

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    fileDatabase = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse db file:', err);
    fileDatabase = [];
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDatabase, null, 2));
  } catch (err) {
    console.error('Failed to save db:', err);
  }
}

// Configure multer for memory or temporary disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max limit
});

// Settings state
let appSettings = {
  maxUploadSizeMb: 100,
  folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '1a2b3c4d5e6f7g8h9i0j',
  autoPublic: true,
  autoGenerateQr: true,
  autoCopyLink: true,
  autoClearUpload: false,
  darkMode: false,
  googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY || '',
  googleProjectId: process.env.GOOGLE_PROJECT_ID || '',
};

function getDriveClient() {
  const email = appSettings.googleClientEmail || process.env.GOOGLE_CLIENT_EMAIL;
  let key = appSettings.googlePrivateKey || process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  try {
    // Format private key correctly if escaped
    key = key.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  } catch (err) {
    console.error('Error creating Google Drive client:', err);
    return null;
  }
}

// --- HELPER FUNCTION FOR UPLOAD HANDLER ---
async function handleUploadCore(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Invalid file type. Only PDF files are allowed.' });
    }

    const maxBytes = appSettings.maxUploadSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return res.status(400).json({
        error: `File size exceeds the configured maximum limit of ${appSettings.maxUploadSizeMb} MB.`
      });
    }

    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const drive = getDriveClient();
    const folderId = appSettings.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

    if (drive) {
      try {
        const fileMetadata = {
          name: safeFilename,
          parents: folderId && folderId !== 'root' ? [folderId] : undefined,
        };

        const media = {
          mimeType: 'application/pdf',
          body: require('stream').Readable.from(file.buffer),
        };

        const gFile = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, name, size, webViewLink, webContentLink',
        });

        const fileId = gFile.data.id || `gdrive_${Date.now()}`;

        if (appSettings.autoPublic) {
          try {
            await drive.permissions.create({
              fileId: fileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
          } catch (permErr) {
            console.warn('Failed to set public permission:', permErr);
          }
        }

        const publicUrl = gFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
        const downloadUrl = gFile.data.webContentLink || `https://drive.google.com/uc?id=${fileId}&export=download`;

        const record: FileRecord = {
          id: fileId,
          filename: safeFilename,
          publicUrl,
          downloadUrl,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          mimeType: 'application/pdf',
          folderId: folderId,
          isDemoMode: false,
        };

        fileDatabase.unshift(record);
        saveDb();

        return res.json({
          success: true,
          ...record,
        });
      } catch (driveErr: any) {
        console.error('Google Drive API upload error:', driveErr?.message || driveErr);
        // Fall back to local storage if API fails so the user request succeeds smoothly
      }
    }

    // Local / Demo Mode Storage
    const fileId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savedFilename = `${fileId}_${safeFilename}`;
    const localFilePath = path.join(UPLOADS_DIR, savedFilename);

    fs.writeFileSync(localFilePath, file.buffer);

    const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const publicUrl = `${baseUrl}/api/files/${fileId}/view`;
    const downloadUrl = `${baseUrl}/api/files/${fileId}/download`;

    const record: FileRecord = {
      id: fileId,
      filename: safeFilename,
      publicUrl,
      downloadUrl,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      mimeType: 'application/pdf',
      folderId: folderId,
      isDemoMode: true,
      localPath: savedFilename,
    };

    fileDatabase.unshift(record);
    saveDb();

    return res.json({
      success: true,
      ...record,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Server error during upload' });
  }
}

// --- ENDPOINTS ---

// Settings
app.get('/api/settings', (req, res) => {
  const hasCreds = Boolean(
    (appSettings.googleClientEmail || process.env.GOOGLE_CLIENT_EMAIL) &&
    (appSettings.googlePrivateKey || process.env.GOOGLE_PRIVATE_KEY)
  );
  res.json({
    ...appSettings,
    hasGoogleCredentials: hasCreds,
    googlePrivateKey: undefined, // Hide private key
  });
});

app.post('/api/settings', (req, res) => {
  const {
    maxUploadSizeMb,
    folderId,
    autoPublic,
    autoGenerateQr,
    autoCopyLink,
    autoClearUpload,
    darkMode,
    googleClientEmail,
    googlePrivateKey,
    googleProjectId,
  } = req.body;

  if (typeof maxUploadSizeMb === 'number') appSettings.maxUploadSizeMb = maxUploadSizeMb;
  if (typeof folderId === 'string') appSettings.folderId = folderId;
  if (typeof autoPublic === 'boolean') appSettings.autoPublic = autoPublic;
  if (typeof autoGenerateQr === 'boolean') appSettings.autoGenerateQr = autoGenerateQr;
  if (typeof autoCopyLink === 'boolean') appSettings.autoCopyLink = autoCopyLink;
  if (typeof autoClearUpload === 'boolean') appSettings.autoClearUpload = autoClearUpload;
  if (typeof darkMode === 'boolean') appSettings.darkMode = darkMode;

  if (googleClientEmail !== undefined) appSettings.googleClientEmail = googleClientEmail;
  if (googlePrivateKey !== undefined && googlePrivateKey.trim() !== '') {
    appSettings.googlePrivateKey = googlePrivateKey;
  }
  if (googleProjectId !== undefined) appSettings.googleProjectId = googleProjectId;

  const hasCreds = Boolean(
    (appSettings.googleClientEmail || process.env.GOOGLE_CLIENT_EMAIL) &&
    (appSettings.googlePrivateKey || process.env.GOOGLE_PRIVATE_KEY)
  );

  res.json({
    success: true,
    settings: {
      ...appSettings,
      hasGoogleCredentials: hasCreds,
      googlePrivateKey: undefined,
    },
  });
});

// Upload route (supports /api/upload and /.netlify/functions/upload)
app.post('/api/upload', upload.single('file'), handleUploadCore);
app.post('/.netlify/functions/upload', upload.single('file'), handleUploadCore);

// List route (supports /api/list and /.netlify/functions/list)
const handleListCore = (req: Request, res: Response) => {
  res.json({
    success: true,
    files: fileDatabase,
  });
};

app.get('/api/list', handleListCore);
app.get('/.netlify/functions/list', handleListCore);

// Permissions route (supports /api/permissions and /.netlify/functions/permissions)
const handlePermissionsCore = async (req: Request, res: Response) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  const drive = getDriveClient();
  if (drive) {
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
      return res.json({ success: true, message: 'Public permission granted on Google Drive' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.json({ success: true, message: 'Public permission configured (Demo Mode)' });
};

app.post('/api/permissions', handlePermissionsCore);
app.post('/.netlify/functions/permissions', handlePermissionsCore);

// Delete route (supports /api/delete, /api/delete/:id, and /.netlify/functions/delete)
const handleDeleteCore = async (req: Request, res: Response) => {
  const id = req.params.id || req.body.fileId || req.query.fileId;
  if (!id) {
    return res.status(400).json({ error: 'File ID is required' });
  }

  const fileIdx = fileDatabase.findIndex((f) => f.id === id);
  if (fileIdx === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  const fileRecord = fileDatabase[fileIdx];

  // If in Google Drive, attempt deletion
  const drive = getDriveClient();
  if (drive && !fileRecord.isDemoMode) {
    try {
      await drive.files.delete({ fileId: id });
    } catch (err) {
      console.warn('Failed to delete from Google Drive:', err);
    }
  }

  // Delete local file if present
  if (fileRecord.localPath) {
    const fullPath = path.join(UPLOADS_DIR, fileRecord.localPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Failed to delete local file:', err);
      }
    }
  }

  fileDatabase.splice(fileIdx, 1);
  saveDb();

  return res.json({ success: true, message: 'File deleted successfully' });
};

app.delete('/api/delete/:id', handleDeleteCore);
app.delete('/api/delete', handleDeleteCore);
app.post('/api/delete', handleDeleteCore);
app.post('/.netlify/functions/delete', handleDeleteCore);

// Direct file viewer / downloader for local demo mode
app.get('/api/files/:id/view', (req, res) => {
  const fileRecord = fileDatabase.find((f) => f.id === req.params.id);
  if (!fileRecord || !fileRecord.localPath) {
    return res.status(404).send('File not found');
  }
  const filePath = path.join(UPLOADS_DIR, fileRecord.localPath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File binary missing');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileRecord.filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

app.get('/api/files/:id/download', (req, res) => {
  const fileRecord = fileDatabase.find((f) => f.id === req.params.id);
  if (!fileRecord || !fileRecord.localPath) {
    return res.status(404).send('File not found');
  }
  const filePath = path.join(UPLOADS_DIR, fileRecord.localPath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File binary missing');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

// START SERVER / VITE SETUP
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
