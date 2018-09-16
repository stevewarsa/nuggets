import { Passage } from 'src/app/passage';
import { MemUser } from 'src/app/mem-user';
import { Component, OnInit } from '@angular/core';
import { CookieUtils } from 'src/app/cookie-utils';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';
import { PassageUtils } from 'src/app/passage-utils';

@Component({
  selector: 'mem-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  showInitializing: boolean = false;
  showLoggingIn: boolean = false;
  userName: string;
  users: MemUser[] = [];
  user: any = {
    name: "",
    nameSelected: "",
    rememberMe: false
  };
  errorMessage: string = null;

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    this.showInitializing = true;
    this.userName = CookieUtils.getCookie('user.name');
    if (this.userName) {
      this.memoryService.setCurrentUser(this.userName);
      this.showInitializing = false;
      // found cookie, so allowing auto-login, but first
      // load up the overrides so that the rest of the app can use them
      this.memoryService.getMemoryPassageTextOverrides(this.userName).subscribe((overrides: Passage[]) => {
        this.memoryService.setMemoryPassageTextOverrides(overrides);
        this.route.navigate(['/main']);
      });
    } else {
      this.memoryService.getAllUsers().subscribe((users: MemUser[]) => {
        console.log(users);
        this.users = PassageUtils.sortUserListByName(users);
        this.showInitializing = false;
      });
    }
  }

  private userExists(enteredUser: string): boolean {
    for (let memUser of this.users) {
      if (enteredUser === memUser.userName) {
        return true;
      }
    }
    return false;
  }

  login() {
    if ((!this.user.name || this.user.name.trim() === "") && (!this.user.nameSelected || this.user.nameSelected.trim() === "")) {
      this.errorMessage = "Please enter a user name or, if you've already logged in, select a user id";
      return;
    }
    let uName = this.user.name && this.user.name.trim() !== "" ? this.user.name : this.user.nameSelected;
    let newUserName = uName.trim().replace(/\s+/g, '');
    if (newUserName !== uName) {
      this.errorMessage = "User name cannot have spaces";
      return;
    }
    newUserName = uName.trim().replace(/[^a-z0-9]/gi,'');
    if (newUserName !== uName.trim()) {
      this.errorMessage = "User name is only allowed to have letters or numbers";
      return;
    }
    // now, make sure that the user name (if manually entered), does not yet exist
    if (this.user.name && this.user.name.trim() !== "") {
      let trimmedUserName: string = this.user.name.trim();
      if (this.userExists(trimmedUserName)) {
        this.errorMessage = "User name '" + trimmedUserName + "' already exists.  Either select user name from drop down list, or choose another name.";
        return;
      }
    }
    this.showLoggingIn = true;
    this.user.name = newUserName;
    this.user.nameSelected = newUserName; 
    this.memoryService.doLogin(newUserName).subscribe((response: string) => {
      console.log("Login complete - data=" + response);
      if (response === "success") {
        this.memoryService.setCurrentUser(newUserName);
        if (this.user.rememberMe) {
          // write cookie so they won't have to login next time
          console.log("Writing out cookies for automatic login");
          CookieUtils.setCookie('user.name', newUserName, 365);
        }
        // load up the overrides so that the rest of the app can use them
        this.memoryService.getMemoryPassageTextOverrides(newUserName).subscribe((overrides: Passage[]) => {
          this.memoryService.setMemoryPassageTextOverrides(overrides);
          this.route.navigate(['/main']);
        });
      } else {
        this.showLoggingIn = false;
        this.errorMessage = response;
      }
    });
  }
}
