import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'mem-passage-navigation',
  templateUrl: './passage-navigation.component.html'
})
export class PassageNavigationComponent implements OnInit {
  @Output() nextEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() prevEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() answerEvent: EventEmitter<string>  = new EventEmitter<string>();
  @Output() stopPracticeEvent: EventEmitter<string>  = new EventEmitter<string>();
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
  questionIcon: string = null;
  isCollapsed: boolean = true;

  constructor() { }

  ngOnInit() {
    this.questionIcon = this._showPassageTextFirst ? "question-circle" : "lightbulb-o";
    this.iconFontColor = this.questionIcon === "question-circle" ? "lightskyblue" : "yellow";
  }

  toggleAdditionalOptions() {
    this.isCollapsed = !this.isCollapsed;
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
}
