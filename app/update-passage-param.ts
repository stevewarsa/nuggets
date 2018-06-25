import { Passage } from "src/app/passage";

export class UpdatePassageParam {
    user: string;
    passage: Passage;
    newText: string = null;
    passageRefAppendLetter: string;
}