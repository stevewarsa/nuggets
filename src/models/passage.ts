import {Verse} from "./verse";
import {Topic} from "./topic";

// Passage model — used in the MEMORY PASSAGES flow (memorization practice, editing, stats).
// A "passage" is a Bible passage the user is actively memorizing, tracked via the memory_passage table.
// Compare with Nugget (models/nugget.ts), which is used in the BROWSE BIBLE flow.
export interface Passage {
    passageId: number;
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