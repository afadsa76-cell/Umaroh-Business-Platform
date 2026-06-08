import { db, collection, doc, setDoc, updateDoc, onSnapshot, handleFirestoreError, OperationType, auth, query, where } from '../firebase';
import { AppNotification } from '../types';

/**
 * Sends a real-time persistent notification to Firestore
 */
export async function sendNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }
): Promise<string> {
  const finalId = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const payload: AppNotification = {
    id: finalId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    targetId: notification.targetId || '',
    targetRole: notification.targetRole,
    read: false,
    createdAt: new Date().toISOString(),
    senderId: notification.senderId || auth.currentUser?.uid || 'system',
  };

  try {
    await setDoc(doc(db, 'notifications', finalId), payload);
    return finalId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${finalId}`);
    return '';
  }
}

/**
 * Marks a specific notification as Read in Firestore
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notificationId}`);
  }
}

/**
 * Marks all notifications matching user boundaries as read
 */
export async function markAllNotificationsAsRead(notifications: AppNotification[]): Promise<void> {
  for (const notif of notifications) {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
  }
}

/**
 * Listens to notifications in real-time using secure, specific queries that satisfy Firestore permission rules
 */
export function listenToUserNotifications(
  userId: string,
  userRole: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const collRef = collection(db, 'notifications');

  // Build target queries matching corresponding allowance rules
  const queriesList = [
    query(collRef, where('targetId', '==', userId)),
    query(collRef, where('targetRole', '==', 'all')),
    query(collRef, where('targetRole', '==', 'broadcast'))
  ];

  if (userRole && userRole !== '') {
    queriesList.push(query(collRef, where('targetRole', '==', userRole)));
  }

  // Support cross-role operations for operations and administrative levels
  if (userRole === 'admin' || userRole === 'operasional') {
    const fallbackRole = userRole === 'admin' ? 'operasional' : 'admin';
    queriesList.push(query(collRef, where('targetRole', '==', fallbackRole)));
  }

  const resultsMap = new Map<number, AppNotification[]>();
  const unsubscribes: (() => void)[] = [];

  const publishMergedResults = () => {
    const mergedMap = new Map<string, AppNotification>();
    resultsMap.forEach((notifArray) => {
      notifArray.forEach((notif) => {
        mergedMap.set(notif.id, notif);
      });
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(mergedList);
  };

  queriesList.forEach((q, index) => {
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const notifs: AppNotification[] = [];
        snapshot.forEach((doc) => {
          notifs.push(doc.data() as AppNotification);
        });
        resultsMap.set(index, notifs);
        publishMergedResults();
      },
      (error) => {
        // Prevent total failure if one specific sub-query fails permissions (e.g. guest, stale roles)
        console.warn(`Firestore read query ${index} status:`, error);
        resultsMap.set(index, []);
        publishMergedResults();
      }
    );
    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
