import React, { useState, useEffect } from 'react';
import { Hotel } from '../data/hotels';
import { Calendar, Utensils, Building, Star, MapPin, Pencil, Upload } from 'lucide-react';
import { convertGoogleDriveUrl } from './database/HotelMediaView';

const resizeAndCropImageToBase64 = (base64String: string, callback: (resized: string) => void) => {
  const img = new window.Image();
  img.onload = () => {
    const targetWidth = 1280;
    const targetHeight = 800;
    
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      callback(base64String);
      return;
    }

    const imgRatio = img.width / img.height;
    const targetRatio = targetWidth / targetHeight;
    
    let sx = 0;
    let sy = 0;
    let sWidth = img.width;
    let sHeight = img.height;
    
    if (imgRatio > targetRatio) {
      sWidth = img.height * targetRatio;
      sx = (img.width - sWidth) / 2;
    } else if (imgRatio < targetRatio) {
      sHeight = img.width / targetRatio;
      sy = (img.height - sHeight) / 2;
    }
    
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
    
    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
    callback(compressedBase64);
  };
  img.onerror = () => {
    callback(base64String);
  };
  img.src = base64String;
};

interface HotelCardProps {
  hotel: Hotel;
  onClick: (hotel: Hotel) => void;
  onEdit?: (hotel: Hotel) => void;
  onDelete?: (hotel: Hotel) => void;
  isSelected?: boolean;
  onSelect?: (hotelId: string, checked: boolean) => void;
  photoUrl?: string;
  distance?: string;
  stars?: number;
  canEditInline?: boolean;
  onSaveMeta?: (photoUrl: string, distance: string) => Promise<void>;
}

export const HotelCard: React.FC<HotelCardProps> = ({ 
  hotel, 
  onClick, 
  onEdit, 
  onDelete, 
  isSelected = false, 
  onSelect,
  photoUrl,
  distance,
  stars,
  canEditInline = false,
  onSaveMeta
}) => {
  const displayStars = stars || hotel.stars;

  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState(photoUrl || '');
  const [editDistance, setEditDistance] = useState(distance || '');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setEditPhotoUrl(photoUrl || '');
    setImageError(false);
  }, [photoUrl]);

  useEffect(() => {
    setEditDistance(distance || '');
  }, [distance]);

  const handleSaveInline = async () => {
    if (onSaveMeta) {
      setIsSavingInline(true);
      try {
        const converted = convertGoogleDriveUrl(editPhotoUrl);
        await onSaveMeta(converted, editDistance);
        setIsEditingInline(false);
      } catch (err) {
        console.error("Gagal menyimpan metadata inline:", err);
      } finally {
        setIsSavingInline(false);
      }
    }
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      resizeAndCropImageToBase64(base64String, (resizedBase64) => {
        setEditPhotoUrl(resizedBase64);
      });
    };

    reader.onerror = () => {
      alert("Gagal membaca file gambar. Pastikan file yang Anda unggah adalah gambar yang valid.");
      e.target.value = '';
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden border transition-all duration-300 flex flex-col h-full relative ${
      isSelected ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg' : 'border-gray-100 hover:shadow-lg hover:border-gray-200'
    }`}>
      {/* Top action row */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(hotel.id, e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer shadow-sm bg-white"
          />
        )}
      </div>

      {canEditInline && !isEditingInline && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => {
              setIsEditingInline(true);
              setEditPhotoUrl(photoUrl || '');
              setEditDistance(distance || '');
            }}
            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-amber-600 shadow-md border border-gray-200 transition-colors"
            title="Edit Foto & Jarak Langsung"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isEditingInline ? (
        <div className="min-h-[14rem] bg-gray-50 border-b border-gray-100 p-4 flex flex-col justify-between space-y-2">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Edit Foto & Jarak
            </h4>
            
            {/* Input Foto URL & Upload */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Foto Gambar Hotel
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editPhotoUrl.startsWith('data:image/') ? '[Gambar Terunggah Langsung]' : editPhotoUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '[Gambar Terunggah Langsung]') {
                      setEditPhotoUrl(convertGoogleDriveUrl(val));
                    }
                  }}
                  placeholder="https://example.com/hotel.jpg atau Unggah"
                  className="flex-grow text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
                <label className="cursor-pointer shrink-0 inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-semibold px-2.5 py-1 rounded shadow-xs transition-colors">
                  <Upload className="w-3 h-3" />
                  Unggah
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLocalUpload}
                  />
                </label>
              </div>
              {editPhotoUrl && editPhotoUrl.startsWith('data:image/') && (
                <div className="flex items-center justify-between mt-1 bg-amber-100/50 px-2 py-1 rounded text-[10px] text-amber-700 font-medium border border-amber-200/50">
                  <span>✓ Berhasil diunggah langsung</span>
                  <button 
                    type="button" 
                    onClick={() => setEditPhotoUrl('')}
                    className="text-red-500 hover:text-red-700 underline font-bold"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>

            {/* Input Jarak */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Jarak ke Pelataran / Masjid
              </label>
              <input
                type="text"
                value={editDistance}
                onChange={(e) => setEditDistance(e.target.value)}
                placeholder="misal: 150m ke pelataran"
                className="w-full text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsEditingInline(false)}
              disabled={isSavingInline}
              className="px-2.5 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded font-semibold transition-colors shadow-xs"
            >
              Batal
            </button>
            <button
              onClick={handleSaveInline}
              disabled={isSavingInline}
              className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSavingInline ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      ) : convertGoogleDriveUrl(photoUrl) && !imageError ? (
        <div className="relative h-48 bg-gray-100 overflow-hidden group">
          <img 
            src={convertGoogleDriveUrl(photoUrl)} 
            alt={hotel.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex flex-col justify-end p-4 pt-10">
            <div className="flex justify-between items-start gap-2">
              <button 
                onClick={() => onClick(hotel)}
                className="text-xl font-bold truncate hover:text-amber-400 text-left w-full focus:outline-none transition-colors text-white"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
              >
                {hotel.name}
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {displayStars && (
                  <div className="flex items-center bg-amber-500 px-2 py-0.5 rounded-lg text-white font-bold text-xs shadow-md">
                    <Star className="w-3 h-3 text-white fill-white mr-1" />
                    <span>{displayStars}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-0.5 mt-2 text-white/95">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{hotel.city}</span>
                {distance && (
                  <span className="bg-amber-500/90 text-[10px] text-white px-1.5 py-0.5 rounded ml-1 font-bold">
                    {distance}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{hotel.vendor}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{hotel.mealPlan} Meal Plan</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black p-4 text-white pt-10">
          <div className="flex justify-between items-start gap-2">
            <button 
              onClick={() => onClick(hotel)}
              className="text-xl font-bold truncate hover:text-amber-400 text-left w-full focus:outline-none transition-colors"
            >
              {hotel.name}
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {displayStars && (
                <div className="flex items-center bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-1" />
                  <span className="text-xs font-bold text-amber-400">{displayStars}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span className="font-medium">
                {hotel.city}
                {distance && (
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded ml-2 font-bold border border-amber-500/30">
                    {distance}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Building className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{hotel.vendor}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Utensils className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{hotel.mealPlan} Meal Plan</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4 flex-grow overflow-auto">
        <div className="space-y-6">
          {hotel.seasons && hotel.seasons.map((season, idx) => (
            <div key={idx} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-2 mb-3 text-gray-700">
                <Calendar className="w-4 h-4 mt-1 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-wide">{season.range}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {season.prices && season.prices.map((price, pIdx) => (
                  <div key={pIdx} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100 hover:border-amber-200 transition-colors">
                    <div className="text-xs text-gray-500 uppercase mb-1 truncate" title={price.roomType}>
                      {price.roomType}
                    </div>
                    <div className="text-amber-700 font-bold text-lg">
                      {Math.round(price.price)}
                    </div>
                    <div className="text-[10px] text-gray-400">SAR</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 p-3 flex justify-between items-center border-t border-gray-100">
        <span className="text-xs text-gray-500">
          SAR • Subject to availability
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(hotel)}
              className="text-xs bg-white hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded text-gray-600 hover:text-amber-700 font-medium transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(hotel)}
              className="text-xs bg-red-50 hover:bg-red-100 border border-red-100 px-2 py-1 rounded text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
