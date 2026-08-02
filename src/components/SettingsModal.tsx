import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Folder,
  Sliders,
  Moon,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  UserCheck,
  LogIn,
  LogOut,
  Lock,
} from 'lucide-react';
import { AppSettings, GoogleUser } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (updated: Partial<AppSettings> & { googlePrivateKey?: string }) => void;
  showToast: (msg: string) => void;
  googleUser: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  showToast,
  googleUser,
  onLogin,
  onLogout,
}) => {
  const [maxSize, setMaxSize] = useState(settings.maxUploadSizeMb);
  const [folderId, setFolderId] = useState(settings.folderId);
  const [autoPublic, setAutoPublic] = useState(settings.autoPublic);
  const [autoQr, setAutoQr] = useState(settings.autoGenerateQr);
  const [autoCopy, setAutoCopy] = useState(settings.autoCopyLink);
  const [autoClear, setAutoClear] = useState(settings.autoClearUpload);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [requireGoogleLogin, setRequireGoogleLogin] = useState(settings.requireGoogleLogin || false);

  const [clientEmail, setClientEmail] = useState(settings.googleClientEmail || '');
  const [privateKey, setPrivateKey] = useState('');
  const [projectId, setProjectId] = useState(settings.googleProjectId || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      maxUploadSizeMb: Number(maxSize),
      folderId,
      autoPublic,
      autoGenerateQr: autoQr,
      autoCopyLink: autoCopy,
      autoClearUpload: autoClear,
      darkMode,
      requireGoogleLogin,
      googleClientEmail: clientEmail,
      googlePrivateKey: privateKey.trim() ? privateKey : undefined,
      googleProjectId: projectId,
    });

    setIsSaved(true);
    showToast('Settings saved successfully!');
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <span>Application Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure upload limits, Google account login, Google Drive permissions, and environment variables.
        </p>
      </div>

      {/* Google User Authentication Status Card */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Google User OAuth 2.0 Access</h3>
              <p className="text-xs text-blue-100">
                Direct Google Account authentication for uploading PDFs into your personal Google Drive storage.
              </p>
            </div>
          </div>

          {googleUser ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold backdrop-blur-md transition-colors flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="px-5 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 text-xs font-bold shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {googleUser && (
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {googleUser.picture ? (
                <img src={googleUser.picture} alt={googleUser.name} className="w-6 h-6 rounded-full" />
              ) : (
                <UserCheck className="w-5 h-5 text-emerald-300" />
              )}
              <div>
                <p className="font-semibold">{googleUser.name}</p>
                <p className="text-[11px] text-blue-200">{googleUser.email}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold">
              Drive Authorized
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Upload Behavior Settings Card */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <span>Upload Controls & Limits</span>
          </h3>

          <div className="space-y-6">
            {/* Max Upload Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Maximum Upload Size Limit
                </label>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {maxSize} MB
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={maxSize}
                onChange={(e) => setMaxSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Configure allowed PDF file size limits from 1 MB up to 100 MB.
              </p>
            </div>

            {/* Folder ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Google Drive Folder ID
              </label>
              <div className="relative">
                <Folder className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                The folder ID from your Google Drive URL (after <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">folders/</code>)
              </p>
            </div>

            {/* Toggles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Mandatory Google Login
                  </span>
                  <span className="text-[11px] text-slate-400">Require users to log in with Google before upload</span>
                </div>
                <input
                  type="checkbox"
                  checked={requireGoogleLogin}
                  onChange={(e) => setRequireGoogleLogin(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Auto Public Permission
                  </span>
                  <span className="text-[11px] text-slate-400">Make files readable by anyone with link</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPublic}
                  onChange={(e) => setAutoPublic(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Auto Generate QR Code
                  </span>
                  <span className="text-[11px] text-slate-400">Create scan-to-view QR codes on success</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoQr}
                  onChange={(e) => setAutoQr(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Auto Copy Link
                  </span>
                  <span className="text-[11px] text-slate-400">Copy share link to clipboard on finish</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoCopy}
                  onChange={(e) => setAutoCopy(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Dark Mode Theme
                  </span>
                  <span className="text-[11px] text-slate-400">Enable dark color scheme UI</span>
                </div>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Google Service Account Credentials Settings */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-amber-500" />
              <span>Google Drive Service Account Credentials</span>
            </h3>

            {settings.hasGoogleCredentials ? (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Credentials Active</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Using OAuth / Demo Storage</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-semibold flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>How to connect real Google Drive storage:</span>
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-[11px]">
              <li>Sign in with your Google account above using Google OAuth.</li>
              <li>Or create a Service Account in Google Cloud Console & enable Google Drive API.</li>
              <li>Paste Service Account credentials below or set environment variables in Vercel / Netlify / .env.</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                GOOGLE_CLIENT_EMAIL
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="service-account@project-id.iam.gserviceaccount.com"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                GOOGLE_PRIVATE_KEY
              </label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                rows={3}
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty to preserve currently configured private key.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                GOOGLE_PROJECT_ID
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-gcp-project-id"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition-all active:scale-95"
          >
            {isSaved ? <Check className="w-5 h-5 text-emerald-300" /> : <Save className="w-5 h-5" />}
            <span>{isSaved ? 'Settings Saved!' : 'Save Configurations'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
