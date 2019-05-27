import { Component, OnInit } from '@angular/core';
import { MemoryService } from '../memory.service';
import { Router } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard';
import { ToastrService } from 'ngx-toastr';
import { ModalHelperService } from '../modal-helper.service';
import { Constants } from '../constants';
import { PassageUtils } from '../passage-utils';

@Component({
  selector: 'mem-list-facts-and-quotes',
  templateUrl: './list-facts-and-quotes.component.html',
  styleUrls: ['./list-facts-and-quotes.component.css']
})
export class ListFactsAndQuotesComponent implements OnInit {
  searchCategory: string = 'quote';
  searching: boolean = false;
  searchingMessage: string = null;
  searchResults: any[] = [];
  currentUser: string = null;

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
    this.searching = true;
    this.searchingMessage = "Retrieving all quotes...";
    this.memoryService.getQuoteList().subscribe((results: any[]) => {
      console.log(results);
      this.searchResults = results;
      this.searching = false;
      this.searchingMessage = null;
    });
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
    let text: string = searchResult.answer;
    return PassageUtils.updateLineFeedsWithBr(text);
  }
}
