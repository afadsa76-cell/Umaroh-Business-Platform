import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, Paperclip, X } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface AIPromptInputProps {
  onDataParsed: (data: any) => void;
  schema: any;
  systemInstruction: string;
  placeholder?: string;
  contextData?: any;
}

export const AIPromptInput: React.FC<AIPromptInputProps> = ({ 
  onDataParsed, 
  schema, 
  systemInstruction,
  placeholder = "Ketik prompt di sini (contoh: Buatkan penawaran untuk 40 pax keberangkatan 12 Desember...)",
  contextData
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string, base64: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      
      // Determine mime type, fallback to text/plain if unknown so Gemini can try to parse it
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv') mimeType = 'text/csv';
        else if (ext === 'txt') mimeType = 'text/plain';
        else mimeType = 'application/octet-stream';
      }

      setSelectedFile({
        name: file.name,
        base64,
        mimeType
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !selectedFile) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      let apiKey = '';
      try {
        // @ts-ignore
        apiKey = process.env.GEMINI_API_KEY;
      } catch (e) {
        // Ignore
      }
      
      if (!apiKey) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      }
      
      if (!apiKey) {
        throw new Error('API Key Gemini tidak ditemukan. Pastikan Anda telah mengatur VITE_GEMINI_API_KEY di environment variables Vercel.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let finalPrompt = prompt;
      if (contextData) {
        finalPrompt = `Berikut adalah data dari database yang bisa Anda gunakan sebagai referensi untuk menjawab prompt:\n${JSON.stringify(contextData, null, 2)}\n\nPrompt Pengguna:\n${prompt}`;
      }

      const parts: any[] = [{ text: finalPrompt }];
      if (selectedFile) {
        parts.push({
          inlineData: {
            data: selectedFile.base64,
            mimeType: selectedFile.mimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Using flash model to avoid quota limits
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });
      
      const text = response.text;
      if (text) {
        const parsedData = JSON.parse(text);
        onDataParsed(parsedData);
        setPrompt(''); // Clear prompt on success
        setSelectedFile(null); // Clear file on success
      }
    } catch (err: any) {
      console.error('Error generating content:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm mb-6 print:hidden">
      <div className="flex items-start gap-3">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mt-1">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-grow">
          <h3 className="text-sm font-bold text-indigo-900 mb-2">AI Assistant</h3>
          
          <div className="flex gap-2 items-start">
            <div className="flex-grow flex flex-col gap-2">
              {selectedFile && (
                <div className="flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-xs font-medium w-fit border border-indigo-200">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="hover:text-red-600 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-indigo-200 text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0 h-10 flex items-center justify-center"
                  title="Upload File Dokumen/Gambar"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*,.pdf,.csv,.txt,.doc,.docx,.xls,.xlsx"
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={placeholder}
                  className="flex-grow bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-10 min-h-[40px] max-h-[120px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || (!prompt.trim() && !selectedFile)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap text-sm font-medium h-10 mt-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Generate'
              )}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
};
