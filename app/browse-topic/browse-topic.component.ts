import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MemoryService } from 'src/app/memory.service';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Constants } from 'src/app/constants';

@Component({
  templateUrl: './browse-topic.component.html'
})
export class BrowseTopicComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  passages: Passage[] = [];
  translation: string = null;
  passage: Passage = null;
  currentIndex: number = 0;
  currUser: string = null;
  topicName: string = null;

  constructor(private memoryService: MemoryService, private activeRoute:ActivatedRoute, private route: Router) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    let topicId: number = parseInt(this.activeRoute.snapshot.queryParamMap.get('topicId'));
    this.topicName = this.memoryService.getTopicName(topicId);
    let topicOrder: string = this.activeRoute.snapshot.queryParamMap.get('order');
    this.searching = true;
    this.searchingMessage = 'Retrieving passages for topic ' + topicId + '...';
    this.memoryService.getPassagesForTopic(topicId).subscribe((passages: Passage[]) => {
      if (topicOrder === 'rand') {
        PassageUtils.shuffleArray(passages);
      }
      this.passages = passages;
      this.memoryService.getPreferences().subscribe(prefs => {
        this.translation = PassageUtils.getPreferredTranslationFromPrefs(prefs, 'niv');
        this.currentIndex = 0;
        this.displayPassage();
        this.searching = false;
        this.searchingMessage = null;
      });
    });
  }

  next() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.passages.length, true);
    this.displayPassage();
  }

  prev() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.passages.length, false);
    this.displayPassage();
  }

  selectTranslation(translation: string): boolean {
    this.translation = translation;
    this.displayPassage();
    return false;
  }

  displayPassage() {
    let passageToGet = this.passages[this.currentIndex];
    passageToGet.translationId = this.translation;
    passageToGet.translationName = this.translation;
    passageToGet.bookName = Constants.booksByNum[passageToGet.bookId];
    this.searching = true;
    this.searchingMessage = 'Retrieving passage text...';
    this.memoryService.getPassage(passageToGet, this.currUser).subscribe((returnedPassage: Passage) => {
      this.passage = returnedPassage;
      this.passage.bookName = passageToGet.bookName;
      this.memoryService.setCurrentPassage(this.passage, this.currUser);
      this.searching = false;
      this.searchingMessage = null;
    });
  }
}
