import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { Save, X, Globe, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AppConfig) => void;
  initialConfig?: AppConfig;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setUrl(initialConfig.url);
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation to add https if missing
    let finalUrl = url.trim();
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `https://${finalUrl}`;
    }
    onSave({ url: finalUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            Connect Library
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">
              CloudFront / Distribution URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://d1234abcd.cloudfront.net"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <p className="text-xs text-gray-500 ml-1">
              Enter the public URL where your <code className="text-blue-300">library.json</code> is hosted.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
             <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
             <div className="text-xs text-blue-200/80 leading-relaxed">
               <strong>Requirement:</strong> Ensure your bucket contains a <code className="bg-black/30 px-1 py-0.5 rounded text-white">library.json</code> file.
               <br/>
               Expected format: <code className="text-blue-300">[{`{ "id": "...", "title": "...", "file": "path/to.zip" }`}]</code>
             </div>
          </div>

          <div className="pt-2 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-300 hover:bg-white/5 transition border border-transparent">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
