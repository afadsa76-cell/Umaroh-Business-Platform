import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { Hotel, getHotels, saveHotels } from '../data/hotels';

interface PdfUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PdfUploaderModal: React.FC<PdfUploaderModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to read file as base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const processWithAI = async () => {
    if (!file) return;

    setIsProcessing(true);
    setStatus('processing');
    setErrorMessage('');

    try {
      const base64Data = await fileToBase64(file);
      
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

      const prompt = `
You are an expert data extraction assistant. I am providing a PDF document containing a hotel price list.
Extract all hotel pricing information and return it strictly as a JSON array of objects matching this schema:
[
  {
    "id": "unique-kebab-case-id",
    "name": "Hotel Name",
    "city": "Makkah" or "Madinah",
    "vendor": "Vendor Name (if available, otherwise 'Unknown')",
    "mealPlan": "FB" or "HB" or "RO" or "BB",
    "stars": 3, 4, or 5,
    "seasons": [
      {
        "range": "Date range string (e.g. '1 SEPT 2025 TO 1 OCT 2025')",
        "prices": [
          { "roomType": "Double", "price": 1000 },
          { "roomType": "Triple", "price": 1200 },
          { "roomType": "Quad", "price": 1400 }
        ]
      }
    ]
  }
]

Ensure the output is valid JSON and only contains the array of hotels. Do not include markdown formatting like \`\`\`json.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'application/pdf',
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                city: { type: Type.STRING },
                vendor: { type: Type.STRING },
                mealPlan: { type: Type.STRING },
                stars: { type: Type.NUMBER },
                seasons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      range: { type: Type.STRING },
                      prices: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            roomType: { type: Type.STRING },
                            price: { type: Type.NUMBER }
                          },
                          required: ['roomType', 'price']
                        }
                      }
                    },
                    required: ['range', 'prices']
                  }
                }
              },
              required: ['id', 'name', 'city', 'vendor', 'mealPlan', 'seasons']
            }
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error('Empty response from AI');
      }

      const extractedHotels: Hotel[] = JSON.parse(textResponse);
      
      if (!Array.isArray(extractedHotels) || extractedHotels.length === 0) {
        throw new Error('No valid hotel data found in the PDF.');
      }

      // Merge with existing hotels or replace? Let's append new ones or update existing by ID
      const currentHotels = getHotels();
      const updatedHotels = [...currentHotels];

      extractedHotels.forEach(newHotel => {
        const existingIndex = updatedHotels.findIndex(h => h.id === newHotel.id || h.name.toLowerCase() === newHotel.name.toLowerCase());
        if (existingIndex >= 0) {
          updatedHotels[existingIndex] = { ...updatedHotels[existingIndex], ...newHotel };
        } else {
          updatedHotels.push(newHotel);
        }
      });

      saveHotels(updatedHotels);
      setStatus('success');
      
      // Reload page to reflect changes after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Error processing PDF:', error);
      setStatus('error');
      setErrorMessage(error.message || 'An error occurred while processing the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Upload PDF AI</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Upload a hotel price list PDF. Our AI will automatically extract the data and update your database.
          </p>

          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-emerald-300 border-dashed rounded-xl cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm text-emerald-700 font-medium">
                  {file ? file.name : "Click to select PDF"}
                </p>
                {!file && <p className="text-xs text-emerald-500 mt-1">PDF up to 10MB</p>}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="application/pdf" 
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </label>
          </div>

          {status === 'processing' && (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-3 rounded-lg mb-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">AI is analyzing the PDF...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 text-green-600 bg-green-50 p-3 rounded-lg mb-4">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Database updated successfully! Reloading...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 text-red-600 bg-red-50 p-3 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          )}

          <button
            onClick={processWithAI}
            disabled={!file || isProcessing || status === 'success'}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? 'Processing...' : 'Extract & Update Database'}
          </button>
        </div>
      </div>
    </div>
  );
};
