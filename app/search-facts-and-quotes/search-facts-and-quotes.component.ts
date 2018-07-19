import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';

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

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    this.currentUser = this.memoryService.getCurrentUser();
    if (!this.currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
  }

  getSearchResultText(searchResult: any): string {
    let text: string = this.searchCategory === 'fact' ? searchResult.prompt + ' <br> ' + searchResult.answer : searchResult.answer;
    text = PassageUtils.updateAllMatches(this.searchPhrase, text);
    let re = /\n/gi;
    text = text.replace(re, '<br/>');
    return text;
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
      this.searchResults = results;
      this.searching = false;
      this.searchingMessage = null;
    })
  }
}
