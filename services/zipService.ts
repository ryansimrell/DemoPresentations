import JSZip from "jszip";

/**
 * Extracts a zip file and attempts to prepare the HTML content for display.
 * It searches for an index.html and tries to replace relative asset links (img, link, script)
 * with Blob URLs generated from the other files in the zip.
 */
export const processZipContent = async (zipData: Uint8Array): Promise<string> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipData);

  // 1. Find the entry point (index.html)
  let entryFile = loadedZip.file(/^index\.html$/i)[0];
  
  // If no index.html, grab the first html file found
  if (!entryFile) {
    const htmlFiles = Object.keys(loadedZip.files).filter(name => name.toLowerCase().endsWith('.html'));
    if (htmlFiles.length > 0) {
      entryFile = loadedZip.file(htmlFiles[0]);
    }
  }

  if (!entryFile) {
    throw new Error("No HTML file found in the archive.");
  }

  // 2. Load the HTML content as string
  let htmlContent = await entryFile.async("string");

  // 3. Create Blob URLs for assets to make them work inside the blob HTML
  // We scan for images, css, and js files in the zip to replace references.
  
  const assetMap: Record<string, string> = {};
  const files = Object.keys(loadedZip.files);

  // Helper to create blob url
  const createBlobUrl = async (fileName: string, mimeType: string) => {
    const file = loadedZip.file(fileName);
    if (file) {
      const blob = await file.async("blob");
      // slice helps ensure correct mime type
      const typedBlob = new Blob([blob], { type: mimeType });
      return URL.createObjectURL(typedBlob);
    }
    return null;
  };

  // Iterate over files to create blobs for likely assets
  // Note: This is a basic replacement strategy. Complex absolute/relative path logic 
  // might struggle with deep directories, but this covers flat or simple structures.
  for (const filename of files) {
    const lower = filename.toLowerCase();
    let mime = "";
    if (lower.endsWith(".png")) mime = "image/png";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
    else if (lower.endsWith(".svg")) mime = "image/svg+xml";
    else if (lower.endsWith(".css")) mime = "text/css";
    else if (lower.endsWith(".js")) mime = "application/javascript";
    
    if (mime) {
      const url = await createBlobUrl(filename, mime);
      if (url) {
        assetMap[filename] = url;
      }
    }
  }

  // 4. Replace references in HTML
  // We look for src="X" or href="X"
  // This is a naive replacement. Ideally, we would use a DOMParser, but Regex is faster for simple bulk replace.
  
  Object.keys(assetMap).forEach(filename => {
    // Escape filename for regex
    const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace src="filename" or href="filename"
    // We try to match attributes to avoid replacing text content randomly
    const regex = new RegExp(`(src|href)=["'](\\./)?${escapedName}["']`, 'g');
    htmlContent = htmlContent.replace(regex, `$1="${assetMap[filename]}"`);
  });

  return htmlContent;
};