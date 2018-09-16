import { Component, OnInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { MemUser } from 'src/app/mem-user';
import { Router } from '@angular/router';
import { StringUtils } from 'src/app/string.utils';
import { ModalHelperService } from 'src/app/modal-helper.service';
import { PassageUtils } from 'src/app/passage-utils';

@Component({
  templateUrl: './manage-emails.component.html'
})
export class ManageEmailsComponent implements OnInit {
  email: string = "";
  users: MemUser[] = [];
  showInitializing: boolean = false;
  sent: boolean = false;
  nameSelected: string = null;
  currUser: string = null;
  responseMessage: string = "";
  mappings: any[] = [];

  constructor(private route: Router, private memoryService: MemoryService, private modalHelperService: ModalHelperService) { }

  ngOnInit() {
    this.currUser = this.memoryService.getCurrentUser();
    if (!this.currUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.showInitializing = true;
    this.memoryService.getAllUsers().subscribe((users: MemUser[]) => {
      console.log(users);
      this.users = PassageUtils.sortUserListByName(users);
      this.memoryService.getEmailMappings({user: this.currUser}).subscribe((mappings: any[]) => {
        this.mappings = mappings;
      });
      this.showInitializing = false;
    });
  }

  submit() {
    console.log("Here is the email: " + this.email + ", and here's the name: " + this.nameSelected);
    if (StringUtils.isEmpty(this.nameSelected) || StringUtils.isEmpty(this.email) || !StringUtils.isValidEmail(this.email)) {
      this.modalHelperService.alert({message: 'Must enter valid email address and select a user before submitting', header: 'Invalid Data'}).result.then((value: any) => {
        console.log("Invalid data... not sending request.");
      });
      return;
    }
    console.log("Sending request...");
    this.memoryService.addEmailMapping({user: this.currUser, userToMapTo: this.nameSelected, emailAddrToMap: this.email}).subscribe((response: string) => {
      console.log(response);
      this.sent = true;
      if (response !== "success") {
        this.responseMessage = "Unable to create email mapping for " + this.nameSelected + " with email " + this.email;
      } else {
        this.responseMessage = "Email mapping created for user " + this.nameSelected + " with email address " + this.email;
      }
    });
  }

  editMapping(mapping: any) {
    this.nameSelected = mapping.userName;
    this.email = mapping.emailAddress;
    console.log("editMapping - nameSelected: " + this.nameSelected + ", email: " + this.email);
  }
}
