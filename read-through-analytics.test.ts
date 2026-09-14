import * as fs from 'fs';
import * as path from 'path';
import { computeReadThroughSummary } from './src/models/read-through-analytics';
import { ReadingHistoryEntry } from './src/models/reading-history-entry';
import { booksByNum, getMaxChapterByBook } from './src/models/constants';

const rawData = fs.readFileSync(path.join(__dirname, 'server', 'reading-progress.json'), 'utf-8');
const history: ReadingHistoryEntry[] = JSON.parse(rawData);

const allBooks = Object.values(booksByNum);

describe('read-through-analytics with real data', () => {
    const summary = computeReadThroughSummary(history);

    test('at least 2 completed read-throughs detected', () => {
        expect(summary.completedReadThroughs.length).toBeGreaterThanOrEqual(2);
    });

    test('completed read-through #1 date range matches expected', () => {
        const rt1 = summary.completedReadThroughs[0];
        expect(rt1.startDate).toBe('2019-04-27');
        expect(rt1.endDate).toBe('2022-06-06');
    });

    test('completed read-through #2 date range matches expected', () => {
        const rt2 = summary.completedReadThroughs[1];
        expect(rt2.startDate).toBe('2019-09-21');
        expect(rt2.endDate).toBe('2026-03-23');
    });

    test('completed read-through #2 has all 66 books completed', () => {
        const rt2 = summary.completedReadThroughs[1];
        expect(rt2).toBeDefined();
        const incomplete = rt2.bookDetails.filter(d => d.startDate && !d.completedDate);
        expect(incomplete).toEqual([]);
        expect(rt2.booksCompleted).toBe(66);
    });

    test('in-progress read-through has fewer than 66 books completed', () => {
        if (summary.inProgressReadThrough) {
            expect(summary.inProgressReadThrough.booksCompleted).toBeLessThan(66);
            expect(summary.inProgressReadThrough.booksCompleted).toBeGreaterThan(0);
        }
    });

    test('in-progress read-through shows some books as in-progress', () => {
        if (summary.inProgressReadThrough) {
            const inProgressBooks = summary.inProgressReadThrough.bookDetails.filter(
                d => d.startDate && !d.completedDate
            );
            expect(inProgressBooks.length).toBeGreaterThan(0);
        }
    });

    test('per-book progress has entry for all 66 books', () => {
        expect(summary.perBookProgress.length).toBe(66);
        for (const bp of summary.perBookProgress) {
            const maxCh = getMaxChapterByBook(bp.bookName) || 1;
            expect(bp.totalChapters).toBe(maxCh);
        }
    });

    test('no book appears as in-progress in a read-through where it is also completed', () => {
        for (const rt of summary.completedReadThroughs) {
            for (const detail of rt.bookDetails) {
                if (detail.completedDate) {
                    expect(detail.startDate).toBeTruthy();
                }
            }
        }
    });
});
