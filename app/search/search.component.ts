import { Constants } from 'src/app/constants';
import { PassageUtils } from 'src/app/passage-utils';
import { MemoryService } from 'src/app/memory.service';
import { Component, OnInit } from '@angular/core';
import { Passage } from 'src/app/passage';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { UpdatePassageParam } from 'src/app/update-passage-param';

@Component({
  templateUrl: './search.component.html'
})
export class SearchComponent implements OnInit {
  bibleBooks: string[] = [];
  chapterRows: any[] = [];
  verseRows: any[] = [];
  chapter: number;
  startVerse: number;
  verseFontColor: any = {};
  endVerse: number;
  verseSelectionMode: string;
  toggleChapterSelection: boolean = false;
  toggleVerseSelection: boolean = false;
  showAppend: boolean = false;
  bibleBook: string = "";
  bibleBookKey: string;
  maxChaptersByBook: any[] = [];
  maxVerseByBookChapter: any[] = [];
  versesForChapter: number[] = [];
  currentPassage: Passage;
  passageHtml: string;
  translations: string[] = [];
  translationLongName: string;
  translation: string = 'nas';
  append: string;
  editing: boolean = false;
  processing: boolean = false;
  processingMessage: string;
  currPassageText: string;
  rowsInTextArea: number = 10;
  colsInTextArea: number = 47;
  originalPassageText: string;
  
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => this.bibleBooks.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 20))
    );
  searchTranslations = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => this.translations.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 8))
    );

  constructor(private route: Router, private memoryService: MemoryService) { }

  ngOnInit() {
    let currUser = this.memoryService.getCurrentUser();
    if (!currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.translationLongName = Constants.translationLongNames[this.translation];
    let keys: string[] = Object.keys(Constants.bookAbbrev);
    for (let key of keys) {
      this.bibleBooks.push(Constants.bookAbbrev[key][1]);
    }
    keys = Object.keys(Constants.translationMediumNames);
    for (let key of keys) {
      this.translations.push(key);
    }
    this.memoryService.getMaxChaptersByBook().subscribe((results: any[]) => {
      this.maxChaptersByBook = results;
      this.memoryService.getPreferences().subscribe(prefs => {
        if (prefs && prefs.length > 0) {
          for (let pref of prefs) {
            if (pref.key === "preferred_translation" && pref.value && pref.value.length > 0) {
              this.translation = pref.value;
              break;
            }
          }
        }
        this.memoryService.getMaxVerseByBookChapter(this.translation).subscribe((response:any[]) => {
          if (response && Object.keys(response).length === 66) {
            this.maxVerseByBookChapter = response;
          } else {
            console.log('Unable to retrieve max verse by chapter...');
          }
        });
      });
    });
  }

  editPassage() {
    this.editing = true;
    this.currPassageText = PassageUtils.getUnformattedPassageTextNoVerseNumbers(this.currentPassage);
    this.currPassageText = this.currPassageText.trim();
    this.originalPassageText = this.currPassageText;
    console.log("Current passage length: " + this.currPassageText.length + ", colsInTextArea: " + this.colsInTextArea);
    this.rowsInTextArea = Math.ceil(this.currPassageText.length / this.colsInTextArea);
    console.log("rowsInTextArea: " + this.rowsInTextArea)
  }

  updatePassage() {
    this.editing = false;
    if (this.currPassageText.trim() === this.originalPassageText) {
      // no changes were made, so we don't have override text
      this.currentPassage = null;
    } else {
      this.passageHtml = this.currPassageText;
      this.showAppend = true;
      this.append = "a";
    }
  }

  handleBibleBookSelected(event: any) {
    let result: string = event.item;
    this.editing = false;
    this.showAppend = false;
    this.append = null;
    this.currPassageText = null;
    this.bibleBook = result;
    this.toggleChapterSelection = true;
    this.findBibleBookKey(result);
    this.setupChapterList();
  }

  private findBibleBookKey(book: string) {
    let keys: string[] = Object.keys(Constants.bookAbbrev);
    for (let key of keys) {
      if (book === Constants.bookAbbrev[key][1]) {
        this.bibleBookKey = key;
        return;
      }
    }
  }

  private setupChapterList() {
    if (!this.bibleBookKey || !this.maxChaptersByBook || this.maxChaptersByBook.length === 0) {
      return;
    }
    this.chapterRows = [];
    this.chapter = -1;
    this.startVerse = null;
    this.endVerse = null;
    for (let maxChapterForBook of this.maxChaptersByBook) {
      if (this.bibleBookKey === maxChapterForBook.bookName) {
        let maxChapter: number = maxChapterForBook.maxChapter;
        let chapterRow: number[] = [];
        for (let i = 1; i <= maxChapter; i++) {
          chapterRow.push(i);
          // every 3rd row, put that row in the array and start a new row (for the UI)
          if ((i % 3) === 0) {
            this.chapterRows.push(chapterRow);
            chapterRow = [];
          }
        }
        if (chapterRow.length > 0) {
          // push last chapter row
          this.chapterRows.push(chapterRow);
        }
      }
    }
  }

  showChapterSelection() {
    this.toggleChapterSelection = true;
    this.setupChapterList();
  }

  showVerseSelection() {
    this.toggleVerseSelection = true;
    this.startVerse = null;
    this.endVerse = null;
    this.verseSelectionMode = 'start';
    this.verseFontColor = {};
  }

  selectChapter(chapter: number) {
    this.chapter = chapter;
    this.chapterRows = [];
    this.verseRows = [];
    this.verseFontColor = {};
    let maxVerseForChapter = this.getMaxVerseByBookAndChapter(this.bibleBookKey, this.chapter, 70);
    let verseRow: number[] = [];
    for (let i = 1; i <= maxVerseForChapter; i++) {
      verseRow.push(i);
      // every 3rd row, put that row in the array and start a new row (for the UI)
      if ((i % 3) === 0) {
        this.verseRows.push(verseRow);
        verseRow = [];
      }
    }
    if (verseRow.length > 0) {
      // push last chapter row
      this.verseRows.push(verseRow);
    }
    this.startVerse = null;
    this.endVerse = null;
    this.verseSelectionMode = 'start';
    this.toggleChapterSelection = false;
    this.showAppend = false;
    this.append = null;
  }

  selectVerse(verse: number) {
    if (this.verseSelectionMode === 'end') {
      // the person is selecting an end verse
      this.endVerse = verse;
      this.verseFontColor[verse] = 'red';
      this.verseSelectionMode = 'done';
      this.toggleVerseSelection = false;
      this.showAppend = false;
      this.append = null;
      this.updateVerseText();
    } else if (this.verseSelectionMode === 'start') {
      this.startVerse = verse;
      this.verseFontColor[verse] = 'green';
      this.verseSelectionMode = 'end';
    }
  }

  private getMaxVerseByBookAndChapter(bibleBookKey: string, chapter: number, defaultVal: number): number {
    let bibleBookKeys: string[] = Object.keys(this.maxVerseByBookChapter);
    for (let lBibleBookKey of bibleBookKeys) {
      if (lBibleBookKey === bibleBookKey) {
        let chaptersAndMaxVerse: string[] = this.maxVerseByBookChapter[lBibleBookKey];
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

  private updateVerseText() {
    let passage: Passage = new Passage();
    passage.bookId = PassageUtils.getBookId(this.bibleBookKey);
    passage.bookName = this.bibleBookKey;
    passage.chapter = this.chapter;
    passage.translationName = this.translation;
    passage.translationId = this.translation;
    passage.startVerse = this.startVerse;
    passage.endVerse = this.endVerse;
    passage.frequencyDays = -1;
    this.memoryService.getPassage(passage, this.memoryService.getCurrentUser()).subscribe((returnedPassage: Passage) => {
      //console.log(returnedPassage);
      passage.verses = returnedPassage.verses;
      this.currentPassage = passage;
      this.passageHtml = PassageUtils.getFormattedPassageText(returnedPassage, true);
    });
  }
  changeTranslation(event: any) {
    console.log("changeTranslation: ");
    console.log(event.item);
    this.translation = event.item;
    this.translationLongName = Constants.translationLongNames[this.translation];
    this.updateVerseText();
  }

  // addPassage() {
  //   this.processing = true;
  //   this.processingMessage = "Demoting all passages by 1...";
  //   this.memoryService.demoteAllPassagesByOne(-1).subscribe((result: string) => {
  //     if (result === "success") {
  //       this.doAddPassage();
  //     } else {
  //       this.processing = false;
  //       this.processingMessage = null;
  //       console.log("Problem demoting all passages by 1...");
  //     }
  //   });
  // }

  addPassage() {
    this.processingMessage = "Adding passage...";
    this.memoryService.addPassage(this.currentPassage).subscribe((passageId: number) => {
      if (passageId >= 1) {
        if (this.currPassageText && this.append) {
          this.handlePassageOverrideUpdate(passageId);
        } else {
          this.processing = false;
          this.processingMessage = null;
          this.route.navigate(['practiceSetup']);
        }
      } else {
        this.processing = false;
        this.processingMessage = null;
        console.log("Problem adding passage...");
      }
    });
  }
  private handlePassageOverrideUpdate(passageId: number) {
    // there is a passage text override, so need to do an additional server side update
    this.processingMessage = "Updating passage override text...";
    let updatePassageParam: UpdatePassageParam = new UpdatePassageParam();
    updatePassageParam.newText = this.currPassageText;
    this.currentPassage.passageId = passageId;
    updatePassageParam.passage = this.currentPassage;
    updatePassageParam.passageRefAppendLetter = this.append;
    updatePassageParam.user = this.memoryService.getCurrentUser();
    this.memoryService.updatePassage(updatePassageParam).subscribe((result: string) => {
      this.processing = false;
      this.processingMessage = null;
      if (result === "success") {
        if (updatePassageParam.newText) {
          // this means we updated an override, so need to reload our override list
          console.log('Updating memory passage text overrides...');
          this.memoryService.getMemoryPassageTextOverrides(updatePassageParam.user).subscribe((overrides: Passage[]) => {
            this.memoryService.setMemoryPassageTextOverrides(overrides);
            console.log('Memory passage text overrides have been updated.');
            this.route.navigate(['practiceSetup']);
          });
        } else {
          this.route.navigate(['practiceSetup']);
        }
        this.route.navigate(['practiceSetup']);
      } else {
        console.log("Problem updating passage with override text: " + result);
      }
    });
  }
}
