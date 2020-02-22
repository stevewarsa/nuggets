import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';
import { ModalHelperService } from 'src/app/modal-helper.service';
import { Constants } from 'src/app/constants';
import { ClipboardService } from 'ngx-clipboard';
import { ToastrService } from 'ngx-toastr';

@Component({
  templateUrl: './search-facts-and-quotes.component.html'
})
export class SearchFactsAndQuotesComponent implements OnInit {
  searchCategory: string = 'quote';
  searchPhrase: string = null;
  searching: boolean = false;
  searchingMessage: string = null;
  searchResults: any[] = [];
  currentUser: string = null;
  resultStyle: string = "list";

  constructor(
    private memoryService: MemoryService, 
    private route: Router, 
    private clipboardService: ClipboardService,
    public toastr: ToastrService,
    private modalHelper: ModalHelperService) { }

  ngOnInit() {
    this.currentUser = this.memoryService.getCurrentUser();
    if (!this.currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
  }

  showActions(searchResult: any) {
    this.modalHelper.openQuoteSearchResultActions().result.then((selectedAction: string) => {
      if (selectedAction === Constants.ACTION_COPY[0]) {
        this.clipboardService.copyFromContent(searchResult.answer);
        this.toastr.info('The passage has been copied to the clipboard!', 'Success!');
      } else if (selectedAction === Constants.ACTION_GO_TO[0]) {
        this.route.navigate(['browsequotes', searchResult.objectionId]);
      }
    });
  }

  getSearchResultText(searchResult: any): string {
    let text: string = this.searchCategory === 'fact' ? searchResult.prompt + ' <br> ' + searchResult.answer : searchResult.answer;
    text = PassageUtils.updateAllMatches(this.searchPhrase, text);
    return PassageUtils.updateLineFeedsWithBr(text);
  }

  doSearch() {
    let searchParam = {
      category: this.searchCategory,
      searchPhrase: this.searchPhrase,
      user: this.currentUser
    };
    this.searching = true;
    this.searchingMessage = "Searching for '" + this.searchPhrase + "' in " + this.searchCategory + "...";
    this.memoryService.searchFactOrQuote(searchParam).subscribe((results: any[]) => {
      console.log(results);
      if (this.resultStyle === "list") {
        this.searchResults = results;
        this.searching = false;
        this.searchingMessage = null;
      } else {
        this.memoryService.searchQuotesResult = results;
        this.route.navigate(['browsequotes']);
      }
    });
  }
}
