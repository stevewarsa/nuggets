import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './main-menu.component.html'
})
export class MainMenuComponent implements OnInit {
  currUser: string = null;
  constructor(private route: Router, public memoryService: MemoryService) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
  }

  goTo(routerLocation: string) {
    this.route.navigate([routerLocation]);
  }
}
