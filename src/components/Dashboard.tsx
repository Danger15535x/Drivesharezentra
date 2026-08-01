import React from 'react';
import {
  UploadCloud,
  HardDrive,
  Clock,
  PieChart,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UploadedFile, DashboardStats, AppSettings } from '../types';
import { formatBytes } from '../utils/formatters';

interface DashboardProps {
  files: UploadedFile[];
  settings: AppSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({ files, settings }) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayFiles = files.filter(
    (f) => new Date(f.uploadedAt).getTime() >= startOfToday
  );

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const avgBytes = files.length > 0 ? Math.round(totalBytes / files.length) : 0;

  const stats: DashboardStats = {
    todayUploads: todayFiles.length,
    totalUploads: files.length,
    totalStorageBytes: totalBytes,
    avgFileSizeBytes: avgBytes,
  };

  const googleDriveCount = files.filter((f) => !f.isDemoMode).length;
  const demoCount = files.filter((f) => f.isDemoMode).length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Storage & Activity Dashboard</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Real-time metrics, cloud usage, and performance overview.
        </p>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Uploads */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Today's Uploads</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.todayUploads}</span>
            <span className="text-xs text-emerald-600 font-medium">PDFs</span>
          </div>
          <p className="text-xs text-slate-400">Uploaded in last 24 hours</p>
        </div>

        {/* Total Uploads */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Uploads</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.totalUploads}</span>
            <span className="text-xs text-indigo-600 font-medium">Files</span>
          </div>
          <p className="text-xs text-slate-400">All-time processed PDFs</p>
        </div>

        {/* Total Storage Used */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Storage</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatBytes(stats.totalStorageBytes)}
            </span>
          </div>
          <p className="text-xs text-slate-400">Occupied cloud space</p>
        </div>

        {/* Average File Size */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg File Size</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatBytes(stats.avgFileSizeBytes)}
            </span>
          </div>
          <p className="text-xs text-slate-400">Average PDF size</p>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cloud Storage Destination Distribution */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Storage Routing Breakdown</span>
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {files.length} total items
            </span>
          </div>

          <div className="space-y-4">
            {/* Google Drive Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Google Drive API Storage</span>
                </span>
                <span className="text-slate-900 dark:text-white font-bold">{googleDriveCount} files</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${files.length > 0 ? (googleDriveCount / files.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Demo Storage Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Demo Mode Storage</span>
                </span>
                <span className="text-slate-900 dark:text-white font-bold">{demoCount} files</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${files.length > 0 ? (demoCount / files.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Settings Quick View */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-indigo-500" />
            <span>Active Configuration Limits</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500">Maximum Upload Size</span>
              <span className="font-bold text-slate-900 dark:text-white">{settings.maxUploadSizeMb} MB</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500">Google Drive Folder ID</span>
              <span className="font-mono text-slate-900 dark:text-white">{settings.folderId || 'root'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500">Auto Public Permission</span>
              <span className="font-bold text-emerald-600">{settings.autoPublic ? 'Enabled' : 'Disabled'}</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Auto Generate QR Code</span>
              <span className="font-bold text-blue-600">{settings.autoGenerateQr ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
