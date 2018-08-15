import { Component, OnInit } from '@angular/core';
import { Constants } from 'src/app/constants';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  templateUrl: './quote-search-result-actions.component.html'
})
export class QuoteSearchResultActionsComponent implements OnInit {
  actions: string[][] = [
    Constants.ACTION_GO_TO, 
    Constants.ACTION_COPY
  ];

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  selectAction(action: string) {
    console.log("QuoteSearchResultActionsComponent.selectAction() - Selected action:");
    console.log(action);
    this.activeModal.close(action);
  }
}
