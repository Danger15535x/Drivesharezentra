import React from 'react';
import { HardDrive, UploadCloud, History, BarChart2, Settings, Moon, Sun, ShieldCheck, Sparkles, LogIn, LogOut, User } from 'lucide-react';
import { AppSettings, GoogleUser } from '../types';

interface HeaderProps {
  activeTab: 'upload' | 'history' | 'dashboard' | 'settings';
  setActiveTab: (tab: 'upload' | 'history' | 'dashboard' | 'settings') => void;
  settings: AppSettings;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  openSettings: () => void;
  googleUser: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  darkMode,
  setDarkMode,
  openSettings,
  googleUser,
  onLogin,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('upload')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                DrivePDF
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Google Drive PDF Serverless Hub
            </p>
          </div>
        </div>

        {/* Integration Status & User Profile */}
        <div className="hidden lg:flex items-center space-x-3">
          {googleUser ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300 text-xs font-medium">
              {googleUser.picture ? (
                <img src={googleUser.picture} alt={googleUser.name} className="w-4 h-4 rounded-full" />
              ) : (
                <User className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span className="max-w-[120px] truncate">{googleUser.name}</span>
              <span className="text-[10px] bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded font-bold">Drive Auth</span>
            </div>
          ) : settings.hasGoogleCredentials ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Drive API Service Connected</span>
            </div>
          ) : (
            <button
              onClick={openSettings}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Storage Mode (Configure Credentials)</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden md:inline">Uploader</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">History</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden md:inline">Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Settings</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Google Login / Logout Button */}
          {googleUser ? (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-colors"
              title="Sign Out of Google"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
              title="Sign In with Google Account"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google Sign-In</span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
};
