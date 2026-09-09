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

interface StreamWrap {
    date: string;
    cycleNumber: number;
}

function chronologicalKey(entry: ReadingHistoryEntry): number {
    return new Date(entry.dateRead).getTime();
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

    const dayEntries = history
        .filter(e => e.dayOfWeek === day)
        .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));

    const bookEntries = dayEntries.filter(e => e.bookName === bookName);

    if (bookEntries.length === 0) {
        return { bookName, currentChapter: 0, totalChapters: maxChapter, completedInCurrentCycle: false, cyclesCompleted: 0 };
    }

    const lastEntry = bookEntries[bookEntries.length - 1];
    const currentChapter = lastEntry.chapter;

    const streamWraps = streamWrapsByDay[day] || [];
    const lastStreamWrap = streamWraps.length > 0 ? streamWraps[streamWraps.length - 1] : null;
    const lastWrapTime = lastStreamWrap ? new Date(lastStreamWrap.date).getTime() : 0;

    let cyclesCompleted = 0;
    for (const entry of bookEntries) {
        if (entry.chapter === maxChapter) {
            cyclesCompleted++;
        }
    }

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

function buildCompletedBookCycleDetails(
    cycleNumber: number,
    history: ReadingHistoryEntry[],
    streamWrapsByDay: { [day: string]: StreamWrap[] }
): BookCycleDetail[] {
    const allBooks = Object.values(booksByNum);
    const details: BookCycleDetail[] = [];

    for (const bookName of allBooks) {
        const day = DAY_ORDER.find(d => booksByDay[d].includes(bookName));
        if (!day) continue;

        const maxChapter = getMaxChapterByBook(bookName) || 1;
        const wraps = streamWrapsByDay[day];

        const cycleStartWrap = cycleNumber > 1 ? wraps.find(w => w.cycleNumber === cycleNumber - 1) : null;
        const cycleEndWrap = wraps.find(w => w.cycleNumber === cycleNumber);

        const windowStart = cycleStartWrap ? new Date(cycleStartWrap.date).getTime() : 0;
        const windowEnd = cycleEndWrap ? new Date(cycleEndWrap.date).getTime() : Infinity;

        const entries = history
            .filter(e => e.dayOfWeek === day && e.bookName === bookName)
            .filter(e => {
                const t = new Date(e.dateRead).getTime();
                return t >= windowStart && t < windowEnd;
            })
            .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));

        if (entries.length === 0) {
            details.push({ bookName, startDate: '', completedDate: null });
        } else {
            const startDate = entries[0].dateRead;
            const maxEntry = entries.find(e => e.chapter === maxChapter);
            const completedDate = maxEntry ? maxEntry.dateRead : null;
            details.push({ bookName, startDate, completedDate });
        }
    }

    return details;
}

function buildInProgressBookCycleDetails(
    history: ReadingHistoryEntry[],
    streamWrapsByDay: { [day: string]: StreamWrap[] }
): BookCycleDetail[] {
    const allBooks = Object.values(booksByNum);
    const details: BookCycleDetail[] = [];

    for (const bookName of allBooks) {
        const day = DAY_ORDER.find(d => booksByDay[d].includes(bookName));
        if (!day) continue;

        const maxChapter = getMaxChapterByBook(bookName) || 1;
        const wraps = streamWrapsByDay[day];

        const lastWrap = wraps.length > 0 ? wraps[wraps.length - 1] : null;
        const windowStart = lastWrap ? new Date(lastWrap.date).getTime() : 0;

        const entries = history
            .filter(e => e.dayOfWeek === day && e.bookName === bookName)
            .filter(e => new Date(e.dateRead).getTime() >= windowStart)
            .sort((a, b) => chronologicalKey(a) - chronologicalKey(b));

        if (entries.length === 0) {
            details.push({ bookName, startDate: '', completedDate: null });
        } else {
            const startDate = entries[0].dateRead;
            const maxEntry = entries.find(e => e.chapter === maxChapter);
            const completedDate = maxEntry ? maxEntry.dateRead : null;
            details.push({ bookName, startDate, completedDate });
        }
    }

    return details;
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
        const endDateCandidates: string[] = [];
        const startDateCandidates: string[] = [];

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

            const bookDetails = buildCompletedBookCycleDetails(k, history, streamWrapsByDay);

            completed.push({
                readThroughNumber: k,
                startDate,
                endDate,
                booksCompleted: 66,
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

        const inProgressDetails = buildInProgressBookCycleDetails(history, streamWrapsByDay);

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
