import { Passage } from 'src/app/passage';
import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MemoryService } from 'src/app/memory.service';
import { ActivatedRoute } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';
import { Constants } from 'src/app/constants';

@Component({
  templateUrl: './view-chapter.component.html',
  animations: [
    trigger('newPassage', [
        transition('* => *', [
          style({opacity: 0.5, transform: 'scale(0.8)'}), 
          animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
        ])
    ])
  ]
})
export class ViewChapterComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  passage: Passage = null;
  book: string = null;
  chapter: number = -1;
  translation: string = null;
  maxChapterByBook: any[];

  constructor(private memoryService: MemoryService, private activeRoute:ActivatedRoute) { }

  ngOnInit() {
    this.book = this.activeRoute.snapshot.params['book'];
    this.chapter = parseInt(this.activeRoute.snapshot.params['chapter']);
    this.translation = this.activeRoute.snapshot.params['translation'];
    this.memoryService.getMaxChaptersByBook().subscribe((response: any[]) => {
      this.maxChapterByBook = response;
    });
    this.retrieveChapter();
  }

  private retrieveChapter() {
    this.searching = true;
    this.searchingMessage = 'Retrieving ' + this.book + ', chapter ' + this.chapter + '...';
    this.memoryService.getChapter(this.book, this.chapter, this.translation).subscribe((passage: Passage) => {
      console.log(passage);
      this.passage = passage;
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  next() {
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
