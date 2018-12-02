import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';

@Component({
  templateUrl: './practice-nonbible-memory-facts.component.html',
  animations: [
    trigger('newFact', [
      transition('* => *', [
        style({opacity: 0.5, transform: 'scale(0.8)'}), 
        animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
      ])
    ])
  ]
})
export class PracticeNonbibleMemoryFactsComponent implements OnInit {
  facts: any[] = [];
  currentIndex = 0;
  currentFact: any = null;
  searching: boolean = false;
  searchingMessage: string = null;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  showingPrompt: boolean = true;
  questionIcon: string = null;
  iconFontColor: string = null;
  answer: string = "";

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currentUser = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.memoryService.getNonBibleMemoryFactList().subscribe((facts: any[]) => {
      console.log(facts);
      PassageUtils.shuffleArray(facts);
      this.facts = facts;
      this.currentIndex = 0;
      this.showFactPrompt();
    });
  }

  swipe(action) {
    if (window.screen.width > 500) { // 768px portrait
      // this is Desktop, so don't allow swipe
      console.log("Not allowing swipe");
      return;
    }
    if (action === this.SWIPE_ACTION.RIGHT) {
      this.direction = 'prev' + new Date();
      this.prev();
    }

    if (action === this.SWIPE_ACTION.LEFT) {
      this.direction = 'next' + new Date();
      this.next();
    }
  }

  next() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.facts.length, true);
    this.showFactPrompt();
  }

  prev() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.facts.length, false);
    this.showFactPrompt();
  }

  showFactPrompt() {
    this.showingPrompt = true;
    this.questionIcon = "lightbulb-o";
    this.iconFontColor = "yellow";
    this.currentFact = this.facts[this.currentIndex];
  }

  showAnswer() {
    if (!this.showingPrompt) {
      this.showFactPrompt();
    } else {
      this.showingPrompt = false;
      this.questionIcon = "question-circle";
      this.iconFontColor = "lightskyblue";
      this.answer = PassageUtils.updateLineFeedsWithBr(this.currentFact.answer);
    }
  }

  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }
}
