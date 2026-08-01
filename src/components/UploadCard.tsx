import React from 'react';
import { FileText, XCircle, RefreshCw, Loader2, Zap, AlertTriangle } from 'lucide-react';
import { UploadProgress } from '../types';
import { formatBytes, formatTimeLeft } from '../utils/formatters';

interface UploadCardProps {
  uploadProgress: UploadProgress;
  onCancel: () => void;
  onRetry: () => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  uploadProgress,
  onCancel,
  onRetry,
}) => {
  const { status, progress, speedBps, remainingSeconds, filename, fileSize, uploadedBytes, error } =
    uploadProgress;

  return (
    <div className="max-w-2xl mx-auto my-6 p-6 sm:p-8 bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-2xl backdrop-blur-md animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {filename}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatBytes(uploadedBytes)} of {formatBytes(fileSize)}
            </p>
          </div>
        </div>

        {status === 'uploading' || status === 'processing' ? (
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Cancel Upload"
          >
            <XCircle className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {/* Progress Bar & Indicators */}
      {status === 'error' ? (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 space-y-3">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-300 font-medium text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>Upload Failed: {error || 'An error occurred during transfer'}</span>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onRetry}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow-sm flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Upload</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress Bar Container */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                {status === 'processing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 inline mr-1" />
                    <span>Processing with Google Drive API...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500 inline mr-1" />
                    <span>Uploading...</span>
                  </>
                )}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{progress}%</span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Transfer stats: Speed & Remaining Time */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>
              Speed: <strong className="text-slate-700 dark:text-slate-200">{formatBytes(speedBps)}/s</strong>
            </span>
            <span>
              ETA: <strong className="text-slate-700 dark:text-slate-200">{formatTimeLeft(remainingSeconds)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
