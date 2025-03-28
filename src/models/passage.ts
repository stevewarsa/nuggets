import {Verse} from "./verse";
import {Topic} from "./topic";

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