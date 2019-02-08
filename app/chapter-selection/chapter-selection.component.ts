import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './chapter-selection.component.html'
})
export class ChapterSelectionComponent implements OnInit {
  translation: string = null;
  bibleBooks: string[] = [];
  bookChapters: number[] = [];
  maxChapterByBook: any[];
  book: string = null;
  chapter: number = null;
  isBooklistCollapsed: boolean = true;
  isChapterlistCollapsed: boolean = true;
  isTranslCollapsed: boolean = true;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currUser = this.memoryService.getCurrentUser();
    if (!currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.bibleBooks = this.bibleBooks.concat(Object.keys(Constants.bookAbbrev));
    this.memoryService.getPreferences().subscribe(prefs => {
      if (prefs && prefs.length > 0) {
        for (let pref of prefs) {
          if (pref.key === "preferred_translation" && pref.value && pref.value.length > 0) {
            this.translation = pref.value;
            break;
          }
        }
      }
    });
    this.memoryService.getMaxChaptersByBook().subscribe((response: any[]) => {
      this.maxChapterByBook = response;
    });
  }

  toggleTranslationOptions() {
    this.isTranslCollapsed = !this.isTranslCollapsed;
  }

  toggleBookOptions() {
    this.isBooklistCollapsed = !this.isBooklistCollapsed;
  }

  toggleChapterOptions() {
    this.isChapterlistCollapsed = !this.isChapterlistCollapsed;
  }

  private getMaxChapterForBook(): number {
    for (let maxChapterForBook of this.maxChapterByBook) {
      if (this.book === maxChapterForBook.bookName) {
        return maxChapterForBook.maxChapter;
      }
    }
    return -1;
  }

  selectBook(book: string): boolean {
    this.book = book;
    this.isBooklistCollapsed = true;
    let maxChapter: number = this.getMaxChapterForBook();
    this.bookChapters = [];
    for (let i = 0; i < maxChapter; i++) {
      this.bookChapters.push(i + 1);
    }
    this.chapter = 1;
    return false;
  }

  selectChapter(bookChapter: number) {
    this.chapter = bookChapter;
    this.isChapterlistCollapsed = true;
  }

  selectTranslation(translation: string): boolean {
    this.translation = translation;
    this.isTranslCollapsed = true;
    return false;
  }

  goToChapter() {
    this.route.navigate(['/viewChapter'], {queryParams: {book: this.book, chapter: this.chapter, translation: this.translation}});
  }
}
