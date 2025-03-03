import { VersePart } from './verse-part';

export interface Verse {
  passageId: number;
  verseParts: VersePart[];
}
