// src/updateOnlineStatus.ts
import { User } from './models/User';

// 30 saniyelik eşik (ms)
const OFFLINE_THRESHOLD = 30 * 1000;

export function startOfflineUpdater() {
    setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD);
            // lastSeen < cutoff && isOnline === true olanları false yap
            await User.updateMany(
                { lastSeen: { $lt: cutoff }, isOnline: true },
                { isOnline: false }
            );
        } catch (err) {
            console.error('❌ updateOnlineStatus hata:', err);
        }
    }, OFFLINE_THRESHOLD);
}
