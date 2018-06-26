import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';

@Component({
  templateUrl: './bible-search.component.html'
})
export class BibleSearchComponent implements OnInit {
  testament: string = 'both';
  translation: string = 'niv';
  book: string = 'All';
  isTranslCollapsed: boolean = true;
  isBooklistCollapsed: boolean = true;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  bibleBooks: string[] = [];
  constructor() { }

  ngOnInit() {
    let keys: string[] = Object.keys(Constants.bookAbbrev);
    for (let key of keys) {
      this.bibleBooks.push(Constants.bookAbbrev[key][1]);
    }
  }

  doSearch() {
    // TODO
  }

  toggleTranslationOptions() {
    this.isTranslCollapsed = !this.isTranslCollapsed;
  }

  toggleBookOptions() {
    this.isBooklistCollapsed = !this.isBooklistCollapsed;
  }

  selectTranslation(translation: string): boolean {
    this.translation = translation;
    this.isTranslCollapsed = true;
    return false;
  }

  selectBook(book: string): boolean {
    this.book = book;
    this.isBooklistCollapsed = true;
    return false;
  }
}
