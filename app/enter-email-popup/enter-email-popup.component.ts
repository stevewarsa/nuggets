import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  templateUrl: './enter-email-popup.component.html'
})
export class EnterEmailPopupComponent implements OnInit {
  public email: string = null;
  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  handleClick() {
    console.log("handleClick");
    this.activeModal.close(this.email);
  }
}
