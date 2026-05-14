import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { TrackingGroup } from './types';
import { collection, onSnapshot, query, where, doc, updateDoc, db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  paketId: string;
}

export const MapTracking: React.FC<Props> = ({ paketId }) => {
  const [groups, setGroups] = useState<TrackingGroup[]>([]);

  useEffect(() => {
    if (!paketId) return;
    const q = query(collection(db, 'tracking_group'), where('paket_id', '==', paketId));
    const unsub = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackingGroup)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracking_group');
    });
    return () => unsub();
  }, [paketId]);

  // Default center (Mecca)
  const defaultCenter: [number, number] = [21.4225, 39.8262];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-semibold mb-4">Live Tracking Rombongan</h3>
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200 relative z-0">
        <MapContainer center={defaultCenter} zoom={3} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {groups.map(group => {
            if (!group.last_location) return null;
            return (
              <Marker key={group.id} position={[group.last_location.lat, group.last_location.lng]}>
                <Popup>
                  <div className="font-semibold">{group.nama_group}</div>
                  <div className="text-sm text-gray-600">Status: {group.status}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Update: {new Date(group.last_location.updated_at).toLocaleString('id-ID')}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      
      {/* Petugas Tracking Control (Simulasi) */}
      <PetugasTracker paketId={paketId} />
    </div>
  );
};

const PetugasTracker: React.FC<{ paketId: string }> = ({ paketId }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [groupId, setGroupId] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && groupId) {
      interval = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              await updateDoc(doc(db, 'tracking_group', groupId), {
                last_location: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  updated_at: new Date().toISOString()
                }
              });
              console.log('Location updated');
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'tracking_group');
            }
          });
        }
      }, 10000); // Update every 10s
    }
    return () => clearInterval(interval);
  }, [isTracking, groupId]);

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium mb-2">Simulasi Petugas (Update Lokasi)</h4>
      <div className="flex flex-wrap gap-2 items-center">
        <input 
          type="text" 
          placeholder="Group ID (dari DB)" 
          className="p-2 border rounded text-sm w-full md:w-auto"
          value={groupId}
          onChange={e => setGroupId(e.target.value)}
          disabled={isTracking}
        />
        <button 
          onClick={() => setIsTracking(!isTracking)}
          className={`px-4 py-2 rounded text-sm font-medium text-white ${isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
          disabled={!groupId}
        >
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Masukkan ID Group dari database untuk mensimulasikan update lokasi realtime setiap 10 detik.</p>
    </div>
  );
};
