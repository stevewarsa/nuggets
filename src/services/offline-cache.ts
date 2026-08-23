import { Passage } from '../models/passage';
import { bibleService } from './bible-service';

const DB_NAME = 'nuggets-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'passage-cache';
const LAST_VIEWED_STORE = 'last-viewed-queue';

interface LastViewedEntry {
    passageId: number;
    lastViewedNum: number;
    lastViewedStr: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE)) {
                db.createObjectStore(CACHE_STORE);
            }
            if (!db.objectStoreNames.contains(LAST_VIEWED_STORE)) {
                db.createObjectStore(LAST_VIEWED_STORE, { keyPath: 'passageId' });
            }
        };
    });

    return dbPromise;
};

const txGet = async <T,>(store: string, key: IDBValidKey): Promise<T | undefined> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readonly');
        const request = transaction.objectStore(store).get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as T | undefined);
    });
};

const txPut = async (store: string, key: IDBValidKey | undefined, value: any): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objStore = transaction.objectStore(store);
        if (key !== undefined) {
            objStore.put(value, key);
        } else {
            objStore.put(value);
        }
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });
};

const txGetAll = async <T,>(store: string): Promise<T[]> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readonly');
        const request = transaction.objectStore(store).getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as T[]);
    });
};

const txClear = async (store: string): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        transaction.objectStore(store).clear();
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });
};

const txDelete = async (store: string, key: IDBValidKey): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        transaction.objectStore(store).delete(key);
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });
};

export const offlineCache = {
    async downloadPassages(
        user: string,
        onProgress?: (current: number, total: number) => void
    ): Promise<{ count: number }> {
        const passages = await bibleService.getHydratedMemoryPassageList(user);

        const total = passages.length;
        for (let i = 0; i < passages.length; i++) {
            onProgress?.(i + 1, total);
        }

        await txPut(CACHE_STORE, 'passages', passages);
        await txPut(CACHE_STORE, 'metadata', {
            user,
            downloadedAt: new Date().toISOString(),
            count: passages.length,
        });

        return { count: passages.length };
    },

    async getPassages(): Promise<Passage[]> {
        return (await txGet<Passage[]>(CACHE_STORE, 'passages')) || [];
    },

    async getOverrides(): Promise<Passage[]> {
        return (await txGet<Passage[]>(CACHE_STORE, 'overrides')) || [];
    },

    async getMetadata(): Promise<{ user: string; downloadedAt: string; count: number } | undefined> {
        return txGet(CACHE_STORE, 'metadata');
    },

    async hasCache(): Promise<boolean> {
        const meta = await this.getMetadata();
        return !!meta;
    },

    async clearCache(): Promise<void> {
        await txClear(CACHE_STORE);
        await txClear(LAST_VIEWED_STORE);
    },

    async queueLastViewed(passageId: number, lastViewedNum: number, lastViewedStr: string): Promise<void> {
        await txPut(LAST_VIEWED_STORE, undefined, { passageId, lastViewedNum, lastViewedStr });
    },

    async getQueuedLastViewed(): Promise<LastViewedEntry[]> {
        return txGetAll<LastViewedEntry>(LAST_VIEWED_STORE);
    },

    async clearLastViewedQueue(): Promise<void> {
        await txClear(LAST_VIEWED_STORE);
    },

    async syncLastViewedQueue(user: string): Promise<{ synced: number; failed: number }> {
        const queue = await this.getQueuedLastViewed();
        let synced = 0;
        let failed = 0;

        for (const entry of queue) {
            try {
                await bibleService.updateLastViewed(
                    user,
                    entry.passageId,
                    entry.lastViewedNum,
                    entry.lastViewedStr
                );
                synced++;
            } catch {
                failed++;
            }
        }

        if (failed === 0) {
            await this.clearLastViewedQueue();
        } else {
            for (const entry of queue) {
                try {
                    await bibleService.updateLastViewed(
                        user,
                        entry.passageId,
                        entry.lastViewedNum,
                        entry.lastViewedStr
                    );
                    await txDelete(LAST_VIEWED_STORE, entry.passageId);
                } catch {
                    break;
                }
            }
        }

        return { synced, failed };
    },

    async getQueuedCount(): Promise<number> {
        const queue = await this.getQueuedLastViewed();
        return queue.length;
    },
};