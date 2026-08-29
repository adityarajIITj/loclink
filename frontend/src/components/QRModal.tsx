import { QRCodeSVG } from 'qrcode.react';
import type { LinkResponse } from '../services/api';

interface QRModalProps {
  link: LinkResponse;
  onClose: () => void;
}

export default function QRModal({ link, onClose }: QRModalProps) {
  const url = `${window.location.origin}/l/${link.token}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-1 text-center">{link.name}</h2>
        <p className="text-slate-400 text-xs text-center mb-6">Scan to share location</p>

        <div className="bg-white rounded-xl p-4 mx-auto w-fit mb-6">
          <QRCodeSVG value={url} size={200} level="H" />
        </div>

        <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-4">
          <span className="text-slate-400 text-xs truncate flex-1">{url}</span>
          <button
            onClick={copyUrl}
            className="text-indigo-400 hover:text-indigo-300 text-xs font-medium shrink-0 transition-colors"
          >
            Copy
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-slate-400 hover:text-white text-sm py-2 rounded-xl hover:bg-slate-700/50 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
