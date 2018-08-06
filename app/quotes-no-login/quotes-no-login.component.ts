import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './quotes-no-login.component.html'
})
export class QuotesNoLoginComponent implements OnInit {
  searchingMessage: string = "Loading quotes...";
  constructor(private route: Router, private memoryService: MemoryService) { }

  ngOnInit() {
    let currUser = this.memoryService.getCurrentUser();
    if (!currUser) {
      this.memoryService.setCurrentUser(this.memoryService.GUEST_USER);
    }
    this.searchingMessage = "Routing to browse quotes for user " + this.memoryService.getCurrentUser() + "...";
    this.route.navigate(['/browsequotes']);
  }
}
