import { Verse } from "./verse";
import { Topic } from "./topic";

// Nugget model — used in the BROWSE BIBLE flow (browsing/searching non-memory passages).
// A "nugget" is a Bible passage the user has saved for general reference (not for memorization).
// Compare with Passage (models/passage.ts), which is used in the MEMORY PASSAGES flow.
export interface Nugget {
    nuggetId: number;
    bookId: number;
    bookName: string;
    translationId: string;
    translationName: string;
    chapter: number;
    startVerse: number;
    endVerse: number;
    verseText: string;
    frequencyDays: number;
    last_viewed_str: string;
    last_viewed_num: number;
    passageRefAppendLetter: string;
    verses: Verse[];
    topics: Topic[];
    explanation: string;
}
