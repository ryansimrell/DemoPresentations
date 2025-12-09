import React, { useState } from 'react';
import { FileItem } from '../types';
import { Play, Download, Loader2, AlertCircle } from 'lucide-react';

interface FileCardProps {
  item: FileItem;
  onDownload: (key: string) => void;
  onPlay: (item: FileItem) => void;
}

const FileCard: React.FC<FileCardProps> = ({ item, onDownload, onPlay }) => {
  const [imgError, setImgError] = useState(false);

  // Determine if we should show the image
  const showImage = item.thumbnailUrl && !imgError;

  const handleCardClick = () => {
    if (item.status === 'ready') {
      onPlay(item);
    } else if (item.status === 'remote') {
      onDownload(item.key);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="glass-card rounded-2xl relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-900/20 aspect-[4/3] flex flex-col justify-end cursor-pointer"
    >
      
      {/* Full Cover Thumbnail */}
      {showImage ? (
        <div className="absolute inset-0 z-0">
          <img 
            src={item.thumbnailUrl} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>
      ) : (
        /* Fallback Abstract Background */
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-800 to-black">
        </div>
      )}

      {/* Top Status Badges (Absolute) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        
        {item.status === 'downloading' && (
          <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-lg">
             <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
             <span className="text-[10px] font-bold text-blue-100 tabular-nums">
                {item.downloadProgress !== undefined ? `${item.downloadProgress}%` : ''}
             </span>
          </div>
        )}
        
        {item.status === 'ready' && (
          <span className="bg-green-500/90 text-white text-[10px] px-2 py-1 rounded-lg font-bold border border-white/10 backdrop-blur-md shadow-lg uppercase tracking-wide">
            Ready
          </span>
        )}

        {item.status === 'error' && (
           <span className="bg-red-500/90 text-white text-[10px] px-2 py-1 rounded-lg font-bold border border-white/10 backdrop-blur-md shadow-lg uppercase tracking-wide flex items-center gap-1">
             <AlertCircle className="w-3 h-3" /> Error
           </span>
        )}
      </div>

      {/* Content Info (Bottom) */}
      <div className="relative z-10 p-4 w-full">
        <div className="flex justify-between items-end gap-2">
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white leading-tight truncate drop-shadow-md" title={item.title}>
                {item.title}
                </h3>
                <p className="text-xs text-gray-300 font-medium opacity-80 mt-0.5">
                    {item.sizeLabel}
                </p>
            </div>
        </div>

        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          {item.status === 'remote' && (
            <button
              onClick={() => onDownload(item.key)}
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2 transition backdrop-blur-md group-hover:bg-blue-600 group-hover:border-blue-500"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
          
          {item.status === 'downloading' && (
            <div className="w-full h-[36px] relative rounded-lg bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md">
               <div 
                 className="absolute inset-y-0 left-0 bg-blue-600/50 transition-all duration-200 ease-out"
                 style={{ width: `${item.downloadProgress ?? 0}%` }}
               />
               <div className="absolute inset-0 flex items-center justify-center gap-2 text-blue-100 font-medium z-10">
                 <span className="text-xs shadow-black drop-shadow-sm">
                   {item.downloadProgress === 100 ? 'Unpacking...' : 'Downloading...'}
                 </span>
               </div>
            </div>
          )}

          {item.status === 'ready' && (
            <button
              onClick={() => onPlay(item)}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Play
            </button>
          )}

          {item.status === 'error' && (
            <button
                onClick={() => onDownload(item.key)} // Retry
                className="w-full py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm font-medium flex items-center justify-center gap-2 backdrop-blur-md hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileCard;