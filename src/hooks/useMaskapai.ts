import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDocs, writeBatch, db, handleFirestoreError, OperationType } from '../firebase';
import { Maskapai, maskapaiData as initialData } from '../data/maskapai';

export const useMaskapai = () => {
  const [maskapai, setMaskapai] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = collection(db, 'maskapai');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteIds = new Set(snapshot.docs.map(doc => doc.id));
      const data = [
        ...snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Maskapai[],
        ...initialData.filter(item => !remoteIds.has(item.id))
      ];
      
      // Filter out expired flights (departure/return past, 0 seats, or stale for >= 3 days)
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().getTime();

      const activeFlights = data.filter(flight => {
        const isPast = Boolean(
          (flight.tanggalKeberangkatan && flight.tanggalKeberangkatan < today) ||
          (flight.tanggalKepulangan && flight.tanggalKepulangan < today)
        );
        if (isPast) return false;

        // Filter out empty seats
        if (flight.availableSeats !== undefined && flight.availableSeats <= 0) {
          return false;
        }

        // Filter out items without update or not updated for 3+ days
        if (flight.updatedAt) {
          try {
            const updatedDate = new Date(flight.updatedAt);
            if (!isNaN(updatedDate.getTime())) {
              const diffTime = now - updatedDate.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              if (diffDays >= 3) return false; // Expired: >= 3 days without vendor update
            } else {
              return false;
            }
          } catch (e) {
            console.error(e);
            return false;
          }
        } else {
          return false; // Belum pernah diupdate / stale
        }

        return true;
      });
      
      setMaskapai(activeFlights);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching maskapai:', err);
      setError(err.message);
      setLoading(false);
      
      // Fallback to initial data if Firestore fails or is empty
      if (maskapai.length === 0) {
        setMaskapai(initialData);
      }
      handleFirestoreError(err, OperationType.GET, 'maskapai');
    });

    return () => unsubscribe();
  }, []);

  const decrementSeat = async (maskapaiId: string, count: number) => {
    try {
      const maskapaiRef = doc(db, 'maskapai', maskapaiId);
      const target = maskapai.find(m => m.id === maskapaiId);
      if (!target) throw new Error('Maskapai not found');
      
      if (target.availableSeats < count) {
        throw new Error('Not enough seats available');
      }

      await updateDoc(maskapaiRef, {
        availableSeats: target.availableSeats - count,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'maskapai');
      throw err;
    }
  };

  const seedData = async () => {
    try {
      const q = collection(db, 'maskapai');
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        const batch = writeBatch(db);
        initialData.forEach((item) => {
          const docRef = doc(collection(db, 'maskapai'), item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
        console.log('Data seeded successfully');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'maskapai');
    }
  };

  return { maskapai, loading, error, decrementSeat, seedData };
};
