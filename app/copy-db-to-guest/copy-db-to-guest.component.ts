import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './copy-db-to-guest.component.html'
})
export class CopyDbToGuestComponent implements OnInit {
  error: boolean = false;
  searching: boolean = false;
  searchingMessage: string = null;
  errorMessage: string = null;
  currUser: string = null;

  constructor(private route: Router, private memoryService: MemoryService) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    if (this.currUser !== 'SteveWarsa') {
      this.error = true;
      this.errorMessage = "This feature is only available for the creator of this program, Steve Warsa";
      return;
    }
    this.searchingMessage = "Copying current database over to guest database..."
    this.searching = true;
    this.memoryService.copyDbToGuestDb().subscribe((response: string) => {
      console.log(response);
      if (response === 'success') {
        this.route.navigate(['main']);
      } else {
        this.error = true;
        this.errorMessage = response;
      }
    });
  }
}
