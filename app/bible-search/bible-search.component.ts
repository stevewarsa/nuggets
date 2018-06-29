import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';
import { MemoryService } from 'src/app/memory.service';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';

@Component({
  templateUrl: './bible-search.component.html'
})
export class BibleSearchComponent implements OnInit {
  testament: string = 'both';
  translation: string = 'niv';
  book: string = 'All';
  searchPhrase: string;
  chapter: string = 'All';
  searchResults: Passage[] = [];
  searching: boolean = false;
  searchingMessage: string;

  isTranslCollapsed: boolean = true;
  isBooklistCollapsed: boolean = true;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  bibleBooks: string[] = [];
  constructor(private route: Router, private memoryService: MemoryService) { }

  ngOnInit() {
    let currUser = this.memoryService.getCurrentUser();
    if (!currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.bibleBooks.push('All');
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
  }

  doSearch() {
    console.log("book: " + this.book);
    console.log("chapter: " + this.chapter);
    console.log("translation: " + this.translation);
    console.log("testament: " + this.testament);
    console.log("searchPhrase: " + this.searchPhrase);
    let param: any = {
      book: this.book,
      translation: this.translation,
      testament: this.testament,
      searchPhrase: this.searchPhrase
    };
    this.searching = true;
    this.searchingMessage = "Searching for '" + this.searchPhrase + "'...";
    this.searchResults = [];
    this.memoryService.searchBible(param).subscribe((passages: Passage[]) => {
      //console.log(passages);
      this.searchResults = passages;
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  getPassageRef(passage: Passage): string {
    return PassageUtils.getPassageStringNoIndex(passage, this.translation, true);
  }

  getPassageText(passage: Passage): string {
    return PassageUtils.getFormattedPassageTextHighlight(passage, this.searchPhrase, true);
  }

  toggleTranslationOptions() {
    this.isTranslCollapsed = !this.isTranslCollapsed;
  }

  toggleBookOptions() {
    this.isBooklistCollapsed = !this.isBooklistCollapsed;
  }

  goToPassage(passage: Passage) {
    console.log('Navigating to: ');
    console.log(passage);
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

  selectChapters() {}
}
