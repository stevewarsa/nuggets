import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';

@Component({
  selector: 'mem-view-bible-passage',
  templateUrl: './view-bible-passage.component.html',
  animations: [
    trigger('newPassage', [
        transition('* => *', [
          style({opacity: 0.5, transform: 'scale(0.8)'}), 
          animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
        ])
    ])
  ]
})
export class ViewBiblePassageComponent implements OnInit {
  @Input() currentIndex: number = -1;
  @Input() passagesLength: number = -1;
  @Input() selectedTranslation: string;
  @Input() showVerseNumbers: boolean = false;
  @Input() shortBook: boolean = true;
  @Input() showProgressInLine: boolean = false;
  @Input() allowSwipe: boolean = true;
  @Input() searching: boolean = false;
  @Input() searchingMessage: string;
  _defaultShowPsgText: boolean = false;
  _showPsgText: boolean = false;
  @Input() set showPsgText(showText: boolean) {
    this._showPsgText = showText;
    this._defaultShowPsgText = showText;
  }

  @Output() nextEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() prevEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() answerEvent: EventEmitter<string>  = new EventEmitter<string>();

  passageRef: string = "";
  formattedPassageText: string = null;
  currentHtmlDisplayed: string = null;
  _passage: Passage;
  progressString: string;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  interlinearURL: string;

  constructor(private route: Router) { }

  @Input() set passage(passage: Passage) {
    if (passage) {
      console.log("Setting passage...");
      this._passage = passage;
      if (passage.passageRefAppendLetter) {
        this.passageRef = PassageUtils.getPassageString(this._passage, this.currentIndex, this.passagesLength, this.selectedTranslation, this.shortBook, this.showProgressInLine, passage.passageRefAppendLetter);
      } else {
        this.passageRef = PassageUtils.getPassageString(this._passage, this.currentIndex, this.passagesLength, this.selectedTranslation, this.shortBook, this.showProgressInLine);
      }
      this.formattedPassageText = PassageUtils.getFormattedPassageText(this._passage, this.showVerseNumbers);
      this.currentHtmlDisplayed = this._showPsgText ? this.formattedPassageText : this.passageRef;
      this.progressString = (this.currentIndex + 1) + " of " + this.passagesLength;
      let urlQuery: string = null;
      if (this._passage.startVerse === this._passage.endVerse) {
        urlQuery = this._passage.bookName + "+" + this._passage.chapter + ":" + this._passage.startVerse + "&t=nas"
      } else {
        urlQuery = this._passage.bookName + "+" + this._passage.chapter + ":" + this._passage.startVerse + "-" + this._passage.endVerse + "&t=nas"
      }
      this.interlinearURL = "https://www.biblestudytools.com/interlinear-bible/passage/?q=" + urlQuery;
    }
  }

  ngOnInit() {
  }

  goToInterlinear() {
    window.open(this.interlinearURL, '_blank');
  }

  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }

  swipe(action) {
    if (!this.allowSwipe) {
      return;
    }
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
    this._showPsgText = this._defaultShowPsgText;
    this.nextEvent.emit('next');
  }

  prev() {
    this._showPsgText = this._defaultShowPsgText;
    this.prevEvent.emit('prev');
  }

  answer() {
    // show answer
    this.answerEvent.emit('answer');
    this._showPsgText = !this._showPsgText;
    this.currentHtmlDisplayed = this._showPsgText ? this.formattedPassageText : this.passageRef;
  }

  stop() {
    // stop the practice session
    this.route.navigate(['/practiceSetup']);
  }
}
