import { Component, OnInit } from '@angular/core';
import { Passage } from 'src/app/passage';
import { MemoryService } from 'src/app/memory.service';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';

@Component({
  templateUrl: './my-verse-list.component.html'
})
export class MyVerseListComponent implements OnInit {
  myPassageRefs: string[] = [];
  filteredPassageRefs: string[] = [];
  myPassages: Passage[] = [];
  passagesByRef: any = {};
  userName: string;
  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currentUser: string = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.myPassages = this.memoryService.getCachedPassages();
    this.userName = this.memoryService.getCurrentUser();
    if (this.myPassages && this.myPassages.length > 0) {
      this.createPassageRefList();
    } else {
      this.memoryService.getMemoryPassageList(this.userName).subscribe((passages: Passage[]) => {
        this.myPassages = passages;
        this.createPassageRefList();
      });
    }
  }

  filterItems(event: any) {
    this.filteredPassageRefs = this.myPassageRefs.filter(s => s.toUpperCase().includes(event.target.value.toUpperCase()))
  }

  goToPassage(passageRef: string) {
    let passage: Passage = this.passagesByRef[passageRef];
    console.log(passage);
    // let options: any = {
    //   timeOut: 5000, 
    //   enableHtml: true
    // };
    // this.toastr.info("<strong>Passage ID</strong>: " + passage.passageId + "<br><strong>Frequency Level</strong>: " + passage.frequencyDays + "<br><strong>Last Practiced</strong>: " + passage.last_viewed_str, "Passage Details", options);
    this.route.navigate(['/practice'], {queryParams: { mode: 'by_psgtxt', order: 'by_freq', passageId: passage.passageId}});

  }

  private createPassageRefList() {
    this.myPassageRefs = [];
    this.passagesByRef = {};
    this.myPassages = PassageUtils.sortPassagesByBibleBookOrder(this.myPassages);
    for (let passage of this.myPassages) {
      let passageRef: string = PassageUtils.getPassageStringNoIndex(passage, passage.translationName, true);
      this.myPassageRefs.push(passageRef);
      this.filteredPassageRefs.push(passageRef);
      this.passagesByRef[passageRef] = passage;
    }
  }
}
