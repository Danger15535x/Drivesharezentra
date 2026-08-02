import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Lock, Zap, CheckCircle2, ShieldCheck, FileCheck2, LogIn, UserCheck } from 'lucide-react';
import { AppSettings, GoogleUser } from '../types';

interface HeroUploadProps {
  onFileSelect: (file: File, customName?: string) => void;
  settings: AppSettings;
  openSettings: () => void;
  googleUser: GoogleUser | null;
  onLogin: () => void;
}

export const HeroUpload: React.FC<HeroUploadProps> = ({
  onFileSelect,
  settings,
  openSettings,
  googleUser,
  onLogin,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFilePending, setSelectedFilePending] = useState<File | null>(null);
  const [customFilename, setCustomFilename] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are supported.');
      return;
    }

    const maxBytes = settings.maxUploadSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`File size exceeds limit of ${settings.maxUploadSizeMb} MB.`);
      return;
    }

    if (settings.requireGoogleLogin && !googleUser) {
      alert('Google Account sign-in is required to upload files. Please sign in with Google to continue.');
      onLogin();
      return;
    }

    setSelectedFilePending(file);
    setCustomFilename(file.name.replace(/\.pdf$/i, ''));
    setShowRenameModal(true);
  };

  const confirmUpload = () => {
    if (!selectedFilePending) return;
    const finalName = customFilename.trim() ? `${customFilename.trim()}.pdf` : selectedFilePending.name;
    setShowRenameModal(false);
    onFileSelect(selectedFilePending, finalName);
    setSelectedFilePending(null);
  };

  const directUpload = (file: File) => {
    onFileSelect(file);
  };

  return (
    <div className="relative py-8 md:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Header */}
      <div className="text-center space-y-4 mb-8 sm:mb-12">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Serverless Vercel & Netlify + Google Drive API</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
          Google Drive <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">PDF Uploader</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal">
          Upload PDFs directly to cloud storage. Generate instant public sharing links, QR codes, and manage your file history seamlessly.
        </p>

        {/* User login status badge */}
        {googleUser ? (
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold shadow-sm">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Signed in as <strong>{googleUser.email}</strong> (Direct Drive Access)</span>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Sign in with Google to upload directly to your Drive account</span>
          </button>
        )}

        {/* Value props badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 pt-2">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Google OAuth 2.0 Auth Ready</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <span>Auto Public Sharing Link</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Max File Size {settings.maxUploadSizeMb}MB</span>
          </div>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (settings.requireGoogleLogin && !googleUser) {
            onLogin();
          } else {
            fileInputRef.current?.click();
          }
        }}
        className={`relative group cursor-pointer rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 border-2 border-dashed ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01] shadow-xl'
            : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:bg-white dark:hover:bg-slate-800'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf,.pdf"
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-5">
          {/* Animated Icon Container */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
              <UploadCloud className="w-10 h-10 text-blue-600 dark:text-blue-400 group-hover:animate-bounce" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isDragging ? 'Drop your PDF file here' : 'Drag & Drop your PDF file here'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Supports standard single and multi-page PDF documents up to {settings.maxUploadSizeMb} MB
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (settings.requireGoogleLogin && !googleUser) {
                  onLogin();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>Select PDF File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rename & Options Modal */}
      {showRenameModal && selectedFilePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Upload</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Optionally rename your PDF file before sending to Google Drive.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Filename
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="enter-filename"
                />
                <span className="absolute right-3 text-xs font-semibold text-slate-400">.pdf</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  directUpload(selectedFilePending);
                  setShowRenameModal(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Use Original Name
              </button>
              <button
                onClick={confirmUpload}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
