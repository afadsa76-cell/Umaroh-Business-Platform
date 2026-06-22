import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, setDoc, handleFirestoreError, OperationType } from '../../firebase';
import { hotels as staticHotelsList } from '../../data/hotels';
import { Image, MapPin, Search, Edit3, X, Save, Upload, Sparkles, Loader2 } from 'lucide-react';
import { safeJsonParse } from '../../utils/firebaseSync';

export const getFallbackDistance = (id: string, name?: string): string => {
  const norm = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (norm.includes("millenniumalaqeeq") || id === "millennium-al-aqeeq-diar") return "50m ke Pelataran";
  if (norm.includes("harithia") || norm.includes("haritzia") || id === "al-harithia-diar") return "70m ke Pelataran";
  if (norm.includes("daraleiman") || id === "dar-al-eiman-al-haram") return "100m ke Pelataran";
  if (norm.includes("rotana")) return "50m ke Pelataran";
  if (norm.includes("movenpick") || norm.includes("moevenpick")) return "50m ke Pelataran";
  if (norm.includes("safwa")) return "50m ke Pelataran";
  if (norm.includes("taibafront") || norm.includes("taibahfront")) return "120m ke Pelataran";
  if (norm.includes("shazaregency")) return "100m ke Pelataran";
  if (norm.includes("rove")) return "150m ke Pelataran";
  if (norm.includes("makkah") && norm.includes("tower")) return "80m ke Pelataran";
  if (norm.includes("azka")) return "150m ke Pelataran";
  if (norm.includes("massa") || norm.includes("masah")) return "200m ke Pelataran";
  if (norm.includes("meridien") || norm.includes("miredien")) return "250m ke Pelataran";
  if (norm.includes("pullman") || norm.includes("zamzam")) return "50m ke Pelataran";
  return "";
};

export const getNormalizedHotelNameKey = (name?: string): string => {
  if (!name) return "";
  let words = name.toLowerCase().split(/[\s.-]+/);
  
  // Filter out common stop-words
  const stopwords = ["hotel", "the", "int", "group", "plaza", "by", "ex", "standard", "setaraf"];
  words = words.filter(w => w && !stopwords.includes(w));
  
  // Remove common Arabic prefixes
  words = words.map(w => {
    if ((w.startsWith("al") || w.startsWith("el")) && w.length > 2) {
      return w.slice(2);
    }
    return w;
  });
  
  let clean = words.join("");
  
  // Generic phonetic/spelling collapse
  clean = clean
    .replace(/harithia/g, "haritsia")
    .replace(/haritzia/g, "haritsia")
    .replace(/harith/g, "harits")
    .replace(/misk/g, "mysk")
    .replace(/maqom/g, "maqam")
    .replace(/madina/g, "madinah")
    .replace(/taiba/g, "taibah")
    .replace(/sofua/g, "sofwa")
    .replace(/sofwah/g, "sofwa")
    .replace(/movenpick/g, "moevenpick")
    .replace(/e/g, "i")
    .replace(/y/g, "i")
    .replace(/u/g, "o")
    .replace(/a/g, "o")
    .replace(/h/g, "")
    .replace(/z/g, "s")
    .replace(/f/g, "p")
    .replace(/v/g, "p")
    .replace(/g/g, "k")
    .replace(/j/g, "s")
    .replace(/d/g, "t");
    
  return clean;
};

const getBetterErrorMessage = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error || "");
  if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exhausted") || msg.toLowerCase().includes("billing")) {
    return "Kuota Gemini API gratis atau berbayar Anda di Google AI Studio telah habis (RESOURCE_EXHAUSTED). Anda dapat menginput jarak and URL foto secara manual dengan mengklik tombol Edit (ikon Pensil) di sebelah kanan hotel, lalu menekan Simpan.";
  }
  return `Gagal memproses AI: ${msg}`;
};

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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
  // Deduplicate by normalized name key so "Grand Plaza Badr Al Maqom" and "Grand Plaza Badr Maqom" are grouped
  const allHotels = allHotelsRaw.filter((v, i, a) => 
    a.findIndex(t => getNormalizedHotelNameKey(t.name) === getNormalizedHotelNameKey(v.name)) === i
  );

  const filteredHotels = allHotels.filter(h => 
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMediaForHotel = (hotelId: string, hotelName: string) => {
    const targetNorm = getNormalizedHotelNameKey(hotelName);
    return mediaList.find(m => 
      m.hotelId === hotelId || 
      m.hotelName === hotelName || 
      getNormalizedHotelNameKey(m.hotelName) === targetNorm
    );
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

  const fetchWithRetryAndFallback = async (
    prompt: string, 
    useSearch = true, 
    maxRetries = 2, 
    delayMs = 4000
  ): Promise<{ text?: string; response?: unknown }> => {
    let retries = 0;
    while (true) {
      try {
        const bodyObj = {
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                photoUrl: { type: 'STRING', description: "Valid image URL for the hotel" },
                distance: { type: 'STRING', description: "Distance, e.g. '150m ke pelataran'" }
              },
              required: ["photoUrl", "distance"]
            },
            tools: useSearch ? [{ googleSearch: {} }] : undefined
          }
        };

        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyObj)
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedMessage = '';
          try {
            const parsedJson = JSON.parse(errText);
            parsedMessage = parsedJson.error || parsedJson.message || errText;
          } catch {
            parsedMessage = errText;
          }

          const isRateLimit = response.status === 429 || 
                              parsedMessage.includes('429') || 
                              parsedMessage.toLowerCase().includes('quota') || 
                              parsedMessage.toLowerCase().includes('rate limit') || 
                              parsedMessage.toLowerCase().includes('exhausted');

          if (isRateLimit && retries < maxRetries) {
            retries++;
            const backoffDelay = delayMs * Math.pow(2, retries - 1);
            console.warn(`Gemini rate limited/quota exhausted. Retrying in ${backoffDelay}ms... (Attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }

          if (useSearch) {
            console.warn('Failing with search grounding. Trying fallback without googleSearch tool...');
            return fetchWithRetryAndFallback(prompt, false, maxRetries, delayMs);
          }

          throw new Error(parsedMessage);
        }

        const resData = await response.json();
        return resData;
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          const backoffDelay = delayMs * Math.pow(2, retries - 1);
          console.warn(`Request failed: ${(error as Error).message}. Retrying in ${backoffDelay}ms... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        if (useSearch) {
          console.warn('Request failed with search. Trying fallback without googleSearch tool...');
          return fetchWithRetryAndFallback(prompt, false, maxRetries, delayMs);
        }
        throw error;
      }
    }
  };

  const handleAiAssist = async (hotel: HotelItem) => {
    setIsGenerating(hotel.id);
    setErrorMessage(null);
    try {
      const prompt = `Carikan saya foto resmi atau foto eksterior yang bagus untuk hotel ${hotel.name} di ${hotel.city}. Juga estimasikan jarak hotel tersebut ke pelataran masjid terdekat (Masjid Nabawi untuk Madinah, atau Masjidil Haram untuk Makkah). Kembalikan dalam format JSON. 
Pastikan URL gambar (photoUrl) valid, dapat diakses publik, dan berasal dari sumber terpercaya seperti Wikimedia Commons, Agoda, Booking.com, atau image hosting publik tanpa perlindungan hotlink. Jika kamu tidak menemukan gambar yang pasti, kembalikan URL kosong "". Gunakan tool googleSearch.`;

      const resData = await fetchWithRetryAndFallback(prompt, true);
      if (resData && resData.text) {
        const parsed = safeJsonParse(resData.text);
        setEditData({
          photoUrl: parsed.photoUrl || editData.photoUrl,
          distance: parsed.distance || editData.distance
        });
      }
    } catch (error) {
      console.error("AI Error", error);
      const betterMsg = getBetterErrorMessage(error);
      setErrorMessage(betterMsg);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleAiAssistBulk = async () => {
    const hotelsToProcess = allHotels.filter(hotel => {
      const media = getMediaForHotel(hotel.id, hotel.name);
      return !media?.photoUrl || !media?.distance;
    });

    if (hotelsToProcess.length === 0) {
      try {
        alert('Semua hotel sudah lengkap (memiliki foto dan jarak).');
      } catch {
        console.log('Semua hotel sudah lengkap (memiliki foto dan jarak).');
      }
      return;
    }

    try {
      if (!window.confirm(`Akan melengkapi data untuk ${hotelsToProcess.length} hotel yang belum lengkap. Proses ini akan memakan waktu. Lanjutkan?`)) {
        return;
      }
    } catch {
      // In some sandboxed iframes, window.confirm throws
    }

    setErrorMessage(null);
    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: hotelsToProcess.length });

    let processedCount = 0;

    for (const hotel of hotelsToProcess) {
      setIsGenerating(hotel.id);
      try {
        const prompt = `Carikan saya foto resmi atau foto eksterior yang bagus untuk hotel ${hotel.name} di ${hotel.city}. Juga estimasikan jarak hotel tersebut ke pelataran masjid terdekat (Masjid Nabawi untuk Madinah, atau Masjidil Haram untuk Makkah). Kembalikan dalam format JSON. 
Pastikan URL gambar (photoUrl) valid, dapat diakses publik, dan berasal dari sumber terpercaya seperti Wikimedia Commons, Agoda, Booking.com, atau image hosting publik tanpa perlindungan hotlink. Jika kamu tidak menemukan gambar yang pasti, kembalikan URL kosong "". Gunakan tool googleSearch.`;

        const resData = await fetchWithRetryAndFallback(prompt, true);
        if (resData && resData.text) {
          const parsed = safeJsonParse(resData.text);
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
        const betterMsg = getBetterErrorMessage(error);
        setErrorMessage(betterMsg);
        break; // Stop bulk generation since quota is depleted!
      }
      processedCount++;
      setGenerationProgress({ current: processedCount, total: hotelsToProcess.length });

      // Add a 3-second delay between iterations to prevent hitting API limits
      if (processedCount < hotelsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
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

      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
          <div className="font-semibold shrink-0">Peringatan:</div>
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-500 hover:text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                        ) : getFallbackDistance(hotel.id, hotel.name) ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-medium bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex">
                            <MapPin className="w-4 h-4 text-indigo-500" />
                            {getFallbackDistance(hotel.id, hotel.name)} (Default)
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
