import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { PlayableContent } from '../types';

interface PlayerProps {
  content: PlayableContent | null;
  onClose: () => void;
}

const Player: React.FC<PlayerProps> = ({ content, onClose }) => {
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in">
      {/* Discrete Back Button */}
      <button 
        onClick={onClose}
        className="absolute bottom-6 left-6 z-50 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white/50 hover:text-white backdrop-blur-md transition-all duration-300 group shadow-lg border border-white/5"
        title="Back to Library"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <iframe
        srcDoc={content.url} // Using srcDoc because content.url is the raw HTML string for reliability
        title="Content Player"
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default Player;