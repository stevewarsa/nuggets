import { Component, OnInit } from '@angular/core';
import { MemoryService } from '../memory.service';

@Component({
  selector: 'mem-reading-plan',
  templateUrl: './reading-plan.component.html',
  styleUrls: ['./reading-plan.component.css']
})
export class ReadingPlanComponent implements OnInit {
  booksByDay = {};
  maxChapterByBook = [];
  days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  dayBookIndex = {};
  dayChapterIndex = {};
  
  constructor(private memoryService: MemoryService) { 
    this.booksByDay["Sunday"] = ["romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude"];
    this.booksByDay["Monday"] = ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"];
    this.booksByDay["Tuesday"] = ["joshua", "judges", "ruth", "1-samuel", "2-samuel", "1-kings", "2-kings", "1-chronicles", "2-chronicles", "ezra", "nehemiah", "esther"];
    this.booksByDay["Wednesday"] = ["psalms"];
    this.booksByDay["Thursday"] = ["job", "proverbs", "ecclesiastes", "song-of-solomon"];
    this.booksByDay["Friday"] = ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi", "revelation"];
    this.booksByDay["Saturday"] = ["matthew", "mark", "luke", "john", "acts"];
  
    this.dayBookIndex["Sunday"] = 0;
    this.dayBookIndex["Monday"] = 0;
    this.dayBookIndex["Tuesday"] = 0;
    this.dayBookIndex["Wednesday"] = 0;
    this.dayBookIndex["Thursday"] = 0;
    this.dayBookIndex["Friday"] = 0;
    this.dayBookIndex["Saturday"] = 0;

    this.dayChapterIndex["Sunday"] = 1;
    this.dayChapterIndex["Monday"] = 1;
    this.dayChapterIndex["Tuesday"] = 1;
    this.dayChapterIndex["Wednesday"] = 1;
    this.dayChapterIndex["Thursday"] = 1;
    this.dayChapterIndex["Friday"] = 1;
    this.dayChapterIndex["Saturday"] = 1;
  }

  ngOnInit() {
    this.memoryService.getMaxChaptersByBook().subscribe(maxChapterByBook => {
      this.maxChapterByBook = maxChapterByBook;
      for (let maxChapterForBook of this.maxChapterByBook) {
        let bookName: string = maxChapterForBook.bookName;
        let maxChapter: number =  maxChapterForBook.maxChapter;
      }
    });
  }

}
