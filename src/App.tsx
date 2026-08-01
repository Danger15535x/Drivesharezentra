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
import { UploadedFile, UploadProgress, AppSettings } from './types';

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
  });

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [activeSuccessFile, setActiveSuccessFile] = useState<UploadedFile | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentXhr, setCurrentXhr] = useState<XMLHttpRequest | null>(null);
  const [lastUploadedRawFile, setLastUploadedRawFile] = useState<{ file: File; name?: string } | null>(null);

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

  // Upload Logic with XMLHttpRequest for real progress
  const startUpload = (file: File, customFilename?: string) => {
    const finalFilename = customFilename || file.name;
    setLastUploadedRawFile({ file, name: customFilename });
    setActiveSuccessFile(null);

    const formData = new FormData();
    // Rename file if custom name provided
    const fileToUpload = customFilename
      ? new File([file], customFilename, { type: 'application/pdf' })
      : file;

    formData.append('file', fileToUpload);

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = Date.now();

    const xhr = new XMLHttpRequest();
    setCurrentXhr(xhr);

    setUploadProgress({
      status: 'uploading',
      progress: 0,
      speedBps: 0,
      remainingSeconds: 0,
      filename: finalFilename,
      fileSize: file.size,
      uploadedBytes: 0,
    });

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        const loadedDiff = e.loaded - lastLoaded;

        const currentSpeed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
        const remainingBytes = e.total - e.loaded;
        const remainingTime = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;

        const percent = Math.round((e.loaded / e.total) * 90); // reserve top 10% for processing

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
        let errMsg = 'Upload failed';
        try {
          const errRes = JSON.parse(xhr.responseText);
          errMsg = errRes.error || errMsg;
        } catch {}

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

    xhr.open('POST', '/api/upload', true);
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
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'upload' && (
          <div className="space-y-6 pb-16">
            <HeroUpload
              onFileSelect={startUpload}
              settings={settings}
              openSettings={() => setActiveTab('settings')}
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
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>Google Drive PDF Uploader • Serverless Netlify Architecture • Secure Cloud Storage</p>
      </footer>

      {/* Preview Modal */}
      <PdfPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
