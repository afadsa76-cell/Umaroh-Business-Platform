import React from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';

interface AIResultModalProps {
  title: string;
  content: string;
  onClose: () => void;
  onSave?: (content: string) => void;
}

export const AIResultModal: React.FC<AIResultModalProps> = ({ title, content, onClose, onSave }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-gray-100">
        {/* Header */}
        <div className="bg-[#1A1C29] text-white p-6 sm:p-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest">{title}</h2>
              <p className="text-[10px] font-bold text-gray-400 mt-1 tracking-widest uppercase">HASIL GENERATE AI</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-gray-50/30 flex-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[300px] prose prose-sm max-w-none whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
            {content || "Generating..."}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
          >
            Tutup
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handleCopy}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Berhasil Disalin" : "Salin Teks"}
            </button>
            {onSave && (
              <button 
                onClick={() => {
                  onSave(content);
                  onClose();
                }}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                Gunakan Deskripsi Ini
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
