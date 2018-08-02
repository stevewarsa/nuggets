import { Component, OnInit, AfterViewInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { MemUser } from 'src/app/mem-user';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  templateUrl: './select-user.component.html'
})
export class SelectUserComponent implements OnInit, AfterViewInit {
  excludeUser: string;
  users: MemUser[] = [];
  searching: boolean = true;
  searchingMessage: string = 'Retrieving all users...';

  constructor(private memoryService: MemoryService, public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.memoryService.getAllUsers().subscribe((users: MemUser[]) => {
      console.log(users);
      this.users = users;
      this.searching = false;
      this.searchingMessage = null;
    });
  }

  selectUser(user: MemUser) {
    console.log("SelectUserComponent.selectUser() - Selected user:");
    console.log(user);
    this.activeModal.close(user);
  }
}
