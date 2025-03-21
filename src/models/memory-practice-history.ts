export interface MemoryPracticeHistoryEntry {
    passageId: number;
    dateViewedStr: string;
    dateViewedLong: number;
}

export interface GroupedHistoryEntry {
    date: string;
    count: number;
    entries: MemoryPracticeHistoryEntry[];
}