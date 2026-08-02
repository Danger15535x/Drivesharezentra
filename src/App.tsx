import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroUpload } from './components/HeroUpload';
import { UploadCard } from './components/UploadCard';
import { SuccessCard } from './components/SuccessCard';
import { UploadHistory } from './components/UploadHistory';
import { Dashboard } from './components/Dashboard';
import { SettingsModal } from './components/SettingsModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { Toast } from './components/Toast';
import { UploadedFile, UploadProgress, AppSettings, GoogleUser } from './types';

declare global {
  interface Window {
    google?: any;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'dashboard' | 'settings'>('upload');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    maxUploadSizeMb: 100,
    folderId: '1a2b3c4d5e6f7g8h9i0j',
    autoPublic: true,
    autoGenerateQr: true,
    autoCopyLink: true,
    autoClearUpload: false,
    darkMode: false,
    hasGoogleCredentials: false,
    requireGoogleLogin: false,
  });

  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem('drivepdf_google_user');
      if (saved) {
        const parsed: GoogleUser = JSON.parse(saved);
        if (parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [activeSuccessFile, setActiveSuccessFile] = useState<UploadedFile | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentXhr, setCurrentXhr] = useState<XMLHttpRequest | null>(null);
  const [lastUploadedRawFile, setLastUploadedRawFile] = useState<{ file: File; name?: string } | null>(null);

  // Google Login Handler via GIS OAuth Token Client
  const handleGoogleLogin = useCallback(() => {
    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: settings.googleClientId || '1081736495146-ais-demo.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.access_token) {
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const userData = await userRes.json();
              const gUser: GoogleUser = {
                name: userData.name || userData.email || 'Google User',
                email: userData.email || '',
                picture: userData.picture,
                accessToken: response.access_token,
                expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
              };
              setGoogleUser(gUser);
              localStorage.setItem('drivepdf_google_user', JSON.stringify(gUser));
              showToast(`Signed in as ${gUser.name}`);
            } catch (err) {
              console.error('Failed to fetch Google profile:', err);
              showToast('Google login token acquired.');
            }
          } else if (response.error) {
            console.warn('OAuth error:', response.error);
            showToast(`Login notice: ${response.error}`);
          }
        },
      });
      client.requestAccessToken();
    } else {
      showToast('Google Identity Service script loading. Please try again in a moment.');
    }
  }, [settings.googleClientId]);

  const handleGoogleLogout = () => {
    setGoogleUser(null);
    localStorage.removeItem('drivepdf_google_user');
    showToast('Signed out of Google account.');
  };

  // Sync dark mode with root HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (typeof data.darkMode === 'boolean') {
          setDarkMode(data.darkMode);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
  }, []);

  // Load Uploaded Files List
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/list');
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setFiles(data.files);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch file list:', err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchFiles();
  }, [fetchSettings, fetchFiles]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Upload Logic with Direct Google User OAuth, Resumable Session & Fallback Multipart
  const startUpload = async (file: File, customFilename?: string) => {
    const finalFilename = customFilename || file.name;
    setLastUploadedRawFile({ file, name: customFilename });
    setActiveSuccessFile(null);

    if (settings.requireGoogleLogin && !googleUser) {
      showToast('Mandatory Google Login required.');
      handleGoogleLogin();
      return;
    }

    setUploadProgress({
      status: 'uploading',
      progress: 5,
      speedBps: 0,
      remainingSeconds: 0,
      filename: finalFilename,
      fileSize: file.size,
      uploadedBytes: 0,
    });

    // 0. If user is logged in with Google OAuth token, upload directly to Google Drive API!
    if (googleUser && googleUser.accessToken && googleUser.expiresAt > Date.now()) {
      try {
        const sessionRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleUser.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'application/pdf',
            'X-Upload-Content-Length': file.size.toString(),
          },
          body: JSON.stringify({
            name: finalFilename,
            mimeType: 'application/pdf',
            ...(settings.folderId && settings.folderId !== '1a2b3c4d5e6f7g8h9i0j' ? { parents: [settings.folderId] } : {}),
          }),
        });

        if (sessionRes.ok) {
          const uploadUrl = sessionRes.headers.get('Location');
          if (uploadUrl) {
            const xhr = new XMLHttpRequest();
            setCurrentXhr(xhr);
            let lastLoaded = 0;
            let lastTime = Date.now();

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000;
                const loadedDiff = e.loaded - lastLoaded;
                const currentSpeed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
                const remainingBytes = e.total - e.loaded;
                const remainingTime = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
                const percent = Math.round((e.loaded / e.total) * 95);

                setUploadProgress({
                  status: 'uploading',
                  progress: percent,
                  speedBps: currentSpeed || 500000,
                  remainingSeconds: remainingTime,
                  filename: finalFilename,
                  fileSize: e.total,
                  uploadedBytes: e.loaded,
                });

                lastLoaded = e.loaded;
                lastTime = now;
              }
            };

            xhr.onload = async () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                let driveId = '';
                try {
                  const driveData = JSON.parse(xhr.responseText);
                  driveId = driveData.id || '';
                } catch {}

                if (driveId && settings.autoPublic) {
                  try {
                    await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}/permissions`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${googleUser.accessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
                    });
                  } catch (permErr) {
                    console.warn('Failed to set public permission:', permErr);
                  }
                }

                const publicUrl = driveId ? `https://drive.google.com/uc?id=${driveId}&export=download` : `https://drive.google.com/`;
                const uploadedRecord: UploadedFile = {
                  id: driveId || `user-${Date.now()}`,
                  filename: finalFilename,
                  publicUrl,
                  downloadUrl: publicUrl,
                  size: file.size,
                  uploadedAt: new Date().toISOString(),
                  mimeType: 'application/pdf',
                  folderId: settings.folderId,
                  isDemoMode: false,
                };

                setUploadProgress({
                  status: 'idle',
                  progress: 100,
                  speedBps: 0,
                  remainingSeconds: 0,
                  filename: finalFilename,
                  fileSize: file.size,
                  uploadedBytes: file.size,
                });

                setActiveSuccessFile(uploadedRecord);
                setFiles((prev) => [uploadedRecord, ...prev]);
                showToast('PDF uploaded directly to your Google Drive account!');

                if (settings.autoCopyLink) {
                  navigator.clipboard.writeText(publicUrl);
                }
                return;
              }
              performStandardMultipartUpload(file, finalFilename);
            };

            xhr.onerror = () => performStandardMultipartUpload(file, finalFilename);
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', 'application/pdf');
            xhr.send(file);
            return;
          }
        }
      } catch (userUploadErr) {
        console.warn('Direct Google User OAuth upload failed, falling back to server backend:', userUploadErr);
      }
    }

    // 1. Try requesting direct resumable upload session
    try {
      const sessionEndpoint = '/api/create-resumable-upload';

      const sessionRes = await fetch(sessionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: finalFilename,
          size: file.size,
          mimeType: 'application/pdf',
        }),
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();

        // Direct Drive Upload Mode
        if (sessionData.success && sessionData.isDirectDrive && sessionData.uploadUrl) {
          const xhr = new XMLHttpRequest();
          setCurrentXhr(xhr);

          let lastLoaded = 0;
          let lastTime = Date.now();

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;
              const loadedDiff = e.loaded - lastLoaded;
              const currentSpeed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
              const remainingBytes = e.total - e.loaded;
              const remainingTime = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
              const percent = Math.round((e.loaded / e.total) * 90);

              setUploadProgress({
                status: 'uploading',
                progress: percent,
                speedBps: currentSpeed || 500000,
                remainingSeconds: remainingTime,
                filename: finalFilename,
                fileSize: e.total,
                uploadedBytes: e.loaded,
              });

              lastLoaded = e.loaded;
              lastTime = now;
            }
          };

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              let uploadedDriveId = '';
              try {
                const resJson = JSON.parse(xhr.responseText);
                uploadedDriveId = resJson.id || '';
              } catch {}

              const confirmEndpoint = '/api/confirm-upload';
              const confirmRes = await fetch(confirmEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileId: uploadedDriveId,
                  filename: finalFilename,
                  size: file.size,
                }),
              });

              const confirmData = await confirmRes.json();
              if (confirmData.success) {
                setUploadProgress({
                  status: 'idle',
                  progress: 100,
                  speedBps: 0,
                  remainingSeconds: 0,
                  filename: finalFilename,
                  fileSize: file.size,
                  uploadedBytes: file.size,
                });

                const uploadedRecord: UploadedFile = {
                  id: confirmData.id,
                  filename: confirmData.filename,
                  publicUrl: confirmData.publicUrl,
                  downloadUrl: confirmData.downloadUrl,
                  size: confirmData.size,
                  uploadedAt: confirmData.uploadedAt,
                  mimeType: confirmData.mimeType,
                  folderId: confirmData.folderId,
                  isDemoMode: confirmData.isDemoMode,
                };

                setActiveSuccessFile(uploadedRecord);
                fetchFiles();
                showToast('PDF uploaded to Google Drive!');
                if (settings.autoCopyLink) {
                  navigator.clipboard.writeText(uploadedRecord.publicUrl);
                }
                return;
              }
            }

            performStandardMultipartUpload(file, finalFilename);
          };

          xhr.onerror = () => {
            performStandardMultipartUpload(file, finalFilename);
          };

          xhr.open('PUT', sessionData.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', 'application/pdf');
          xhr.send(file);
          return;
        }

        // Fast Demo Mode
        if (sessionData.success && sessionData.isDemoMode && sessionData.demoRecord) {
          setUploadProgress({
            status: 'idle',
            progress: 100,
            speedBps: 0,
            remainingSeconds: 0,
            filename: finalFilename,
            fileSize: file.size,
            uploadedBytes: file.size,
          });

          const rec: UploadedFile = sessionData.demoRecord;
          setActiveSuccessFile(rec);
          fetchFiles();
          showToast('PDF processed in Preview Mode!');
          if (settings.autoCopyLink) {
            navigator.clipboard.writeText(rec.publicUrl);
          }
          return;
        }
      }
    } catch (sessionErr) {
      console.warn('Resumable session initialization warning:', sessionErr);
    }

    performStandardMultipartUpload(file, finalFilename);
  };

  const performStandardMultipartUpload = (file: File, finalFilename: string) => {
    const isServerless = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app');

    // On Vercel or Netlify in demo mode without Google credentials, payload > 4.5MB is blocked by serverless gateway limits
    if (isServerless && file.size > 4.5 * 1024 * 1024 && !settings.hasGoogleCredentials && !googleUser) {
      setUploadProgress({
        status: 'error',
        error: 'File size exceeds serverless gateway limit (4.5MB in Demo Mode). Please Sign In with Google or configure Google Drive Credentials in Settings for direct Drive uploads up to 100MB.',
        progress: 0,
        speedBps: 0,
        remainingSeconds: 0,
        filename: finalFilename,
        fileSize: file.size,
        uploadedBytes: 0,
      });
      return;
    }

    const formData = new FormData();
    const fileToUpload = finalFilename !== file.name
      ? new File([file], finalFilename, { type: 'application/pdf' })
      : file;

    formData.append('file', fileToUpload);

    let lastLoaded = 0;
    let lastTime = Date.now();

    const xhr = new XMLHttpRequest();
    setCurrentXhr(xhr);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        const loadedDiff = e.loaded - lastLoaded;

        const currentSpeed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
        const remainingBytes = e.total - e.loaded;
        const remainingTime = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
        const percent = Math.round((e.loaded / e.total) * 90);

        setUploadProgress({
          status: 'uploading',
          progress: percent,
          speedBps: currentSpeed || 500000,
          remainingSeconds: remainingTime,
          filename: finalFilename,
          fileSize: e.total,
          uploadedBytes: e.loaded,
        });

        lastLoaded = e.loaded;
        lastTime = now;
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            setUploadProgress({
              status: 'idle',
              progress: 100,
              speedBps: 0,
              remainingSeconds: 0,
              filename: finalFilename,
              fileSize: file.size,
              uploadedBytes: file.size,
            });

            const uploadedRecord: UploadedFile = {
              id: response.id,
              filename: response.filename,
              publicUrl: response.publicUrl,
              downloadUrl: response.downloadUrl,
              size: response.size,
              uploadedAt: response.uploadedAt,
              mimeType: response.mimeType,
              folderId: response.folderId,
              isDemoMode: response.isDemoMode,
            };

            setActiveSuccessFile(uploadedRecord);
            fetchFiles();
            showToast('PDF uploaded successfully!');

            if (settings.autoCopyLink) {
              navigator.clipboard.writeText(uploadedRecord.publicUrl);
            }
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } catch (err: any) {
          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'error',
                  error: err.message || 'Error processing upload response',
                }
              : null
          );
        }
      } else {
        let errMsg = '';
        try {
          const errRes = JSON.parse(xhr.responseText);
          errMsg = errRes.error || errRes.message || '';
        } catch {
          if (xhr.status === 413) {
            errMsg = 'File size exceeds serverless gateway limit (Vercel/Netlify). Please Sign In with Google or configure Google Drive Credentials in Settings for direct Drive uploads up to 100MB.';
          } else if (xhr.status === 504 || xhr.status === 502) {
            errMsg = 'Serverless function gateway timeout (502/504). Please Sign In with Google or set Google Drive Credentials in Settings for direct Drive uploads.';
          } else if (xhr.status === 404) {
            errMsg = 'Upload endpoint non-responsive (404 Not Found).';
          } else {
            errMsg = `Server returned status error ${xhr.status} (${xhr.statusText || 'Upload Error'}).`;
          }
        }
        if (!errMsg) {
          errMsg = `Upload failed with HTTP code ${xhr.status}.`;
        }

        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                status: 'error',
                error: errMsg,
              }
            : null
        );
      }
    };

    xhr.onerror = () => {
      setUploadProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: 'Network connection error during file transfer.',
            }
          : null
      );
    };

    const uploadUrl = '/api/upload';
    xhr.open('POST', uploadUrl, true);
    xhr.send(formData);
  };

  const cancelUpload = () => {
    if (currentXhr) {
      currentXhr.abort();
      setCurrentXhr(null);
    }
    setUploadProgress(null);
    showToast('Upload cancelled');
  };

  const retryUpload = () => {
    if (lastUploadedRawFile) {
      startUpload(lastUploadedRawFile.file, lastUploadedRawFile.name);
    }
  };

  // Delete file
  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('File deleted successfully!');
        if (activeSuccessFile?.id === id) {
          setActiveSuccessFile(null);
        }
        fetchFiles();
      } else {
        const err = await res.json();
        alert(`Failed to delete: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Error deleting file: ${err.message}`);
    }
  };

  // Save settings
  const handleSaveSettings = async (
    updated: Partial<AppSettings> & { googlePrivateKey?: string }
  ) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        if (typeof updated.darkMode === 'boolean') {
          setDarkMode(updated.darkMode);
        }
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        openSettings={() => setActiveTab('settings')}
        googleUser={googleUser}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'upload' && (
          <div className="space-y-6 pb-16">
            <HeroUpload
              onFileSelect={startUpload}
              settings={settings}
              openSettings={() => setActiveTab('settings')}
              googleUser={googleUser}
              onLogin={handleGoogleLogin}
            />

            {/* Uploading progress card */}
            {uploadProgress && uploadProgress.status !== 'idle' && (
              <UploadCard
                uploadProgress={uploadProgress}
                onCancel={cancelUpload}
                onRetry={retryUpload}
              />
            )}

            {/* Success Card */}
            {activeSuccessFile && (
              <SuccessCard
                file={activeSuccessFile}
                onUploadAnother={() => {
                  setActiveSuccessFile(null);
                  setUploadProgress(null);
                }}
                onPreview={(file) => setPreviewFile(file)}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <UploadHistory
            files={files}
            onRefresh={fetchFiles}
            onDelete={handleDeleteFile}
            onPreview={(file) => setPreviewFile(file)}
            showToast={showToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard files={files} settings={settings} />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onSaveSettings={handleSaveSettings}
            showToast={showToast}
            googleUser={googleUser}
            onLogin={handleGoogleLogin}
            onLogout={handleGoogleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>Google Drive PDF Uploader • Serverless Vercel & Netlify Architecture • OAuth 2.0 Auth Ready</p>
      </footer>

      {/* Preview Modal */}
      <PdfPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
