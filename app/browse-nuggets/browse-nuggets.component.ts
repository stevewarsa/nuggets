import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';
import { Passage } from 'src/app/passage';

@Component({
  templateUrl: './browse-nuggets.component.html'
})
export class BrowseNuggetsComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  passageIds: any[] = [];
  currentIndex: number = 0;
  currentPassage: Passage = null;
  currUser: string = null;
  selectedTranslation: string = null;
  constructor(private route: Router, private memoryService: MemoryService) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.searching = true;
    this.searchingMessage = 'Retrieving nuggets....';
    this.memoryService.getNuggetIdList().subscribe((nuggetIds: any[]) => {
      PassageUtils.shuffleArray(nuggetIds);
      this.passageIds = nuggetIds;
      this.memoryService.getPreferences().subscribe(prefs => {
        this.selectedTranslation = PassageUtils.getPreferredTranslationFromPrefs(prefs, 'niv');
        this.currentIndex = 0;
        this.retrievePassage();
        this.searching = false;
        this.searchingMessage = null;
      });
    });
  }

  next() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.passageIds.length, true);
    this.retrievePassage();
  }

  prev() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.passageIds.length, false);
    this.retrievePassage();
  }

  retrievePassage() {
    console.log('Current Index: ' + this.currentIndex);
    let passageId: number = parseInt(this.passageIds[this.currentIndex].passage_id);
    this.searching = true;
    this.searchingMessage = 'Retrieving passage ...';
    this.memoryService.getPassageById(passageId, this.selectedTranslation).subscribe((returnedPassage: Passage) => {
      this.currentPassage = returnedPassage;
      this.memoryService.setCurrentPassage(this.currentPassage, this.currUser);
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  selectTranslation(translation: string) {
    this.selectedTranslation = translation;
    this.retrievePassage();
  }
}
