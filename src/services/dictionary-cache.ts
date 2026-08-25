// Dictionary cache for Bible Search autocomplete.
// Stores word lists in IndexedDB, bucketed by translation code and section.
// Provides fast prefix-based suggestions via binary search on sorted arrays.

import { bibleService } from './bible-service';

const DB_NAME = 'bible-dictionary';
const DB_VERSION = 1;
const STORE_NAME = 'dictionary';

// Dictionary shape: { [translationCode]: { [section]: string[] } }
export type Dictionary = Record<string, Record<string, string[]>>;

type Section = 'both' | 'new' | 'old' | 'gospels' | 'pauls_letters' | 'non_pauline_letters';

let dbPromise: Promise<IDBDatabase> | null = null;
let inMemoryCache: Dictionary | null = null;
let downloadPromise: Promise<void> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });

    return dbPromise;
};

const txGet = async <T>(key: IDBValidKey): Promise<T | undefined> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result as T | undefined);
    });
};

const txPut = async (key: IDBValidKey, value: unknown): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => resolve();
    });
};

const loadIntoMemory = async (): Promise<Dictionary | null> => {
    if (inMemoryCache) return inMemoryCache;
    const data = await txGet<Dictionary>('data');
    if (data) {
        inMemoryCache = data;
        return data;
    }
    return null;
};

export const dictionaryCache = {
    async hasDictionary(): Promise<boolean> {
        const data = await loadIntoMemory();
        return !!data && Object.keys(data).length > 0;
    },

    async download(): Promise<void> {
        if (downloadPromise) return downloadPromise;

        downloadPromise = (async () => {
            const data = await bibleService.getDictionary();

            inMemoryCache = data;
            await txPut('data', data);
        })();

        try {
            await downloadPromise;
        } finally {
            downloadPromise = null;
        }
    },

    // Returns a promise that resolves when the dictionary is ready.
    // If a download is already in progress, awaits that promise.
    // If no download is in progress and the dictionary is missing, starts one.
    async ensureReady(): Promise<void> {
        if (inMemoryCache) return;

        if (downloadPromise) {
            await downloadPromise;
            return;
        }

        const data = await loadIntoMemory();
        if (data) return;

        await this.download();
    },

    // Returns up to `maxResults` words that start with `prefix`, scoped by
    // translation and section. If translation is 'all', merges all translations.
    // Returns an empty array if the dictionary is not loaded yet.
    getSuggestions(
        prefix: string,
        translation: string,
        section: string,
        maxResults: number = 10
    ): string[] {
        if (!inMemoryCache || prefix.length < 2 || prefix.includes('*')) {
            return [];
        }

        const prefixLower = prefix.toLowerCase();
        const sectionKey = (section || 'both') as Section;

        let words: string[];

        if (translation === 'all') {
            // Merge words from all translations for this section, then dedupe and sort
            const merged = new Set<string>();
            for (const transCode of Object.keys(inMemoryCache)) {
                const sectionWords = inMemoryCache[transCode]?.[sectionKey];
                if (sectionWords) {
                    for (const w of sectionWords) {
                        merged.add(w);
                    }
                }
            }
            words = Array.from(merged).sort();
        } else {
            words = inMemoryCache[translation]?.[sectionKey] ?? [];
        }

        return binarySearchPrefix(words, prefixLower, maxResults);
    },
};

// Binary search to find the first index where word >= prefix, then scan forward
// collecting words that start with the prefix. Returns at most maxResults matches.
const binarySearchPrefix = (
    sortedWords: string[],
    prefix: string,
    maxResults: number
): string[] => {
    if (sortedWords.length === 0) return [];

    let lo = 0;
    let hi = sortedWords.length - 1;

    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (sortedWords[mid] < prefix) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    const results: string[] = [];
    for (let i = lo; i < sortedWords.length && results.length < maxResults; i++) {
        if (sortedWords[i].startsWith(prefix)) {
            results.push(sortedWords[i]);
        } else {
            break;
        }
    }

    return results;
};
