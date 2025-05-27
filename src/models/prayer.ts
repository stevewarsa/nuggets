export interface Prayer {
    prayerId?: number;
    userId: string;
    prayerTitleTx: string;
    prayerDetailsTx: string;
    prayerSubjectPersonName: string;
}

export interface PrayerSession {
    sessionId?: number;
    dateTime: string;
    userId: string;
    prayerId: number;
    prayerNoteTx: string | null;
}