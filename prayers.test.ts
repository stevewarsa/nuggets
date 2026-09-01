import {
    getPrayerIdsSortedByLeastRecentPrayerDate,
    sortPrayersForDisplay,
    updateLastPracticedDate,
} from './src/models/passage-utils';
import { Prayer, PrayerSession } from './src/models/prayer';

const makePrayer = (id: number, daily: boolean, date: string): Prayer =>
    ({
        prayerId: id,
        userId: 's',
        prayerTitleTx: `prayer-${id}`,
        prayerDetailsTx: '',
        prayerSubjectPersonName: '',
        archiveFl: 'N',
        prayerPriorityCd: daily ? 'daily' : 'other',
        mostRecentPrayerDate: date,
    } as Prayer);

test('Tests The sorting of the prayer list by session dateTime', () => {
    let sessions: PrayerSession[] = [
        { sessionId: 3, prayerId: 1, dateTime: '2025-07-21' } as PrayerSession,
        { sessionId: 1, prayerId: 1, dateTime: '2025-07-20' } as PrayerSession,
        { sessionId: 2, prayerId: 2, dateTime: '2025-07-21' } as PrayerSession,
        { sessionId: 4, prayerId: 2, dateTime: '2025-07-22' } as PrayerSession,
    ];
    let sortedPrayerIds: number[] =
        getPrayerIdsSortedByLeastRecentPrayerDate(sessions);
    expect(sortedPrayerIds[0]).toBe(2);
    expect(sortedPrayerIds[1]).toBe(1);
});
test('Tests the updating of the prayer.mostRecentPrayerDate', () => {
    let sessions: PrayerSession[] = [
        { sessionId: 3, prayerId: 1, dateTime: '2025-07-21' } as PrayerSession,
        { sessionId: 1, prayerId: 1, dateTime: '2025-07-20' } as PrayerSession,
        { sessionId: 2, prayerId: 2, dateTime: '2025-07-21' } as PrayerSession,
        { sessionId: 4, prayerId: 2, dateTime: '2025-07-22' } as PrayerSession,
    ];
    let prayer: Prayer = {
        prayerId: 2,
        mostRecentPrayerDate: undefined,
        prayerTitleTx: 'prayer',
        userId: 's',
        archiveFl: 'N',
    } as Prayer;
    updateLastPracticedDate(sessions, [prayer]);
    expect(prayer.mostRecentPrayerDate).toBe('2025-07-22');
});

test('sortPrayersForDisplay uses simple grouping when below threshold', () => {
    const prayers: Prayer[] = [
        makePrayer(1, true, '2025-08-01'),
        makePrayer(2, false, '2025-08-02'),
        makePrayer(3, true, '2025-07-01'),
    ];
    const sorted = sortPrayersForDisplay(prayers);
    // All daily first (sorted oldest-first), then non-daily
    expect(sorted.map(p => p.prayerId)).toEqual([3, 1, 2]);
});

test('sortPrayersForDisplay interleaves 2 daily / 1 non-daily above threshold', () => {
    const prayers: Prayer[] = [];
    // 25 daily prayers, oldest first by id (id N => date 2025-08-(N))
    for (let i = 1; i <= 25; i++) {
        prayers.push(makePrayer(i, true, `2025-08-${String(i).padStart(2, '0')}`));
    }
    // 10 non-daily prayers
    for (let i = 26; i <= 35; i++) {
        prayers.push(makePrayer(i, false, `2025-08-${String(i - 25).padStart(2, '0')}`));
    }
    // total = 35 > 30, daily = 25/35 = 71% > 20%
    const sorted = sortPrayersForDisplay(prayers);
    const ids = sorted.map(p => p.prayerId);

    // First 3 should be: daily, daily, non-daily
    expect(ids[0]).toBe(1); // oldest daily
    expect(ids[1]).toBe(2); // second oldest daily
    expect(ids[2]).toBe(26); // oldest non-daily
    // Next 3 should follow the same pattern
    expect(ids[3]).toBe(3);
    expect(ids[4]).toBe(4);
    expect(ids[5]).toBe(27);
    // All 35 should be present
    expect(ids.length).toBe(35);
});

test('sortPrayersForDisplay does not interleave when daily percentage is low', () => {
    const prayers: Prayer[] = [];
    // 5 daily
    for (let i = 1; i <= 5; i++) {
        prayers.push(makePrayer(i, true, `2025-08-0${i}`));
    }
    // 26 non-daily (total 31 > 30, but daily = 5/31 = 16% < 20%)
    for (let i = 6; i <= 31; i++) {
        prayers.push(makePrayer(i, false, `2025-08-${String(i - 5).padStart(2, '0')}`));
    }
    const sorted = sortPrayersForDisplay(prayers);
    const ids = sorted.map(p => p.prayerId);

    // Should be all daily first, then all non-daily (no interleave)
    expect(ids.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(ids.length).toBe(31);
});
