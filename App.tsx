import React, { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, LayoutGrid, Search, AlertTriangle, Link2, WifiOff } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import FileCard from './components/FileCard';
import Player from './components/Player';
import { AppConfig, FileItem, PlayableContent } from './types';
import { fetchFileList, downloadFile } from './services/s3Service';
import { processZipContent } from './services/zipService';
import { saveFileToDB, getStoredKeys, getFileFromDB, deleteFileFromDB } from './services/dbService';

const LOCAL_STORAGE_KEY = 'cloudzip_config_v2';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingContent, setPlayingContent] = useState<PlayableContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Global processing lock for unzip operations

  // Load config on startup
  useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        fetchFiles(parsed);
      } catch (e) {
        console.error("Failed to parse saved config");
        setIsSettingsOpen(true);
      }
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    setFiles([]); // Clear old files
    fetchFiles(newConfig);
  };

  const fetchFiles = useCallback(async (currentConfig: AppConfig) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get List of files already downloaded (Offline cache)
      const storedKeys = await getStoredKeys();
      const storedSet = new Set(storedKeys);

      // 2. Try to fetch from network
      let items: FileItem[] = [];
      try {
        items = await fetchFileList(currentConfig.url);
      } catch (networkErr) {
        console.warn("Network failed, checking if we have offline content...", networkErr);
        // If network fails, we can't show new files, but we might want to show cached ones if we knew what they were.
        // For now, if network fails, we show error unless we implement a manifest cache.
        // To keep it simple: We throw, but user can still play if UI was already loaded. 
        // Better approach: If network fails, we can't build the UI list unless we cached the library.json too.
        // Let's assume for this version we need network to get the list, but downloads work offline.
        throw networkErr;
      }

      // 3. Merge Network List with Local Storage Status
      setFiles(items.map(newItem => {
        const isDownloaded = storedSet.has(newItem.key);
        return {
          ...newItem,
          status: isDownloaded ? 'ready' : 'remote',
          // We don't load localUrl yet to save memory. We load on Play.
        };
      }));

    } catch (err: any) {
      setError(err.message || "Failed to list files. Check URL and CORS settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = async (key: string) => {
    if (!config) return;

    // Set initial downloading state
    setFiles(prev => prev.map(f => f.key === key ? { ...f, status: 'downloading', downloadProgress: 0 } : f));

    try {
      // Track throttling to avoid too many renders
      let lastUpdate = 0;
      
      const onProgress = (received: number, total: number) => {
        const now = Date.now();
        if (now - lastUpdate > 100 && total > 0) {
          lastUpdate = now;
          const percentage = Math.min(Math.round((received / total) * 100), 99);
          
          setFiles(prev => prev.map(f => {
            if (f.key === key && f.downloadProgress !== percentage) {
              return { ...f, downloadProgress: percentage };
            }
            return f;
          }));
        }
      };

      // 1. Download
      const zipData = await downloadFile(config.url, key, onProgress);
      
      // 2. Save to IndexedDB (Persistent Storage)
      setFiles(prev => prev.map(f => f.key === key ? { ...f, downloadProgress: 100 } : f)); // Show "Unpacking/Saving"
      await saveFileToDB(key, zipData);

      // 3. Update state (Mark as ready, but don't hold Blob in RAM yet)
      setFiles(prev => prev.map(f => 
        f.key === key ? { ...f, status: 'ready', downloadProgress: undefined } : f
      ));

    } catch (err: any) {
      console.error(err);
      setFiles(prev => prev.map(f => 
        f.key === key ? { ...f, status: 'error', errorMsg: "Download failed" } : f
      ));
    }
  };

  const handlePlay = async (item: FileItem) => {
    if (isProcessing) return; // Prevent double clicks
    
    try {
      let contentUrl = item.localUrl;

      // If we don't have the processed HTML in RAM, load from DB
      if (!contentUrl) {
        setIsProcessing(true);
        // Add a temporary loading indicator on the item if needed, 
        // but for now the overlay loader is fine or we rely on speed.
        
        const zipData = await getFileFromDB(item.key);
        if (!zipData) {
          throw new Error("File not found in storage. Please download again.");
        }

        contentUrl = await processZipContent(zipData);
        
        // Optionally cache it in RAM for this session
        setFiles(prev => prev.map(f => f.key === item.key ? { ...f, localUrl: contentUrl } : f));
      }

      if (contentUrl) {
        setPlayingContent({
          title: item.title,
          url: contentUrl
        });
      }
    } catch (err: any) {
      console.error("Failed to play:", err);
      // Revert status if file is missing
      if (err.message.includes("not found")) {
        setFiles(prev => prev.map(f => f.key === item.key ? { ...f, status: 'remote' } : f));
        alert("File data missing. Please download again.");
      } else {
        alert("Failed to load content: " + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter files by title or key
  const filteredFiles = files.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <LayoutGrid className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">Victory Presentations</h1>
          </div>

          <div className="flex-1 max-w-md relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition" />
            <input 
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => config && fetchFiles(config)}
              disabled={loading || !config}
              className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition disabled:opacity-50"
              title="Refresh List"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              title="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!config ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-4 animate-pulse">
              <Link2 className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white">Setup Library</h2>
            <p className="text-gray-400 max-w-md">
              Connect to your CloudFront distribution or public bucket URL to start browsing your HTML libraries.
            </p>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition transform hover:scale-105"
            >
              Connect URL
            </button>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
            <div className="p-4 bg-red-500/10 rounded-full">
              <WifiOff className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Connection Failed</h2>
            <p className="text-red-400 max-w-lg px-4">{error}</p>
            <p className="text-gray-500 text-sm">Ensure your URL points to a location with a <code className="text-gray-300">library.json</code> file.</p>
            <button 
              onClick={() => fetchFiles(config)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <FileCard 
                  key={file.key} 
                  item={file} 
                  onDownload={handleDownload} 
                  onPlay={handlePlay}
                />
              ))}
            </div>

            {filteredFiles.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-500">
                <p>No items found. Checked for <code className="text-gray-400">library.json</code> at your URL.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Processing Loader Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/80 border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
             <p className="text-white font-medium">Unpacking...</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveConfig} 
        initialConfig={config || undefined}
      />

      <Player 
        content={playingContent} 
        onClose={() => setPlayingContent(null)} 
      />
    </div>
  );
};

export default App;