import { FileItem, ManifestItem } from "../types";

/**
 * Helper to join base URL and path cleanly.
 * Removes trailing slashes from base and leading slashes/dots from path.
 */
const joinUrl = (baseUrl: string, path: string): string => {
  if (!path) return baseUrl;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const cleanBase = baseUrl.replace(/\/+$/, "");
  // Remove leading slash or ./
  const cleanPath = path.replace(/^(\.\/|\/)+/, "");
  
  return `${cleanBase}/${cleanPath}`;
};

/**
 * Fetches the library.json manifest from the CloudFront/Public URL.
 */
export const fetchFileList = async (baseUrl: string): Promise<FileItem[]> => {
  const manifestUrl = joinUrl(baseUrl, 'library.json');

  try {
    const response = await fetch(manifestUrl, { cache: 'no-cache' });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("library.json not found at this URL.");
      }
      throw new Error(`Failed to load library: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error("Invalid library format. Expected a JSON array.");
    }

    // Map manifest items to FileItems
    return data.map((item: ManifestItem) => {
      // Resolve thumbnail URL if present
      const thumbUrl = item.thumbnail ? joinUrl(baseUrl, item.thumbnail) : undefined;

      return {
        id: item.id || item.file, // Fallback to file path if ID missing
        key: item.file,
        title: item.title || item.file,
        sizeLabel: item.size || 'Unknown',
        thumbnailUrl: thumbUrl,
        status: 'remote',
      };
    });
  } catch (error) {
    console.error("Error fetching file list:", error);
    throw error;
  }
};

/**
 * Downloads a zip file from the CloudFront URL with progress tracking.
 */
export const downloadFile = async (
  baseUrl: string, 
  fileName: string,
  onProgress?: (received: number, total: number) => void
): Promise<Uint8Array> => {
  const fileUrl = joinUrl(baseUrl, fileName);

  try {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // If streaming isn't supported or no progress callback, fallback to simple arrayBuffer
    if (!response.body || !onProgress) {
      const arrayBuffer = await response.arrayBuffer();
      if (onProgress && total > 0) onProgress(total, total);
      return new Uint8Array(arrayBuffer);
    }

    // Stream the download to track progress
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      received += value.length;
      
      // Invoke progress callback
      onProgress(received, total);
    }

    // Combine chunks into single Uint8Array
    const allChunks = new Uint8Array(received);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    return allChunks;
  } catch (error) {
    console.error(`Error downloading ${fileName}:`, error);
    throw error;
  }
};