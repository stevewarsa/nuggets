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
  shortBook: boolean = true;
  isTranslCollapsed: boolean = true;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  translationOptions: string[] = ['niv', 'nas', 'nkj', 'esv', 'kjv', 'csb', 'nlt', 'bbe', 'asv'];
  private openModal: NgbModalRef;
  private closeResult: string;
  private startVerseSelected: number = -1;
  private endVerseSelected: number = -1;
  
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

  selectForCopy(content) {
    this.openModal = this.modalService.open(content);
    this.openModal.result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  selectVerseForCopy(verseIndex: number) {
    if (this.startVerseSelected === -1 && this.endVerseSelected === -1) {
      this.startVerseSelected = verseIndex;
      this.endVerseSelected = verseIndex;
      return;
    } 
    if (this.startVerseSelected === -1) {
      this.startVerseSelected = verseIndex;
    } else {
      if (verseIndex > this.startVerseSelected) {
        this.endVerseSelected = verseIndex;
      } else {
        this.endVerseSelected = this.startVerseSelected;
        this.startVerseSelected = verseIndex;
      }
    }
    let selectedPassage = PassageUtils.clonePassage(this._passage);
    selectedPassage.startVerse = this.startVerseSelected;
    selectedPassage.endVerse = this.endVerseSelected;
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
