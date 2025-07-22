import {getPrayerIdsSortedByLeastRecentPrayerDate, updateLastPracticedDate} from "./src/models/passage-utils";
import {Prayer, PrayerSession} from "./src/models/prayer";

test("Tests The sorting of the prayer list by session dateTime", () => {
    let sessions: PrayerSession[] = [
        {sessionId: 3, prayerId: 1, dateTime: "2025-07-21"} as PrayerSession,
        {sessionId: 1, prayerId: 1, dateTime: "2025-07-20"} as PrayerSession,
        {sessionId: 2, prayerId: 2, dateTime: "2025-07-21"} as PrayerSession,
        {sessionId: 4, prayerId: 2, dateTime: "2025-07-22"} as PrayerSession,
    ];
    let sortedPrayerIds: number[] = getPrayerIdsSortedByLeastRecentPrayerDate(sessions);
    expect(sortedPrayerIds[0]).toBe(2);
    expect(sortedPrayerIds[1]).toBe(1);
});
test("Tests the updating of the prayer.mostRecentPrayerDate", () => {
    let sessions: PrayerSession[] = [
        {sessionId: 3, prayerId: 1, dateTime: "2025-07-21"} as PrayerSession,
        {sessionId: 1, prayerId: 1, dateTime: "2025-07-20"} as PrayerSession,
        {sessionId: 2, prayerId: 2, dateTime: "2025-07-21"} as PrayerSession,
        {sessionId: 4, prayerId: 2, dateTime: "2025-07-22"} as PrayerSession,
    ];
    let prayer: Prayer = {prayerId: 2, mostRecentPrayerDate: undefined, prayerTitleTx: "prayer", userId: "s", archiveFl: 'N'} as Prayer;
    updateLastPracticedDate(sessions, [prayer]);
    expect(prayer.mostRecentPrayerDate).toBe("2025-07-22");
});
