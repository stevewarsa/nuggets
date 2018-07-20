import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';

@Component({
  templateUrl: './browse-quotes.component.html',
  animations: [
    trigger('newQuote', [
      transition('* => *', [
        style({opacity: 0.5, transform: 'scale(0.8)'}), 
        animate('300ms ease-in', style({opacity: 1, transform: 'scale(1)'}))
      ])
    ])
  ]
})
export class BrowseQuotesComponent implements OnInit {
  searching: boolean = false;
  searchingMessage: string = null;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  direction: string = null;
  allQuotes: any[] = [];
  currentIndex: number = 0;
  currentQuote: string = "";
  currentQuoteForClipboard: string = "";

  constructor(private memoryService: MemoryService, private route: Router, public toastr: ToastrService) { }

  ngOnInit() {
    let currentUser: string = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.searching = true;
    this.searchingMessage = 'Retrieving quote list...';
    this.memoryService.getQuoteList().subscribe((quotes: any[]) => {
      PassageUtils.shuffleArray(quotes);
      this.allQuotes = quotes;
      this.currentIndex = 0;
      this.displayQuote();
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  swipe(action) {
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
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.allQuotes.length, true);
    this.displayQuote();
  }

  prev() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.allQuotes.length, false);
    this.displayQuote();
  }

  private displayQuote() {
    this.currentQuote = PassageUtils.updateLineFeedsWithBr(this.allQuotes[this.currentIndex].answer);
    this.currentQuoteForClipboard = this.allQuotes[this.currentIndex].answer;
  }


  logIt(event: any, mode: string) {
    console.log('Here is the mode: ' + mode + '.  Here is the event: ');
    console.log(event);
  }

  clipboardCopyComplete() {
    this.toastr.info('The passage has been copied to the clipboard!', 'Success!');
  }
}
