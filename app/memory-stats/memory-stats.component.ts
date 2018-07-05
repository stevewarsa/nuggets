import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { Passage } from 'src/app/passage';

@Component({
  templateUrl: './memory-stats.component.html'
})
export class MemoryStatsComponent implements OnInit {
  initializing: boolean = false;
  passageCount: number = 0;
  verseCount: number = 0;
  avgVersesPerPassage: number = 0;
  countByTranslation: any[] = [];
  myPassages: Passage[] = [];

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currentUser: string = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.initializing = true;
    this.myPassages = this.memoryService.getCachedPassages();
    if (this.myPassages && this.myPassages.length > 0) {
      this.createStats();
    } else {
      this.memoryService.getMemoryPassageList(currentUser).subscribe((passages: Passage[]) => {
        this.myPassages = passages;
        this.createStats();
      });
    }
  }

  private createStats() {
    this.passageCount = this.myPassages.length;
    this.getVerseCount();
    this.avgVersesPerPassage = this.verseCount / this.passageCount;
    this.getCountByTranslation();
    this.initializing = false;
  }
		
  private getVerseCount() {
    let verseCount = 0;
    for (let passage of this.myPassages) {
      verseCount += passage.endVerse - passage.startVerse	+ 1;
    }
    this.verseCount = verseCount;
  }
  
  private getCountByTranslation() {
    let countsByTranslation = {};
    for (let passage of this.myPassages) {
      if (countsByTranslation.hasOwnProperty(passage.translationName)) {
        countsByTranslation[passage.translationName] += 1;
      } else {
        // this is the first time we've encountered this particular translation
        countsByTranslation[passage.translationName] = 1;
      }
    }
    var keys = Object.keys(countsByTranslation);
    var translationStatsArray = [];
    for (let key of keys) {
      let pct: number = parseFloat(countsByTranslation[key]) / this.passageCount;
      translationStatsArray.push({translation: key, countOfPassages: countsByTranslation[key], percent: pct});
    }
    this.countByTranslation = translationStatsArray;
  }
}
