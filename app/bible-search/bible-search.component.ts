import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';
import { MemoryService } from 'src/app/memory.service';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  templateUrl: './bible-search.component.html'
})
export class BibleSearchComponent implements OnInit {
  testament: string = 'both';
  translation: string = null;
  book: string = 'All';
  searchPhrase: string;
  chapter: string = 'All';
  searchResults: Passage[] = [];
  searching: boolean = false;
  searchingMessage: string;
  private selectedVerse: Passage;
  private closeResult: string;
  private openModal: NgbModalRef;

  isTranslCollapsed: boolean = true;
  isBooklistCollapsed: boolean = true;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  bibleBooks: string[] = [];
  constructor(
    private route: Router, 
    private memoryService: MemoryService, 
    private modalService: NgbModal) { }

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
      this.translation = PassageUtils.getPreferredTranslationFromPrefs(prefs, 'niv');
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

  passageAction(selectedVerse: Passage) {
    this.selectedVerse = selectedVerse;
  }

  goToPassage() {
    console.log('Navigating to: ');
    console.log(this.selectedVerse);
    if (this.openModal) {
      this.openModal.close();
    }
    this.route.navigate(['/viewChapter', this.selectedVerse.bookName, this.selectedVerse.chapter, this.translation]);
  }

  open(content, selectedVerse: Passage) {
    this.selectedVerse = selectedVerse;
    this.openModal = this.modalService.open(content);
    this.openModal.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
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
