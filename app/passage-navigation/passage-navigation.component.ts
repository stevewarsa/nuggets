import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import * as moment from 'moment';
import { ModalHelperService } from '../modal-helper.service';

@Component({
  selector: 'mem-passage-navigation',
  templateUrl: './passage-navigation.component.html'
})
export class PassageNavigationComponent implements OnInit {
  @Output() nextEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() prevEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() answerEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() stopPracticeEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() interlinearEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() clipboardEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() toggleEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() everyTimeEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() deleteEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Input() progressString: string;
  _frequencyString: string = null;
  @Input() set frequencyDays(frequency: number) {
    if (frequency === -1) {
      this._frequencyString = "Every Time";
    } else {
      this._frequencyString = "" + frequency;
    }
  }
  lastPracticedDateString: string;
  @Input() set lastPracticedDate (lastDate: number) {
    this.lastPracticedDateString = moment(lastDate).format('M/D/YYYY h:mm:ss a');
  }

  @Input() set swipeEvent(direction: string) {
    if (!direction) {
      return;
    }
    this.questionIcon = this._showPassageTextFirst ? "question-circle" : "lightbulb-o";
    this.iconFontColor = this.questionIcon === "question-circle" ? "lightskyblue" : "yellow";
  }
  private _showPassageTextFirst: boolean = false;
  private beenSet = false;
  iconFontColor: string = null;
  @Input() set showPassageTextFirst(showText: boolean) {
    if (!this.beenSet) {
      this._showPassageTextFirst = showText;
      this.beenSet = true;
    }
  }

  @Input() currentPassageForClipboard: string = null;
  questionIcon: string = null;
  isCollapsed: boolean = true;

  constructor(private modalHelperService: ModalHelperService) { }

  ngOnInit() {
    this.questionIcon = this._showPassageTextFirst ? "question-circle" : "lightbulb-o";
    this.iconFontColor = this.questionIcon === "question-circle" ? "lightskyblue" : "yellow";
  }

  goToInterlinear() {
    this.isCollapsed = !this.isCollapsed;
    this.interlinearEvent.emit();
  }

  clipboardCopy() {
    this.clipboardEvent.emit();
    this.isCollapsed = !this.isCollapsed;
  }

  toggleAdditionalOptions() {
    this.isCollapsed = !this.isCollapsed;
    this.toggleEvent.emit();
  }

  next() {
    this.questionIcon = this._showPassageTextFirst ? "question-circle" : "lightbulb-o";
    this.iconFontColor = this.questionIcon === "question-circle" ? "lightskyblue" : "yellow";
    this.nextEvent.emit('next');
  }

  prev() {
    this.questionIcon = this._showPassageTextFirst ? "question-circle" : "lightbulb-o";
    this.iconFontColor = this.questionIcon === "question-circle" ? "lightskyblue" : "yellow";
    this.prevEvent.emit('prev');
  }

  showAnswer() {
    this.questionIcon = this.questionIcon === "question-circle" ? "lightbulb-o" : "question-circle";
    this.iconFontColor = this.questionIcon === "question-circle" ? "lightskyblue" : "yellow";
    this.answerEvent.emit('answer');
  }

  stopPracticeSession() {
    this.stopPracticeEvent.emit('stop');
  }

  everyTime() {
    this.isCollapsed = !this.isCollapsed;
    this.modalHelperService.confirm({message: "Would you like to change practice frequency to 'Every Time'?", header: "Every Time?", labels: ["Change", "Keep As Is"]}).result.then(() => {
      console.log("Selected to change...");
      this.everyTimeEvent.emit('everyTime');
    }, () => {
      console.log("Did not select to change...");
    });
  }

  delete() {
    this.isCollapsed = !this.isCollapsed;
    this.modalHelperService.confirm({message: "Would you like to delete the current memory passage?", header: "Delete?", labels: ["Delete", "Keep"]}).result.then(() => {
      console.log("Selected to delete...");
      this.deleteEvent.emit('delete');
    }, () => {
      console.log("Did not select to delete...");
    });
  }}
