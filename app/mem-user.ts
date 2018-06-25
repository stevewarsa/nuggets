import { Passage } from "src/app/passage";

export class MemUser {
    fileName: string;
    userName: string;
    numLastMod: number;
    lastModified: string;
    passages: Passage[] = [];
}