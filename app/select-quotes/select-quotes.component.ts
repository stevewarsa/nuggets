import { Component, OnInit, AfterViewInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { ModalHelperService } from 'src/app/modal-helper.service';
import { MemUser } from 'src/app/mem-user';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';

@Component({
  templateUrl: './select-quotes.component.html'
})
export class SelectQuotesComponent implements OnInit, AfterViewInit {
  quotesForSelection: any[] = [];
  myQuotes: any[] = [];
  selectedUser: MemUser = null;
  currUser: string = null;

  constructor(private route: Router, private memoryService: MemoryService, private modalHelper: ModalHelperService) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.memoryService.getQuoteList().subscribe((quotes: any[]) => {
      this.myQuotes = quotes;
    });
  }

  ngAfterViewInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so return
      return;
    }
    setTimeout(() => {
      this.modalHelper.openSelectUser(this.memoryService.getCurrentUser()).result.then((selectedUser: MemUser) => {
        this.selectedUser = selectedUser;
        this.memoryService.getQuoteList(this.selectedUser.userName).subscribe((quotes: any[]) => {
          let filteredQuotes: any[] = this.filterQuotesAlreadyAddedFromUser(quotes);
          PassageUtils.shuffleArray(filteredQuotes);
          this.quotesForSelection = filteredQuotes;
        });
      });
    }, 300);
  }

  private filterQuotesAlreadyAddedFromUser(quotesFromOtherUser: any[]): any[] {
    let returnArray: any[] = [];
    for (let quoteFromOtherUser of quotesFromOtherUser) {
      let foundInMyQuotes: boolean = false;
      for (let myQuote of this.myQuotes) {
        if (myQuote.sourceId === null || myQuote.fromUser === null) {
          continue;
        }
        if (quoteFromOtherUser.objectionId === myQuote.sourceId && this.selectedUser.userName === myQuote.fromUser) {
          foundInMyQuotes = true;
          break;
        }
      }
      if (foundInMyQuotes === false) {
        returnArray.push(quoteFromOtherUser);
      }
    }
    return returnArray;
  }

  private filterQuoteOutOfList(objectionId: number) {
    console.log("filterQuoteOutOfList - current quotes length: " + this.quotesForSelection.length);
    let result: any[] = this.quotesForSelection.filter(quote => {
      return quote.objectionId !== objectionId;
    });
    console.log("filterQuoteOutOfList - after filtering quotes length: " + result.length);
    this.quotesForSelection = result;
  }

  addQuote(quote: any) {
    let quoteToAdd: any = {
      prompt: quote.prompt,
      answer: quote.answer,
      sourceId: quote.objectionId,
      fromUser: this.selectedUser.userName
    };
    console.log(quoteToAdd);
    this.memoryService.addNonBibleQuote(quoteToAdd).subscribe((response: any) => {
      console.log('Response from addNonBibleQuote: ');
      console.log(response);
      if (response !== "error") {
        this.filterQuoteOutOfList(quote.objectionId);
      }
    });
  }
}
