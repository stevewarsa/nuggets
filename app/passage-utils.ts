import { Passage } from "src/app/passage";
import { Constants } from "src/app/constants";

export class PassageUtils {

  static getBookId(bookKey: string): number {
    let keys: any[] = Object.keys(Constants.booksByNum);
    for (let key of keys) {
      let book: string = Constants.booksByNum[key];
      if (bookKey === book) {
        return key;
      }
    }
    return -1;
  }
  public static getUnformattedPassageTextNoVerseNumbers(passage: Passage): string {
    let verseLen = passage.verses.length;
    let verseText = "";
    for (let i = 0; i < verseLen; i++) {
      let versePartLen = passage.verses[i].verseParts.length;
      for (let j = 0; j < versePartLen; j++) {
        verseText += passage.verses[i].verseParts[j].verseText + " ";
      }
    }
    return verseText;
  }
  
  public static getFormattedPassageText(passage: Passage, showVerseNumbers: boolean): string {
    let verseLen: number = passage.verses.length;
    let verseText: string = "";
    for (let i = 0; i < verseLen; i++) {
      let versePartLen: number = passage.verses[i].verseParts.length;
      for (let j = 0; j < versePartLen; j++) {
        if (j === 0 && showVerseNumbers) {
          verseText += "<span class='verse_num'>"
            + passage.verses[i].verseParts[j].verseNumber
            + "</span> ";
        }
        if (passage.verses[i].verseParts[j].wordsOfChrist) {
          verseText += "<span class='wordsOfChrist'>";
          verseText += passage.verses[i].verseParts[j].verseText
            + " ";
          verseText += "</span>";
        } else {
          verseText += passage.verses[i].verseParts[j].verseText
            + " ";
        }
      }
    }
    return verseText;
  }

  public static getPassageForClipboard(passage: Passage): string {
    if (!passage || !passage.verses || passage.verses.length === 0) {
      return "";
    }
    let verseLen: number = passage.verses.length;
    let verseText: string = "";
    verseText += this.getPassageStringNoIndex(passage, null, true);
    verseText += "\n\n";
    for (let i = 0; i < verseLen; i++) {
      let versePartLen: number = passage.verses[i].verseParts.length;
      for (let j = 0; j < versePartLen; j++) {
        verseText += passage.verses[i].verseParts[j].verseText
          + " ";
      }
    }
    return verseText;
  }

  public static getFormattedPassageTextHighlight(passage: Passage, textToHighlight: string, showVerseNumbers: boolean) {
    var formattedText = this.getFormattedPassageText(passage, showVerseNumbers);
    return this.updateAllMatches(textToHighlight, formattedText);
  }

  public static updateAllMatches(find: string, str: string) {
    let regex: RegExp = new RegExp(find, 'ig');
    return str.replace(regex, "<span class='search_result'>$&</span>");
  }

  public static getPassageStringNoIndex(passage: Passage, transl: string, translShort: boolean) {
    var verseNumbers = null;
    if (passage.startVerse === passage.endVerse) {
      verseNumbers = passage.startVerse;
    } else {
      verseNumbers = passage.startVerse + "-" + passage.endVerse;
    }
    let regularBook: string = null;
    if (passage.bookName) {
      regularBook = this.getRegularBook(passage.bookId);
    } else {
      regularBook = Constants.booksByNum[passage.bookId];
    }
    if (transl) {
      if (translShort) {
        return regularBook + " " + passage.chapter + ":" + verseNumbers + " (" + transl + ")";
      } else {
        return regularBook + " " + passage.chapter + ":" + verseNumbers + " (" + Constants.translationMediumNames[transl] + ")";
      }
    } else {
      return regularBook + " " + passage.chapter + ":" + verseNumbers;
    }
  }

  public static getPassageString(passage: Passage, currentIndex: number, passagesLen: number, transl: string, shortBook: boolean, showProgress: boolean, appendLetter?: string): string {
    let verseNumbers = null;
    if (passage.startVerse === passage.endVerse)
      verseNumbers = passage.startVerse;
    else
      verseNumbers =  passage.startVerse + "-" + passage.endVerse;

    if (appendLetter) {
      verseNumbers += appendLetter;
    }
    
    let bookName: string = shortBook ? this.getShortBook(passage.bookId) : this.getRegularBook(passage.bookId);
    let translString: string = "";
    if (transl) {
      translString = "<br/><span class='bible_version'>(" + transl + ")</span>";
    }
    if (showProgress) {
      return bookName + " " + passage.chapter + ":" + verseNumbers + translString + " - " + (currentIndex + 1) + " of " + passagesLen;
    } else {
      return bookName + " " + passage.chapter + ":" + verseNumbers + translString;
    }
    
  }

  public static getRegularBook(bookId: number) {
    let bookName = Constants.booksByNum[bookId];
    return Constants.bookAbbrev[bookName][1];
  }

  public static getShortBook(bookId: number) {
    let bookName = Constants.booksByNum[bookId];
    return Constants.bookAbbrev[bookName][0];
  }

  public static shuffleArray(arr: any[]) {
    for (let i: number = arr.length - 1; i >= 0; i--) {
      let randomIndex: number = Math.floor(Math.random() * (i + 1));
      let itemAtIndex: number = arr[randomIndex];
      arr[randomIndex] = arr[i];
      arr[i] = itemAtIndex;
    }
  }

  public static sortAccordingToPracticeConfig(order: string, arr: any[]): any[] {
    if (order == "rand") {
      //console.log("displayOrder=rand");
      this.shuffleArray(arr);
    } else if (order == "by_freq") {
      //console.log("displayOrder=by_freq");
      arr = arr.sort((a: Passage, b: Passage) => {
        return (a.frequencyDays - b.frequencyDays);
      });
    } else if (order == "by_last_practiced_time") {
      //console.log("displayOrder=by_last_practiced_time");
      arr = arr.sort((a: Passage, b: Passage) => {
        return (a.last_viewed_num - b.last_viewed_num);
      });
    }
    return arr;
  }

  public static randomizeWithinFrequencyGroups(passages: Passage[]): Passage[] {
    let frequencyGroups = {};
    for (let passage of passages) {
      let frequencyGroup: Passage[] = frequencyGroups[passage.frequencyDays];
      if (!frequencyGroup) {
        let passagesForFrequencyGroup: Passage[] = [passage];
        frequencyGroups[passage.frequencyDays] = passagesForFrequencyGroup;
      } else {
        frequencyGroup.push(passage);
        frequencyGroups[passage.frequencyDays] = frequencyGroup;
      }
    }
    // now, iterate through the frequency groups and randomize each group
    // and append that group to the return array
    let returnPassageArray: Passage[] = [];
    let frequencies: any[] = Object.keys(frequencyGroups);
    let numFrequencies: number[] = [];
    for (let frequency of frequencies) {
      numFrequencies.push(parseInt(frequency));
    }
    numFrequencies.sort((a: number, b: number) => {
      return a - b;
    });
    for (let numFreq of numFrequencies) {
      let passagesForFrequency: Passage[] = frequencyGroups[numFreq + ""];
      // randomize this group...
      passagesForFrequency.sort(() => Math.random() - 0.5);
      // now append to the return array
      returnPassageArray = returnPassageArray.concat(passagesForFrequency);
    }
    return returnPassageArray;
  }

  public static sortPassagesByBibleBookOrder(passages: Passage[]): Passage[] {
    passages = passages.sort((a: Passage, b: Passage) => {
      return (a.bookId - b.bookId);
    });
    return passages;
  }
}