import { Component, OnInit, OnDestroy } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { ToastrService } from 'ngx-toastr';
import { Passage } from 'src/app/passage';
import { PassageUtils } from 'src/app/passage-utils';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { CookieUtils } from 'src/app/cookie-utils';

@Component({
  selector: 'mem-top-nav',
  templateUrl: './top-nav.component.html'
})
export class TopNavComponent implements OnInit, OnDestroy {
  expanded = false;
  isCollapsed = true;
  passageTextForClipboard: string;
  currentUser: string;
  mobile: boolean = false;
  currentPassage: Passage;
  passageSubscription: any;

  constructor(public memoryService: MemoryService, public toastr: ToastrService, private router: Router) { }

  ngOnInit() {
    if (window.screen.width < 500) { // 768px portrait
      this.mobile = true;
    }
    this.currentUser = this.memoryService.getCurrentUser();
    this.currentPassage = this.memoryService.getCurrentPassage();
    this.passageTextForClipboard = this.getCurrentPassageText();
    this.passageSubscription = this.memoryService.currentPassageChangeEvent.subscribe((passage: Passage) => {
      this.currentPassage = this.memoryService.getCurrentPassage();
    });
  }

  ngOnDestroy() {
    // avoid memory leaks here by cleaning up after ourselves.
    if (this.passageSubscription) {  
       this.passageSubscription.unsubscribe();
    }
  }
  
  clipboardCopyComplete() {
    this.toastr.info('The passage has been copied to the clipboard!', 'Success!');
  }

  private getCurrentPassageText(): string {
    let currentPassage: Passage = this.memoryService.getCurrentPassage();
    if (currentPassage === null) {
      return null;
    }
    let passageTextForClipboard: string = PassageUtils.getPassageForClipboard(currentPassage);
    return passageTextForClipboard;
  }

  doLogout() {
    this.toggleExpanded();
    this.memoryService.setCurrentUser(null);
    CookieUtils.deleteCookie('user.name');
    this.router.navigate(['']);
  }

  toggleExpanded(): boolean {
    let currentPassage: Passage = this.memoryService.getCurrentPassage();
    if (currentPassage && currentPassage !== null && this.memoryService.getCurrentUser()) {
      this.passageTextForClipboard = this.getCurrentPassageText();
      if (this.passageTextForClipboard === "") {
        this.memoryService.getUpdatedCurrentPassageText().subscribe((passage: Passage) => {
          currentPassage.verses = passage.verses;
          this.memoryService.setCurrentPassage(currentPassage, this.memoryService.getCurrentUser());
          this.passageTextForClipboard = this.getCurrentPassageText();
        });
      }
    }
    this.isCollapsed = !this.isCollapsed;
    return false;
  }
}
