export interface UploadedFile {
  id: string;
  filename: string;
  publicUrl: string;
  downloadUrl: string;
  size: number; // in bytes
  uploadedAt: string; // ISO string
  mimeType: string;
  folderId?: string;
  isDemoMode?: boolean;
}

export interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number; // 0 to 100
  speedBps: number; // Bytes per second
  remainingSeconds: number;
  filename: string;
  fileSize: number;
  uploadedBytes: number;
  error?: string;
}

export interface DashboardStats {
  todayUploads: number;
  totalUploads: number;
  totalStorageBytes: number;
  avgFileSizeBytes: number;
}

export interface AppSettings {
  maxUploadSizeMb: number;
  folderId: string;
  autoPublic: boolean;
  autoGenerateQr: boolean;
  autoCopyLink: boolean;
  autoClearUpload: boolean;
  darkMode: boolean;
  hasGoogleCredentials: boolean;
  googleClientEmail?: string;
  googleProjectId?: string;
}
