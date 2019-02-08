import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';

@Component({
  templateUrl: './random-topic.component.html',
  animations: [
    trigger('newTopic', [
        transition('* => *', [
          style({opacity: 0.5, transform: 'scale(0.8)'}), 
          animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
        ])
      ])
    ]
})
export class RandomTopicComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  allTopics: any[] = [];
  currentIndex: number = 0;
  currentTopic: any = null;

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currentUser: string = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.searching = true;
    this.searchingMessage = 'Retrieving topic list...';
    this.memoryService.getTopicList().subscribe((topics: any[]) => {
      PassageUtils.shuffleArray(topics);
      this.allTopics = topics;
      this.memoryService.setTopicList(topics);
      this.currentIndex = 0;
      this.displayTopic();
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  swipe(action) {
    if (window.screen.width > 500) { // 768px portrait
      // this is desktop, so don't allow swipe
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
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.allTopics.length, true);
    this.displayTopic();
  }

  prev() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.allTopics.length, false);
    this.displayTopic();
  }

  private displayTopic() {
    this.currentTopic = this.allTopics[this.currentIndex];
  }

  browseSelectedTopic() {
    this.route.navigate(['browseTopic'], {queryParams: {topicId: this.currentTopic.id, order: 'rand'}});
  }

  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }
}
