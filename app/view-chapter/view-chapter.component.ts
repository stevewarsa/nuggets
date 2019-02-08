import { Passage } from 'src/app/passage';
import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { ActivatedRoute } from '@angular/router';
import { Constants } from 'src/app/constants';

@Component({
  templateUrl: './view-chapter.component.html'
})
export class ViewChapterComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  passage: Passage = null;
  book: string = null;
  chapter: number = -1;
  startVerse: number = -1;
  endVerse: number = -1;
  translation: string = null;
  maxChapterByBook: any[];

  constructor(private memoryService: MemoryService, private activeRoute:ActivatedRoute) { }

  ngOnInit() {
    this.book = this.activeRoute.snapshot.queryParamMap.get('book');
    this.chapter = parseInt(this.activeRoute.snapshot.queryParamMap.get('chapter'));
    this.translation = this.activeRoute.snapshot.queryParamMap.get('translation');
    let startVerse = this.activeRoute.snapshot.queryParamMap.get('startVerse');
    if (startVerse) {
      this.startVerse = parseInt(startVerse);
    }
    let endVerse = this.activeRoute.snapshot.queryParamMap.get('endVerse');
    if (endVerse) {
      this.endVerse = parseInt(endVerse);
    }
    this.memoryService.getMaxChaptersByBook().subscribe((response: any[]) => {
      this.maxChapterByBook = response;
    });
    this.retrieveChapter();
  }

  private retrieveChapter() {
    this.searching = true;
    if (this.startVerse !== -1 && this.endVerse !== -1) {
      this.searchingMessage = 'Retrieving ' + this.book + ', chapter ' + this.chapter + ', start verse ' + this.startVerse + ', end verse ' + this.endVerse + '...';
      let passage: Passage = new Passage();
      this.memoryService.getPassageByKeys(this.book, this.chapter, this.startVerse, this.endVerse, this.translation).subscribe((returnPassage: Passage) => {
        console.log(returnPassage);
        this.passage = returnPassage;
        this.searching = false;
        this.searchingMessage = null;
      });
    } else {
      this.searchingMessage = 'Retrieving ' + this.book + ', chapter ' + this.chapter + '...';
      this.memoryService.getChapter(this.book, this.chapter, this.translation).subscribe((passage: Passage) => {
        console.log(passage);
        this.passage = passage;
        this.searching = false;
        this.searchingMessage = null;
      });
    }
  }

  next() {
    // make sure during next/prev, we don't just show the verse range (start-end), if they were set
    this.startVerse = -1;
    this.endVerse = -1;
    this.chapter += 1;
    if (this.chapter > this.getMaxChapterForBook()) {
      let bookId = this.memoryService.getBookId(this.book);
      if (bookId === 66) {
        this.book = Constants.booksByNum[1];
      } else {
        this.book = Constants.booksByNum[bookId + 1];
      }
      this.chapter = 1;
    }
    this.retrieveChapter();
  }

  prev() {
    // make sure during next/prev, we don't just show the verse range (start-end), if they were set
    this.startVerse = -1;
    this.endVerse = -1;
    this.chapter -= 1;
    if (this.chapter === 0) {
      let bookId = this.memoryService.getBookId(this.book);
      if (bookId === 1) {
        this.book = Constants.booksByNum[66];
      } else {
        this.book = Constants.booksByNum[bookId - 1];
      }
      this.chapter = 1;
    }
    this.retrieveChapter();
  }

  selectTranslation(translation: string): boolean {
    this.translation = translation;
    this.retrieveChapter();
    return false;
  }

  private getMaxChapterForBook(): number {
    for (let maxChapterForBook of this.maxChapterByBook) {
      if (this.book === maxChapterForBook.bookName) {
        return maxChapterForBook.maxChapter;
      }
    }
    return -1;
  }
}
