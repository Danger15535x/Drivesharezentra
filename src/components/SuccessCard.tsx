import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  QrCode,
  UploadCloud,
  FileText,
  Eye,
  Check,
  Download,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UploadedFile } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

interface SuccessCardProps {
  file: UploadedFile;
  onUploadAnother: () => void;
  onPreview: (file: UploadedFile) => void;
  showToast: (msg: string) => void;
}

export const SuccessCard: React.FC<SuccessCardProps> = ({
  file,
  onUploadAnother,
  onPreview,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (file.publicUrl) {
      QRCode.toDataURL(file.publicUrl, { width: 220, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [file.publicUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(file.publicUrl);
    setCopied(true);
    showToast('Public sharing link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${file.filename.replace(/\.pdf$/i, '')}.png`;
    a.click();
    showToast('QR Code image downloaded!');
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-2xl backdrop-blur-md animate-fade-in space-y-6">
      {/* Header Banner */}
      <div className="flex items-center space-x-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800">
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/30 animate-bounce">
          <CheckCircle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
            Upload Successful!
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            File is stored on {file.isDemoMode ? 'Serverless Storage' : 'Google Drive'} and ready for public sharing.
          </p>
        </div>
      </div>

      {/* File Details Grid */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-medium">Filename</span>
          <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5 text-sm flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate">{file.filename}</span>
          </p>
        </div>

        <div>
          <span className="text-slate-400 font-medium">File Size</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 text-sm">
            {formatBytes(file.size)}
          </p>
        </div>

        <div>
          <span className="text-slate-400 font-medium">Upload Time</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 text-sm">
            {formatDate(file.uploadedAt)}
          </p>
        </div>

        <div>
          <span className="text-slate-400 font-medium">Storage Destination</span>
          <p className="font-semibold mt-0.5 text-sm flex items-center space-x-1">
            {file.isDemoMode ? (
              <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Storage</span>
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google Drive ({file.id.substring(0, 10)}...)</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Share Link Input */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Public Sharing Link (Anyone with link can view)
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={file.publicUrl}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition-all shrink-0 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Actions and QR Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
        {/* QR Code Container */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
            <img src={qrDataUrl} alt="File QR Code" className="w-32 h-32 rounded-lg" />
            <button
              onClick={handleDownloadQr}
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR</span>
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex-1 w-full space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <a
              href={file.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Link</span>
            </a>

            <button
              onClick={() => onPreview(file)}
              className="px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center space-x-2 border border-indigo-200/80 dark:border-indigo-800/80 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Preview PDF</span>
            </button>
          </div>

          <button
            onClick={onUploadAnother}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Upload Another PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
