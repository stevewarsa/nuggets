import { ReadingHistoryEntry } from './reading-history-entry';
import { booksByDay, booksByNum, getMaxChapterByBook } from './constants';

export interface BookCycleDetail {
    bookName: string;
    startDate: string;
    completedDate: string | null;
}

export interface BookProgress {
    bookName: string;
    currentChapter: number;
    totalChapters: number;
    completedInCurrentCycle: boolean;
    cyclesCompleted: number;
}

export interface ReadThrough {
    readThroughNumber: number;
    startDate: string;
    endDate: string | null;
    booksCompleted: number;
    totalBooks: number;
    bookDetails: BookCycleDetail[];
}

export interface ReadThroughSummary {
    completedReadThroughs: ReadThrough[];
    inProgressReadThrough: ReadThrough | null;
    perBookProgress: BookProgress[];
}

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function chronologicalKey(entry: ReadingHistoryEntry): number {
    return new Date(entry.dateRead).getTime();
}

interface StreamWrap {
    date: string;
    cycleNumber: number;
}

function detectStreamWraps(
    day: string,
    history: ReadingHistoryEntry[]
): StreamWrap[] {
    const booksInDay = booksByDay[day];
    const entries = history
        .filter(e => e.dayOfWeek === day)
        .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));

    const wraps: StreamWrap[] = [];
    let cycleNumber = 0;

    for (let i = 1; i < entries.length; i++) {
        const prevIdx = booksInDay.indexOf(entries[i - 1].bookName);
        const currIdx = booksInDay.indexOf(entries[i].bookName);

        if (currIdx < prevIdx) {
            cycleNumber++;
            wraps.push({ date: entries[i].dateRead, cycleNumber });
        }
    }

    if (booksInDay.length === 1) {
        const maxChapter = getMaxChapterByBook(booksInDay[0]) || 1;
        for (let i = 1; i < entries.length; i++) {
            if (entries[i].chapter === 1 && entries[i - 1].chapter === maxChapter) {
                cycleNumber++;
                wraps.push({ date: entries[i].dateRead, cycleNumber });
            }
        }
    }

    return wraps;
}

function buildBookProgress(
    bookName: string,
    history: ReadingHistoryEntry[],
    streamWrapsByDay: { [day: string]: StreamWrap[] }
): BookProgress {
    const day = DAY_ORDER.find(d => booksByDay[d].includes(bookName));
    if (!day) {
        return { bookName, currentChapter: 0, totalChapters: 0, completedInCurrentCycle: false, cyclesCompleted: 0 };
    }

    const maxChapter = getMaxChapterByBook(bookName) || 1;

    const bookEntries = history
        .filter(e => e.dayOfWeek === day && e.bookName === bookName)
        .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));

    if (bookEntries.length === 0) {
        return { bookName, currentChapter: 0, totalChapters: maxChapter, completedInCurrentCycle: false, cyclesCompleted: 0 };
    }

    const lastEntry = bookEntries[bookEntries.length - 1];
    const currentChapter = lastEntry.chapter;

    let cyclesCompleted = 0;
    for (const entry of bookEntries) {
        if (entry.chapter === maxChapter) {
            cyclesCompleted++;
        }
    }

    const streamWraps = streamWrapsByDay[day] || [];
    const lastStreamWrap = streamWraps.length > 0 ? streamWraps[streamWraps.length - 1] : null;
    const lastWrapTime = lastStreamWrap ? new Date(lastStreamWrap.date).getTime() : 0;

    const completedInCurrentCycle = bookEntries.some(
        e => new Date(e.dateRead).getTime() >= lastWrapTime && e.chapter === maxChapter
    );

    if (completedInCurrentCycle) {
        cyclesCompleted = Math.max(0, cyclesCompleted - 1);
    }

    return {
        bookName,
        currentChapter,
        totalChapters: maxChapter,
        completedInCurrentCycle,
        cyclesCompleted,
    };
}

function buildBookDetailForCycle(
    bookName: string,
    windowStart: number,
    windowEnd: number,
    history: ReadingHistoryEntry[]
): BookCycleDetail {
    const day = DAY_ORDER.find(d => booksByDay[d].includes(bookName));
    if (!day) return { bookName, startDate: '', completedDate: null };

    const maxChapter = getMaxChapterByBook(bookName) || 1;

    const entries = history
        .filter(e => e.dayOfWeek === day && e.bookName === bookName)
        .filter(e => {
            const t = new Date(e.dateRead).getTime();
            return t >= windowStart && t <= windowEnd;
        })
        .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));

    if (entries.length === 0) {
        return { bookName, startDate: '', completedDate: null };
    }

    const startDate = entries[0].dateRead;
    const maxEntry = entries.find(e => e.chapter === maxChapter);
    const completedDate = maxEntry ? maxEntry.dateRead : null;

    return { bookName, startDate, completedDate };
}

export function computeReadThroughSummary(
    history: ReadingHistoryEntry[]
): ReadThroughSummary {
    const allBooks = Object.values(booksByNum);

    const streamWrapsByDay: { [day: string]: StreamWrap[] } = {};
    for (const day of DAY_ORDER) {
        streamWrapsByDay[day] = detectStreamWraps(day, history);
    }

    const wrapCounts = DAY_ORDER.map(day => streamWrapsByDay[day].length);
    const completedReadThroughCount = Math.min(...wrapCounts);

    const completed: ReadThrough[] = [];

    for (let k = 1; k <= completedReadThroughCount; k++) {
        const startDateCandidates: string[] = [];
        const endDateCandidates: string[] = [];

        for (const day of DAY_ORDER) {
            const wraps = streamWrapsByDay[day];
            const endWrap = wraps.find(w => w.cycleNumber === k);
            if (!endWrap) continue;
            endDateCandidates.push(endWrap.date);

            if (k === 1) {
                const dayEntries = history
                    .filter(e => e.dayOfWeek === day)
                    .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));
                if (dayEntries.length > 0) {
                    startDateCandidates.push(dayEntries[0].dateRead);
                }
            } else {
                const startWrap = wraps.find(w => w.cycleNumber === k - 1);
                if (startWrap) {
                    startDateCandidates.push(startWrap.date);
                }
            }
        }

        if (endDateCandidates.length === DAY_ORDER.length) {
            const startDate = startDateCandidates.reduce((min, d) =>
                new Date(d).getTime() < new Date(min).getTime() ? d : min
            );
            const endDate = endDateCandidates.reduce((max, d) =>
                new Date(d).getTime() > new Date(max).getTime() ? d : max
            );

            const windowStart = new Date(startDate).getTime();
            const windowEnd = new Date(endDate).getTime();

            const bookDetails = allBooks.map(bookName =>
                buildBookDetailForCycle(bookName, windowStart, windowEnd, history)
            );

            const booksCompleted = bookDetails.filter(d => d.completedDate).length;

            completed.push({
                readThroughNumber: k,
                startDate,
                endDate,
                booksCompleted,
                totalBooks: 66,
                bookDetails,
            });
        }
    }

    const perBookProgress = allBooks.map(bookName =>
        buildBookProgress(bookName, history, streamWrapsByDay)
    );

    const inProgressNumber = completedReadThroughCount + 1;
    let inProgress: ReadThrough | null = null;

    const inProgressStartDates: string[] = [];
    for (const day of DAY_ORDER) {
        const wraps = streamWrapsByDay[day];
        const startWrap = wraps.find(w => w.cycleNumber === completedReadThroughCount);
        if (startWrap) {
            inProgressStartDates.push(startWrap.date);
        } else {
            const dayEntries = history
                .filter(e => e.dayOfWeek === day)
                .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));
            if (dayEntries.length > 0) {
                inProgressStartDates.push(dayEntries[0].dateRead);
            }
        }
    }

    const inProgressStartDate = inProgressStartDates.length > 0
        ? inProgressStartDates.reduce((min, d) =>
            new Date(d).getTime() < new Date(min).getTime() ? d : min
        )
        : null;

    if (inProgressStartDate) {
        const booksCompletedCurrentCycle = perBookProgress.filter(bp => bp.completedInCurrentCycle).length;

        const lastWrapDates: string[] = [];
        for (const day of DAY_ORDER) {
            const wraps = streamWrapsByDay[day];
            if (wraps.length > 0) {
                lastWrapDates.push(wraps[wraps.length - 1].date);
            }
        }

        const inProgressWindowStart = lastWrapDates.length > 0
            ? Math.min(...lastWrapDates.map(d => new Date(d).getTime()))
            : 0;
        const now = Date.now();

        const inProgressDetails = allBooks.map(bookName =>
            buildBookDetailForCycle(bookName, inProgressWindowStart, now, history)
        );

        inProgress = {
            readThroughNumber: inProgressNumber,
            startDate: inProgressStartDate,
            endDate: null,
            booksCompleted: booksCompletedCurrentCycle,
            totalBooks: 66,
            bookDetails: inProgressDetails,
        };
    }

    return {
        completedReadThroughs: completed,
        inProgressReadThrough: inProgress,
        perBookProgress,
    };
}
