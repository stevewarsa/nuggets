import { transition } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { MemoryService } from '../memory.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { PassageUtils } from '../passage-utils';

@Component({
  selector: 'mem-reading-plan',
  templateUrl: './reading-plan.component.html',
  styleUrls: ['./reading-plan.component.css']
})
export class ReadingPlanComponent implements OnInit {
  booksByDay = {};
  maxChapterByBook = [];
  days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  lastChapterReadForDay: any = {
    bookId: 32,
    bookName: 'jonah',
    chapter: 4,
    dateRead: '4/19/2019'
  };

  chapterToRead: any = null;
  chapterToReadString = "Retrieving...";
  translation: string = null;
  currentUser: string = null;
  currentDayOfWeek: string = null;
  
  constructor(private route: Router, private memoryService: MemoryService) { 
    this.booksByDay["Sunday"] = ["romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude"];
    this.booksByDay["Monday"] = ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"];
    this.booksByDay["Tuesday"] = ["joshua", "judges", "ruth", "1-samuel", "2-samuel", "1-kings", "2-kings", "1-chronicles", "2-chronicles", "ezra", "nehemiah", "esther"];
    this.booksByDay["Wednesday"] = ["psalms"];
    this.booksByDay["Thursday"] = ["job", "proverbs", "ecclesiastes", "song-of-solomon"];
    this.booksByDay["Friday"] = ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi", "revelation"];
    this.booksByDay["Saturday"] = ["matthew", "mark", "luke", "john", "acts"];
  }

  ngOnInit() {
    this.currentUser = this.memoryService.getCurrentUser();
    if (!this.currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    let maxChapByBookObs = this.memoryService.getMaxChaptersByBook();
    this.currentDayOfWeek = this.days[moment().day()];
    let readingPlanObs = this.memoryService.getReadingPlanProgress(this.currentUser, this.currentDayOfWeek);
    let prefsObs = this.memoryService.getPreferences();
    forkJoin([maxChapByBookObs, readingPlanObs, prefsObs]).subscribe((response: any[]) => {
      this.maxChapterByBook = response[0];
      if (response[1]) {
        this.lastChapterReadForDay = response[1];
      } else {
        // this may be the first time the user is using this, so default
        let booksForDay: string[] = this.booksByDay[this.currentDayOfWeek];
        let lastBookInGroup: string = booksForDay[booksForDay.length - 1];
        let maxChapter: number = this.maxChapterByBook.filter(bookChap => bookChap.bookName === lastBookInGroup)[0].maxChapter;
        let bookId: number = PassageUtils.getBookId(lastBookInGroup);
        this.lastChapterReadForDay = {
          bookId: bookId,
          bookName: lastBookInGroup,
          chapter: maxChapter,
          dateRead: '4/19/2019'
        };
      }
      this.translation = PassageUtils.getPreferredTranslationFromPrefs(response[2], 'niv');
      let lastChapterForLastReadBook = -1;
      for (let maxChapterForBook of this.maxChapterByBook) {
        let bookName: string = maxChapterForBook.bookName;
        if (bookName === this.lastChapterReadForDay.bookName) {
          lastChapterForLastReadBook =  maxChapterForBook.maxChapter;
          break;
        }
      }
      let bookToRead: string = this.lastChapterReadForDay.bookName;
      let chapterToRead = this.lastChapterReadForDay.chapter + 1;
      if (this.lastChapterReadForDay.chapter === lastChapterForLastReadBook) {
        // go to the next book and set the chapter to 1
        chapterToRead = 1;
        let booksForDayOfWeek: string[] = this.booksByDay[this.currentDayOfWeek];
        let currentBookIndex: number = booksForDayOfWeek.indexOf(this.lastChapterReadForDay.bookName);
        if (currentBookIndex === (booksForDayOfWeek.length - 1)) {
          bookToRead = booksForDayOfWeek[0];
        } else {
          bookToRead = booksForDayOfWeek[currentBookIndex + 1];
        }
      }
      let bookIdToRead: number = PassageUtils.getBookId(bookToRead);
      let regBookToRead = PassageUtils.getRegularBook(bookIdToRead);
      console.log("Here is the book and chapter to read: " + regBookToRead + " " + chapterToRead);
      this.chapterToReadString = regBookToRead + " " + chapterToRead;
      this.chapterToRead = {
        bookId: 33,
        bookName: bookToRead,
        chapter: chapterToRead
      };
    });
  }

  goToChapter() {
    this.memoryService.updateReadingPlan(this.currentUser, this.currentDayOfWeek, this.chapterToRead.bookName, this.chapterToRead.bookId, this.chapterToRead.chapter).subscribe((response: string) => {
      this.route.navigate(['/viewChapter'], {queryParams: {book: this.chapterToRead.bookName, chapter: this.chapterToRead.chapter, translation: this.translation}});
    });
  }
}
