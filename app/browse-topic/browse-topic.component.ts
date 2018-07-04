import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MemoryService } from 'src/app/memory.service';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Constants } from 'src/app/constants';

@Component({
  templateUrl: './browse-topic.component.html',
  animations: [
    trigger('newPassage', [
        transition('* => *', [
          style({opacity: 0.5, transform: 'scale(0.8)'}), 
          animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
        ])
    ])
  ]
})
export class BrowseTopicComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  passages: Passage[] = [];
  formattedPassageText: string = null;
  passageRef: string = null;
  translation: string = null;
  passage: Passage = null;
  currentIndex: number = 0;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  currUser: string = null;
  topicName: string = null;
  isTranslCollapsed: boolean = true;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];

  constructor(private memoryService: MemoryService, private activeRoute:ActivatedRoute, private route: Router) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    let topicId: number = parseInt(this.activeRoute.snapshot.params['topicId']);
    this.topicName = this.memoryService.getTopicName(topicId);
    let topicOrder: string = this.activeRoute.snapshot.params['order'];
    this.searching = true;
    this.searchingMessage = 'Retrieving passages for topic ' + topicId + '...';
    this.memoryService.getPassagesForTopic(topicId).subscribe((passages: Passage[]) => {
      if (topicOrder === 'rand') {
        PassageUtils.shuffleArray(passages);
      }
      this.passages = passages;
      this.memoryService.getPreferences().subscribe(prefs => {
        if (prefs && prefs.length > 0) {
          for (let pref of prefs) {
            if (pref.key === "preferred_translation" && pref.value && pref.value.length > 0) {
              this.translation = pref.value;
              break;
            }
          }
        }
        this.currentIndex = 0;
        this.displayPassage();
        this.searching = false;
        this.searchingMessage = null;
      });
    });
  }

  swipe(action) {
    if (action === this.SWIPE_ACTION.RIGHT) {
      // this is a hack to make sure that setter gets called in the passage navigation component
      this.direction = 'prev' + new Date();
      this.prev();
    }

    if (action === this.SWIPE_ACTION.LEFT) {
      // this is a hack to make sure that setter gets called in the passage navigation component
      this.direction = 'next' + new Date();
      this.next();
    }
  }

  next() {
    if (this.currentIndex === (this.passages.length - 1)) {
      this.currentIndex = 0;
    } else {
      this.currentIndex += 1;
    }
    this.displayPassage();
  }

  prev() {
    if (this.currentIndex === 0) {
      this.currentIndex = this.passages.length - 1;
    } else {
      this.currentIndex -= 1;
    }
    this.displayPassage();
  }

  toggleTranslationOptions() {
    this.isTranslCollapsed = !this.isTranslCollapsed;
  }

  selectTranslation(translation: string): boolean {
    this.translation = translation;
    this.isTranslCollapsed = true;
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
      this.formattedPassageText = PassageUtils.getFormattedPassageText(this.passage, true);
      this.passageRef = PassageUtils.getPassageStringNoLineBreak(this.passage, this.currentIndex, this.passages.length, this.translation, true, true);
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }
}
