import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';
import { MemoryService } from 'src/app/memory.service';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

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
  private maxVerseByBookChapter: any[] = [];
  private passageTextForClipboard: string = null;

  isTranslCollapsed: boolean = true;
  isBooklistCollapsed: boolean = true;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  bibleBooks: string[] = [];
  constructor(
    private route: Router, 
    private memoryService: MemoryService, 
    public toastr: ToastrService,
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
      this.memoryService.getMaxVerseByBookChapter(this.translation).subscribe((response: any[]) => {
        if (response && Object.keys(response).length === 66) {
          this.maxVerseByBookChapter = response;
        } else {
          console.log('Unable to retrieve max verse by chapter...');
        }
        this.searchResults = passages;
        this.searching = false;
        this.searchingMessage = null;
      });
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

  goToSurroundingVerses() {
    let passageContext: Passage = PassageUtils.getSurroundingVerses(this.selectedVerse, this.maxVerseByBookChapter);
    console.log('Navigating to: ');
    console.log(passageContext);
    if (this.openModal) {
      this.openModal.close();
    }
    this.route.navigate(['/viewPassage', passageContext.bookName, passageContext.chapter, passageContext.startVerse, passageContext.endVerse, this.translation]);
  }
  
  clipboardCopyComplete() {
    this.toastr.info('The passage has been copied to the clipboard!', 'Success!');
    if (this.openModal) {
      this.openModal.close();
    }
  }

  open(content, selectedVerse: Passage) {
    this.selectedVerse = selectedVerse;
    this.populateVerseForClipboard(selectedVerse);
    this.openModal = this.modalService.open(content);
    this.openModal.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  populateVerseForClipboard(selectedVerse: Passage) {
    if (selectedVerse && selectedVerse !== null) {
      this.passageTextForClipboard = PassageUtils.getPassageForClipboard(selectedVerse);
      if (this.passageTextForClipboard === "" && this.memoryService.getCurrentUser()) {
        this.memoryService.getUpdatedCurrentPassageText().subscribe((passage: Passage) => {
          selectedVerse.verses = passage.verses;
          this.passageTextForClipboard = PassageUtils.getPassageForClipboard(selectedVerse);
        });
      }
    }
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
