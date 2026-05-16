import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, setDoc, handleFirestoreError, OperationType } from '../../firebase';
import { hotels as staticHotelsList } from '../../data/hotels';
import { Image, MapPin, Search, Edit3, X, Save, Upload, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface HotelItem {
  id: string;
  name: string;
  city: string;
  vendor?: string;
  stars?: number;
}

interface HotelMedia {
  id: string; // Hotel id or name
  hotelId: string;
  hotelName: string;
  city: string;
  photoUrl: string;
  distance: string;
}

export const HotelMediaView: React.FC = () => {
  const [staticHotels, setStaticHotels] = useState<HotelItem[]>([]);
  const [dbHotels, setDbHotels] = useState<HotelItem[]>([]);
  const [mediaList, setMediaList] = useState<HotelMedia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<{photoUrl: string, distance: string}>({ photoUrl: '', distance: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{current: number, total: number} | null>(null);

  useEffect(() => {
    // Basic static hotels
    const staticMap: HotelItem[] = staticHotelsList.map(h => ({
      id: h.id,
      name: h.name,
      city: h.city,
      vendor: h.vendor,
      stars: h.stars || 5
    }));
    setStaticHotels(staticMap);

    const unsubHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      const dbH = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HotelItem));
      setDbHotels(dbH);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'master_hotels'));

    const unsubMedia = onSnapshot(collection(db, 'hotel_metadata'), (snapshot) => {
      const metas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HotelMedia));
      setMediaList(metas);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'hotel_metadata'));

    return () => {
      unsubHotels();
      unsubMedia();
    };
  }, []);

  const allHotelsRaw = [...staticHotels, ...dbHotels];
  // Deduplicate by name
  const allHotels = allHotelsRaw.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);

  const filteredHotels = allHotels.filter(h => 
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMediaForHotel = (hotelId: string, hotelName: string) => {
    return mediaList.find(m => m.hotelId === hotelId || m.hotelName === hotelName);
  };

  const handleEdit = (hotel: HotelItem) => {
    const existing = getMediaForHotel(hotel.id, hotel.name);
    setEditData({
      photoUrl: existing?.photoUrl || '',
      distance: existing?.distance || ''
    });
    setIsEditing(hotel.id);
  };

  const handleSave = async (hotel: HotelItem) => {
    setIsSaving(true);
    try {
      const safeId = hotel.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(db, 'hotel_metadata', safeId);
      await setDoc(docRef, {
        hotelId: hotel.id,
        hotelName: hotel.name,
        city: hotel.city,
        photoUrl: editData.photoUrl,
        distance: editData.distance,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsEditing(null);
    } catch (error) {
      console.error("Error saving media", error);
      handleFirestoreError(error, OperationType.WRITE, 'hotel_metadata');
      console.log("Gagal menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      console.log("Maksimal ukuran gambar adalah 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setEditData(prev => ({ ...prev, photoUrl: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleAiAssist = async (hotel: HotelItem) => {
    setIsGenerating(hotel.id);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || '';

      if (!apiKey) {
        throw new Error('API Key Gemini tidak ditemukan.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Carikan saya foto resmi atau foto eksterior yang bagus untuk hotel ${hotel.name} di ${hotel.city}. Juga estimasikan jarak hotel tersebut ke pelataran masjid terdekat (Masjid Nabawi untuk Madinah, atau Masjidil Haram untuk Makkah). Kembalikan dalam format JSON. 
Pastikan URL gambar (photoUrl) valid, dapat diakses publik, and berasal dari sumber terpercaya seperti Wikimedia Commons, Agoda, Booking.com, atau image hosting publik tanpa perlindungan hotlink. Jika kamu tidak menemukan gambar yang pasti, kembalikan URL kosong "". Gunakan tool googleSearch.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              photoUrl: { type: Type.STRING, description: "Valid image URL for the hotel" },
              distance: { type: Type.STRING, description: "Distance, e.g. '150m ke pelataran'" }
            },
            required: ["photoUrl", "distance"]
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        setEditData({
          photoUrl: parsed.photoUrl || editData.photoUrl,
          distance: parsed.distance || editData.distance
        });
      }
    } catch (error) {
      console.error("AI Error", error);
      console.log("Gagal menggunakan AI.");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleAiAssistBulk = async () => {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || '';

    if (!apiKey) {
      try {
        alert('API Key Gemini tidak ditemukan.');
      } catch (err) {
        console.log('API Key Gemini tidak ditemukan.', err);
      }
      return;
    }

    const hotelsToProcess = allHotels.filter(hotel => {
      const media = getMediaForHotel(hotel.id, hotel.name);
      return !media?.photoUrl || !media?.distance;
    });

    if (hotelsToProcess.length === 0) {
      try {
        alert('Semua hotel sudah lengkap (memiliki foto dan jarak).');
      } catch (e) {
        console.log('Semua hotel sudah lengkap (memiliki foto dan jarak).');
      }
      return;
    }

    try {
      window.confirm(`Akan melengkapi data untuk ${hotelsToProcess.length} hotel yang belum lengkap. Proses ini akan memakan waktu. Lanjutkan?`);
    } catch {
      // In some sandboxed iframes, window.confirm throws
    }

    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: hotelsToProcess.length });
    const ai = new GoogleGenAI({ apiKey });

    let processedCount = 0;

    for (const hotel of hotelsToProcess) {
      setIsGenerating(hotel.id);
      try {
        const prompt = `Carikan saya foto resmi atau foto eksterior yang bagus untuk hotel ${hotel.name} di ${hotel.city}. Juga estimasikan jarak hotel tersebut ke pelataran masjid terdekat (Masjid Nabawi untuk Madinah, atau Masjidil Haram untuk Makkah). Kembalikan dalam format JSON. 
Pastikan URL gambar (photoUrl) valid, dapat diakses publik, dan berasal dari sumber terpercaya seperti Wikimedia Commons, Agoda, Booking.com, atau image hosting publik tanpa perlindungan hotlink. Jika kamu tidak menemukan gambar yang pasti, kembalikan URL kosong "". Gunakan tool googleSearch.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                photoUrl: { type: Type.STRING, description: "Valid image URL for the hotel" },
                distance: { type: Type.STRING, description: "Distance, e.g. '150m ke pelataran'" }
              },
              required: ["photoUrl", "distance"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          const safeId = hotel.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const docRef = doc(db, 'hotel_metadata', safeId);
          
          const existingMedia = getMediaForHotel(hotel.id, hotel.name);
          
          try {
            await setDoc(docRef, {
              hotelId: hotel.id,
              hotelName: hotel.name,
              city: hotel.city,
              photoUrl: parsed.photoUrl || existingMedia?.photoUrl || '',
              distance: parsed.distance || existingMedia?.distance || '',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'hotel_metadata');
          }
        }
      } catch (error) {
        console.error("AI Error for", hotel.name, error);
      }
      processedCount++;
      setGenerationProgress({ current: processedCount, total: hotelsToProcess.length });
    }

    setIsGenerating(null);
    setIsGeneratingAll(false);
    setGenerationProgress(null);
    try {
      console.log('Proses melengkapi data selesai.');
    } catch {
      console.log('Proses melengkapi data selesai.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Master Foto & Jarak Hotel</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola foto dan jarak hotel ke pelataran/masjid.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari hotel berdasarkan nama atau kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <button
            onClick={handleAiAssistBulk}
            disabled={isGeneratingAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isGeneratingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGeneratingAll && generationProgress 
              ? `Memproses ${generationProgress.current}/${generationProgress.total}...` 
              : 'Lengkapi Semua via AI'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Hotel</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Foto</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Jarak</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHotels.map(hotel => {
                const media = getMediaForHotel(hotel.id, hotel.name);
                const editing = isEditing === hotel.id;

                return (
                  <tr key={hotel.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{hotel.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{hotel.city} • ★ {hotel.stars || 5}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editing ? (
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              {editData.photoUrl && (
                                <img 
                                  src={editData.photoUrl} 
                                  alt="Preview" 
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 object-cover rounded-lg border"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = `https://ui-avatars.com/api/?name=Error&background=fee2e2&color=ef4444&font-size=0.33`;
                                  }}
                                />
                              )}
                              <label 
                                onClick={async (e) => {
                                  const { Capacitor } = await import('@capacitor/core');
                                  if (Capacitor.isNativePlatform()) {
                                    e.preventDefault();
                                    try {
                                      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
                                      const image = await Camera.getPhoto({
                                        quality: 90,
                                        allowEditing: false,
                                        resultType: CameraResultType.Base64,
                                        source: CameraSource.Prompt
                                      });
                                      if (image.base64String) {
                                        setEditData(prev => ({ ...prev, photoUrl: `data:image/jpeg;base64,${image.base64String}` }));
                                      }
                                    } catch (err) {
                                      console.error("Camera fail", err);
                                    }
                                  }
                                }}
                                className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                              >
                                <Upload className="w-4 h-4" />
                                Upload
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                              </label>
                           </div>
                           <input 
                             type="text" 
                             placeholder="Atau paste URL gambar..." 
                             value={editData.photoUrl}
                             onChange={(e) => setEditData({...editData, photoUrl: e.target.value})}
                             className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                           />
                        </div>
                      ) : (
                        media?.photoUrl ? (
                          <img 
                            src={media.photoUrl} 
                            alt={hotel.name} 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null; // Prevent infinite loop
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hotel.name)}&background=f3f4f6&color=9ca3af&font-size=0.33`;
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
                            <Image className="w-6 h-6" />
                          </div>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editing ? (
                        <input 
                          type="text" 
                          placeholder="Cth: 150m ke pelataran" 
                          value={editData.distance}
                          onChange={(e) => setEditData({...editData, distance: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      ) : (
                        media?.distance ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex">
                            <MapPin className="w-4 h-4" />
                            {media.distance}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Belum diatur</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAiAssist(hotel)}
                            disabled={isGenerating === hotel.id || isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 mr-2"
                            title="Bantu isi foto dan jarak otomatis menggunakan AI Studio"
                          >
                            {isGenerating === hotel.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Bantu AI
                          </button>
                          <button
                            onClick={() => setIsEditing(null)}
                            disabled={isSaving}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleSave(hotel)}
                            disabled={isSaving}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(hotel)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredHotels.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada hotel yang sesuai dengan pencarian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
