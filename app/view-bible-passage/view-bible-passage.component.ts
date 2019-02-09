import { UpdatePassageParam } from 'src/app/update-passage-param';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard';
import { StringUtils } from 'src/app/string.utils';
import { MemoryService } from 'src/app/memory.service';
import { ToastrService } from 'ngx-toastr';

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
  currentPassageForClipboard: string = null;
  _passage: Passage;
  progressString: string;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  interlinearURL: string;
  clipboardContent: string = null;


  constructor(
    private route: Router, 
    private clipboardService: ClipboardService,
    private memoryService: MemoryService,
    public toastr: ToastrService) { }

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

  copyToClipboard() {
    this.clipboardService.copyFromContent(this.clipboardContent);
    this.toastr.info('The passage has been copied to the clipboard!', 'Success!');
  }

  setFrequencyEveryTime() {
    let updatePassageParam: UpdatePassageParam = new UpdatePassageParam();
    let previousFrequency: number = this._passage.frequencyDays;
    this._passage.frequencyDays = -1;
    updatePassageParam.passage = this._passage;
    updatePassageParam.user = this.memoryService.getCurrentUser();
    this.memoryService.setFrequencyToEveryTime(updatePassageParam).subscribe((response: string) => {
      if (response === "success") {
        console.log("Frequency has been set to every time.");
      } else {
        console.log("Frequency has NOT been set to every time.");
        this._passage.frequencyDays = previousFrequency;
      }
    },
    () => {
      console.log("Frequency has NOT been set to every time.");
      this._passage.frequencyDays = previousFrequency;
    });
  }

  delete() {
    let updatePassageParam: UpdatePassageParam = new UpdatePassageParam();
    updatePassageParam.passage = this._passage;
    updatePassageParam.user = this.memoryService.getCurrentUser();
    this.memoryService.deleteMemoryPassage(updatePassageParam).subscribe((response: string) => {
      if (response === "success") {
        console.log("Memory passage has been deleted...");
      } else {
        console.log("Memory passage has NOT been deleted.");
      }
    },
    () => {
      console.log("Memory passage has NOT been deleted.");
    });
  }

  prepareForCopyToClipboard() {
    this.clipboardContent = PassageUtils.getPassageForClipboard(this._passage);
    console.log("First attempt to get content: " + this.clipboardContent);
    if (StringUtils.isEmpty(this.clipboardContent)) {
      this.searching = true;
      this.searchingMessage = "Retrieving passage text for copy to clipboard...";
      this.memoryService.getUpdatedCurrentPassageText().subscribe((passage: Passage) => {
        this._passage.verses = passage.verses;
        this.memoryService.setCurrentPassage(this._passage, this.memoryService.getCurrentUser());
        this.clipboardContent = PassageUtils.getPassageForClipboard(this._passage);
        console.log("Second attempt to get content: " + this.clipboardContent);
        this.searching = false;
        this.searchingMessage = null;
      });
    }
  }

  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }

  swipe(action) {
    if (window.screen.width > 500) { // 768px portrait
      // this is desktop, so don't allow swipe
      console.log("Not allowing swipe");
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
