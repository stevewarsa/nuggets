import { Passage } from "src/app/passage";
import { Constants } from "src/app/constants";
import { MemUser } from "src/app/mem-user";

export class PassageUtils {

  public static getPreferredTranslationFromPrefs(prefs: any[], defaultTranslation: string): string {
    if (prefs && prefs.length > 0) {
      for (let pref of prefs) {
        if (pref.key === "preferred_translation" && pref.value && pref.value.length > 0) {
          return pref.value;
        }
      }
    }
    return defaultTranslation;
  }

  public static getPref(prefs: any[], key: string, defaultValueToReturn: string): string {
    if (prefs && prefs.length > 0) {
      for (let pref of prefs) {
        if (pref.key === key && pref.value && pref.value.length > 0) {
          return pref.value;
        }
      }
    }
    return defaultValueToReturn;
  }

  public static getSurroundingVerses(passage: Passage, maxVerseByBookChapter: any[]): Passage {
    let maxVerse: number = this.getMaxVerseByBookAndChapter(
      passage.bookName, passage.chapter, -1, maxVerseByBookChapter);
    let newStartVerse: number = passage.startVerse - 4;
    let newEndVerse: number = passage.endVerse + 4;
    if (newStartVerse < 1) {
      newStartVerse = 1;
    }
    if (maxVerse != -1 && newEndVerse > maxVerse) {
      newEndVerse = maxVerse;
    }
    let returnPassage: Passage = JSON.parse(JSON.stringify(passage));
    returnPassage.startVerse = newStartVerse;
    returnPassage.endVerse = newEndVerse;
    return returnPassage;
  }

  public static deepClonePassage(passage: Passage): Passage {
    return JSON.parse(JSON.stringify(passage));
  }

  public static getMaxVerseByBookAndChapter(bibleBookKey: string, chapter: number, defaultVal: number, maxVerseByBookChapter: any[]): number {
    let bibleBookKeys: string[] = Object.keys(maxVerseByBookChapter);
    for (let lBibleBookKey of bibleBookKeys) {
      if (lBibleBookKey === bibleBookKey) {
        let chaptersAndMaxVerse: string[] = maxVerseByBookChapter[lBibleBookKey];
        for (let chapterAndMaxVerse of chaptersAndMaxVerse) {
          let chap = chapterAndMaxVerse[0];
          let maxVerse = chapterAndMaxVerse[1];
          if (parseInt(chap) === chapter) {
            return parseInt(maxVerse);
          }
        }
      }
    }
    return defaultVal;
  }

  public static getNextIndex(currentIndex: number, numberOfPassages: number, next: boolean): number {
    let newIndex: number = -1;
    if (next) {
      if (currentIndex === (numberOfPassages - 1)) {
        newIndex = 0;
      } else {
        newIndex = currentIndex + 1;
      }
    } else {
      if (currentIndex === 0) {
        newIndex = numberOfPassages - 1;
      } else {
        newIndex = currentIndex - 1;
      }
    }
    return newIndex;
  }

  public static getBookId(bookKey: string): number {
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
  
  public static getFormattedVersesAsArray(passage: Passage): string[] {
    let verses: string[] = [];
    let verseLen: number = passage.verses.length;
    for (let i = 0; i < verseLen; i++) {
      let verseText: string = "";
      let versePartLen: number = passage.verses[i].verseParts.length;
      for (let j = 0; j < versePartLen; j++) {
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
      verses.push(verseText);
    }
    return verses;
  }

  public static getPassageForClipboardAsArray(passage: Passage): string[] {
    if (!passage || !passage.verses || passage.verses.length === 0) {
      return [];
    }
    let passageArray: string[] = [];
    let verseLen: number = passage.verses.length;
    for (let i = 0; i < verseLen; i++) {
      let verseText: string = "";
      let versePartLen: number = passage.verses[i].verseParts.length;
      for (let j = 0; j < versePartLen; j++) {
        verseText += passage.verses[i].verseParts[j].verseText
          + " ";
      }
      passageArray.push(verseText);
    }
    return passageArray;
  }

  public static getPassageForClipboard(passage: Passage): string {
    if (!passage || !passage.verses || passage.verses.length === 0) {
      return "";
    }
    let verseLen: number = passage.verses.length;
    let verseText: string = "";
    if (passage.passageRefAppendLetter && passage.passageRefAppendLetter.length > 0) {
      verseText += this.getPassageStringNoIndex(passage, null, true, passage.passageRefAppendLetter);
    } else {
      verseText += this.getPassageStringNoIndex(passage, null, true);
    }
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
    let parts: string[] = find.split('*');
    for (let part of parts) {
      let regex: RegExp = new RegExp(part, 'ig');
      str = str.replace(regex, "<span class='search_result'>$&</span>");
    }
    return str;
  }

  public static updateLineFeedsWithBr(stringToModify: string): string {
    let re = /\n/gi;
    stringToModify = stringToModify.replace(re, '<br/>');
    return stringToModify;
  }

  public static getPassageStringNoIndex(passage: Passage, transl: string, translShort: boolean, appendLetter?: string) {
    var verseNumbers = null;
    if (passage.startVerse === passage.endVerse) {
      verseNumbers = passage.startVerse;
    } else {
      verseNumbers = passage.startVerse + "-" + passage.endVerse;
    }

    if (appendLetter) {
      verseNumbers += appendLetter;
    }

    let regularBook: string = null;
    if (passage.bookName) {
      regularBook = this.getRegularBook(passage.bookId);
    } else {
      regularBook = Constants.booksByNum[passage.bookId];
    }
    if (passage.translationId) {
      if (translShort) {
        return regularBook + " " + passage.chapter + ":" + verseNumbers + " (" + passage.translationId + ")";
      } else {
        return regularBook + " " + passage.chapter + ":" + verseNumbers + " (" + Constants.translationMediumNames[passage.translationId] + ")";
      }
    } else {
      return regularBook + " " + passage.chapter + ":" + verseNumbers;
    }
  }

  public static getPassageStringNoLineBreak(passage: Passage, currentIndex: number, passagesLen: number, transl: string, shortBook: boolean, showProgress: boolean, appendLetter?: string): string {
    let psgString: string = this.getPassageString(passage, currentIndex, passagesLen, transl, shortBook, showProgress, appendLetter);
    return psgString.replace("<br/>", " ");
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

  public static sortUserListByName(users: MemUser[]): MemUser[] {
    return users.sort((a: MemUser, b: MemUser) => {
      let nameA = a.userName.toUpperCase();
      let nameB = b.userName.toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      // names must be equal
      return 0;
    });
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