import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { NgbModalRef, NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

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
  versesForSelection: string[] = [];
  passageForClipboardAsArray: string[] = [];
  passageTextForClipboard: string = null;
  shortBook: boolean = true;
  isTranslCollapsed: boolean = true;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  private openModal: NgbModalRef;
  private closeResult: string;
  private startVerseSelected: number = -1;
  private endVerseSelected: number = -1;
  interlinearURL: string;
  
  constructor(private modalService: NgbModal, public toastr: ToastrService) { }
  
  @Output() nextEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() prevEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() changeTranslationEvent: EventEmitter<string>  = new EventEmitter<string>();

  @Input() showProgressInLine: boolean = true;
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
      this.versesForSelection = PassageUtils.getFormattedVersesAsArray(this._passage);
      this.passageForClipboardAsArray = PassageUtils.getPassageForClipboardAsArray(this._passage);
      this.startVerseSelected = -1;
      this.endVerseSelected = -1;
      if (this._passage.startVerse === this._passage.endVerse) {
        this.startVerseSelected = 0;
        this.endVerseSelected = 0;
        this.prepareForCopyToClipboard();
      }
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

  selectForCopy(content) {
    this.startVerseSelected = 0;
    this.endVerseSelected = this.versesForSelection.length - 1;
    this.prepareForCopyToClipboard();
    this.openModal = this.modalService.open(content);
    this.openModal.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  selectVerseForCopy(verseIndex: number, event: any) {
    console.log("selectVerseForCopy - here is the checkbox event:");
    console.log(event);
    if (event.target.checked === false) {
      // this user unchecked a checkbox
      console.log("User unselected checkbox with verse index: " + verseIndex);
      if (this.startVerseSelected === verseIndex && this.endVerseSelected === verseIndex) {
        this.startVerseSelected = -1;
        this.endVerseSelected = -1;
      } else {
        if (this.startVerseSelected === verseIndex) {
          if (this.endVerseSelected !== -1) {
            this.startVerseSelected = this.endVerseSelected;
          } else {
            this.startVerseSelected = -1;
          }
        }
        if (this.endVerseSelected === verseIndex) {
          if (this.startVerseSelected !== -1) {
            this.endVerseSelected = this.startVerseSelected;
          } else {
            this.endVerseSelected = -1;
          }
        }
      }
    } else {
      // if no verses are selected yet, set both start and end verse to the selected verse index number
      if (this.startVerseSelected === -1 && this.endVerseSelected === -1) {
        this.startVerseSelected = verseIndex;
        this.endVerseSelected = verseIndex;
      } else {
        // this means at least 1 verse is selected, so...
        // if the start verse is not selected
        if (this.startVerseSelected === -1) {
          this.startVerseSelected = verseIndex;
          if (this.endVerseSelected < this.startVerseSelected) {
            this.endVerseSelected = this.startVerseSelected;
          }
        } else {
          // this means, the start verse is already selected
          if (verseIndex >= this.startVerseSelected) {
            // so, if the verse selected this time is greater than the start verse
            // which was previously selected, then the currently selected verse can 
            // be safely set as the end verse
            this.endVerseSelected = verseIndex;
          } else {
            // this means that the currently selected verse is less than the previously
            // selected start verse, so set the end verse to the previously selected start verse
            // then set the start verse to the newly selected verse
            this.endVerseSelected = this.startVerseSelected;
            this.startVerseSelected = verseIndex;
          }
        }
      }
    }
    this.prepareForCopyToClipboard();
  }

  private prepareForCopyToClipboard() {
    console.log("selectVerseForCopy - startVerse: " + this.startVerseSelected + ", endVerse: " + this.endVerseSelected);
    if (this.startVerseSelected === -1 || this.endVerseSelected === -1) {
      console.log("Can't copy verses: selectVerseForCopy - startVerse: " + this.startVerseSelected + ", endVerse: " + this.endVerseSelected);
      return;
    }
    let selectedPassage = PassageUtils.deepClonePassage(this._passage);
    selectedPassage.startVerse = this.startVerseSelected + this._passage.startVerse;
    selectedPassage.endVerse = this.endVerseSelected + this._passage.startVerse;
    let psgRefForClipboard: string = PassageUtils.getPassageStringNoIndex(selectedPassage, null, false);
    psgRefForClipboard += "\n\n";
    let psgForClipboard: string = "";
    for (let i = this.startVerseSelected; i <= this.endVerseSelected; i++) {
      if (i === this.startVerseSelected) {
        psgForClipboard += this.passageForClipboardAsArray[i];
      } else {
        psgForClipboard += " " + this.passageForClipboardAsArray[i];
      }
    }
    psgForClipboard = psgForClipboard.trim();
    this.passageTextForClipboard = psgRefForClipboard + psgForClipboard;
  }

  getVerseDisplayForCheckbox(i: number, verse: string): string {
    return (i + this._passage.startVerse) + " " + verse;
  }

  clipboardCopyComplete() {
    this.toastr.info('The passage has been copied to the clipboard!', 'Success!');
    if (this.openModal) {
      this.openModal.close();
    }
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
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
