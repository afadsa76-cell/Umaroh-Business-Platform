import React, { useState, useMemo } from 'react';
import { JamaahTracker } from './types';
import { updateDoc, doc, db } from '../../firebase';
import { Users, BedDouble, Bed, Save, User, Plus, X, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

interface Props {
  paketId: string;
  jamaahs: JamaahTracker[];
}

type RoomType = 'Quad' | 'Triple' | 'Double';

interface Room {
  roomNumber: string;
  roomType: RoomType;
  occupants: JamaahTracker[];
}

export const RoomingList: React.FC<Props> = ({ paketId, jamaahs }) => {
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomType, setNewRoomType] = useState<RoomType>('Quad');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const rooms = useMemo(() => {
    const roomMap = new Map<string, Room>();
    
    jamaahs.forEach(j => {
      if (j.roomNumber && j.roomType) {
        if (!roomMap.has(j.roomNumber)) {
          roomMap.set(j.roomNumber, {
            roomNumber: j.roomNumber,
            roomType: j.roomType,
            occupants: []
          });
        }
        roomMap.get(j.roomNumber)!.occupants.push(j);
      }
    });
    
    return Array.from(roomMap.values());
  }, [jamaahs]);

  const unassignedJamaahs = useMemo(() => {
    return jamaahs.filter(j => !j.roomNumber);
  }, [jamaahs]);

  const getRoomCapacity = (type: RoomType) => {
    switch (type) {
      case 'Quad': return 4;
      case 'Triple': return 3;
      case 'Double': return 2;
      default: return 0;
    }
  };

  const handleCreateRoom = () => {
    if (!newRoomNumber.trim()) return;
    // We don't actually save empty rooms to Firestore because rooms are derived from Jamaah data.
    // To create an empty room, we can just set it in local state, but it's better to immediately assign someone.
    // For simplicity, let's just open the assignment modal for this new room.
    setSelectedRoom(newRoomNumber);
    setIsAddingRoom(false);
  };

  const handleAssignJamaah = async (jamaahId: string, roomNumber: string, roomType: RoomType) => {
    try {
      await updateDoc(doc(db, 'tracker_jamaah', jamaahId), {
        roomNumber,
        roomType
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tracker_jamaah');
    }
  };

  const handleRemoveFromRoom = async (jamaahId: string) => {
    try {
      await updateDoc(doc(db, 'tracker_jamaah', jamaahId), {
        roomNumber: null,
        roomType: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tracker_jamaah');
    }
  };

  const renderRoomIcon = (type: RoomType) => {
    switch (type) {
      case 'Quad': return <Users className="w-5 h-5 text-blue-600" />;
      case 'Triple': return <Users className="w-5 h-5 text-emerald-600" />;
      case 'Double': return <BedDouble className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Bed className="w-5 h-5 text-indigo-600" />
          Rooming List (Pembagian Kamar)
        </h3>
        <button
          onClick={() => setIsAddingRoom(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Buat Kamar
        </button>
      </div>

      <div className="p-6">
        {/* Unassigned Jamaah Alert */}
        {unassignedJamaahs.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Ada {unassignedJamaahs.length} Jamaah Belum Dapat Kamar</h4>
              <p className="text-sm text-amber-700 mt-1">
                Pastikan semua jamaah telah dialokasikan ke kamar yang sesuai dengan paket mereka.
              </p>
            </div>
          </div>
        )}

        {/* Room Creation Form */}
        {isAddingRoom && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor/Nama Kamar</label>
              <input
                type="text"
                placeholder="Misal: 101, 102A, Keluarga Budi"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kamar</label>
              <select
                value={newRoomType}
                onChange={(e) => setNewRoomType(e.target.value as RoomType)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Quad">Quad (4 Pax)</option>
                <option value="Triple">Triple (3 Pax)</option>
                <option value="Double">Double (2 Pax)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Buat
              </button>
              <button
                onClick={() => setIsAddingRoom(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Render existing rooms */}
          {rooms.map(room => {
            const capacity = getRoomCapacity(room.roomType);
            const isFull = room.occupants.length >= capacity;
            
            return (
              <div key={room.roomNumber} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {renderRoomIcon(room.roomType)}
                    <span className="font-semibold text-gray-800">Kamar {room.roomNumber}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${isFull ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {room.roomType} ({room.occupants.length}/{capacity})
                  </span>
                </div>
                
                <div className="p-3 space-y-2">
                  {room.occupants.map(occ => (
                    <div key={occ.id} className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{occ.namaLengkap}</p>
                          <p className="text-xs text-gray-500">{occ.jenisKelamin === 'L' ? 'Laki-laki' : occ.jenisKelamin === 'P' ? 'Perempuan' : '-'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromRoom(occ.id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                        title="Keluarkan dari kamar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {!isFull && Array.from({ length: capacity - room.occupants.length }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="flex justify-center items-center bg-gray-50 border border-dashed border-gray-300 p-3 rounded-lg">
                      <button
                        onClick={() => setSelectedRoom(room.roomNumber)}
                        className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Tambah Jamaah
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Render newly created empty room if any */}
          {selectedRoom && !rooms.find(r => r.roomNumber === selectedRoom) && (
            <div className="border border-indigo-200 rounded-xl overflow-hidden ring-2 ring-indigo-500/20">
              <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {renderRoomIcon(newRoomType)}
                  <span className="font-semibold text-indigo-900">Kamar {selectedRoom}</span>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  {newRoomType} (0/{getRoomCapacity(newRoomType)})
                </span>
              </div>
              <div className="p-3 space-y-2">
                {Array.from({ length: getRoomCapacity(newRoomType) }).map((_, idx) => (
                  <div key={`empty-new-${idx}`} className="flex justify-center items-center bg-gray-50 border border-dashed border-gray-300 p-3 rounded-lg">
                    <button
                      onClick={() => setSelectedRoom(selectedRoom)}
                      className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Tambah Jamaah
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Pilih Jamaah untuk Kamar {selectedRoom}</h3>
              <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {unassignedJamaahs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Semua jamaah sudah mendapatkan kamar.
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedJamaahs.map(j => (
                    <div key={j.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{j.namaLengkap}</p>
                        <p className="text-xs text-gray-500">
                          {j.jenisKelamin === 'L' ? 'Laki-laki' : j.jenisKelamin === 'P' ? 'Perempuan' : 'Gender belum diatur'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const roomType = rooms.find(r => r.roomNumber === selectedRoom)?.roomType || newRoomType;
                          handleAssignJamaah(j.id, selectedRoom, roomType);
                          setSelectedRoom(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                      >
                        Pilih
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
