export interface AppConfig {
  url: string; // The Base URL (e.g., https://d123.cloudfront.net)
}

export interface FileItem {
  id: string;
  key: string; // The relative path to the zip file (e.g., "windows/demo.zip")
  title: string;
  sizeLabel: string; // Stores the size string from JSON (e.g., "Unknown" or "10MB")
  thumbnailUrl?: string;
  lastModified?: Date;
  status: 'remote' | 'downloading' | 'ready' | 'error';
  localUrl?: string; // The blob URL for the entry point (index.html)
  errorMsg?: string;
  downloadProgress?: number; // 0-100 percentage
}

export interface PlayableContent {
  title: string;
  url: string;
}

export interface ManifestItem {
  id: string;
  title: string;
  file: string;
  size: string;
  thumbnail?: string; // Optional in JSON
}