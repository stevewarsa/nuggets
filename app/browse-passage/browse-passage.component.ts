import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';

@Component({
  selector: 'mem-browse-passage',
  templateUrl: './browse-passage.component.html',
  animations: [
    trigger('newPassage', [
        transition('* => *', [
          style({opacity: 0.5, transform: 'scale(0.8)'}), 
          animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
        ])
    ])
  ]
})
export class BrowsePassageComponent implements OnInit {
  _passage: Passage = null;
  passageRef: string = null;
  formattedPassageText: string = null;
  progressString: string = null;
  shortBook: boolean = true;
  showProgressInLine: boolean = true;
  isTranslCollapsed: boolean = true;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  
  constructor() { }
  
  @Output() nextEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() prevEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() changeTranslationEvent: EventEmitter<string>  = new EventEmitter<string>();

  @Input() currentIndex: number = -1;
  @Input() passagesLength: number = -1;
  @Input() selectedTranslation: string;
  @Input() searching: boolean;
  @Input() searchingMessage: string;

  @Input() set passage(passage: Passage) {
    if (passage) {
      console.log("Setting passage...");
      this._passage = passage;
      this.passageRef = PassageUtils.getPassageString(this._passage, this.currentIndex, this.passagesLength, this.selectedTranslation, this.shortBook, this.showProgressInLine);
      this.formattedPassageText = PassageUtils.getFormattedPassageText(this._passage, true);
      this.progressString = (this.currentIndex + 1) + " of " + this.passagesLength;
    }
  }

  ngOnInit() {
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

  prev() {
    this.prevEvent.emit('prev');
  }

  next() {
    this.nextEvent.emit('next');
  }

  toggleTranslationOptions() {
    this.isTranslCollapsed = !this.isTranslCollapsed;
  }

  selectTranslation(translation: string): boolean {
    this.selectedTranslation = translation;
    this.isTranslCollapsed = true;
    this.changeTranslationEvent.emit(this.selectedTranslation);
    return false;
  }

  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }
}
