import { Verse } from 'src/app/verse';
import { Passage } from 'src/app/passage';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PracticeSettings } from 'src/app/practice-settings';
import { PassageUtils } from 'src/app/passage-utils';
import * as moment from 'moment';
import { Constants } from 'src/app/constants';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  templateUrl: './practice.component.html',
})
export class PracticeComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  searching: boolean = false;
  currentUser: string;
  showPsgRefFirst: boolean;
  showingPassageRef: boolean;
  currentIndex: number = 0;
  passages: Passage[] = [];
  currentPassage: Passage = null;
  searchingMessage: string;
  selectedTranslation: string;
  showVerseNumbers: boolean = true;
  startAtPassageId: number = -1;
  subscription: Subscription;

  constructor(private memoryService: MemoryService, private activeRoute:ActivatedRoute, private route: Router) { }

  ngOnInit() {
    this.currentUser = this.memoryService.getCurrentUser();
    if (!this.currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    let mode: string = this.activeRoute.snapshot.queryParamMap.get('mode');
    // console.log('mode=' + mode);
    this.showPsgRefFirst = mode === 'by_ref';
    this.showingPassageRef = this.showPsgRefFirst;
    this.showVerseNumbers = this.showPsgRefFirst;
    let order: string = this.activeRoute.snapshot.queryParamMap.get('order');
    // console.log('order=' + order);
    let passageId: string = this.activeRoute.snapshot.queryParamMap.get('passageId');
    if (passageId) {
      this.startAtPassageId = parseInt(passageId);
    }
    this.loading = true;
    this.searchingMessage = "Retrieving list of passages...";
    this.memoryService.getMemoryPassageList(this.currentUser).subscribe((passages: Passage[]) => {
      if (!passages || passages.length === 0) {
        // this user has not set up any passages yet, so route them to the place to add passages
        this.route.navigate(['search']);
        return;
      }
      // store the passages so that I can use these in other parts of the program
      this.memoryService.setCachedPassages(passages);
      // now sort them according to this practice session config
      let tempPassages: Passage[] = PassageUtils.sortAccordingToPracticeConfig(order, passages);
      // if user is practicing by frequency, make it more challenging by randomizing 
      // the passages within each frequency group
      if (order === "by_freq") {
        this.passages = PassageUtils.randomizeWithinFrequencyGroups(tempPassages);
      } else {
        this.passages = tempPassages;
      }
      this.loading = false;
      this.displayPassageOnScreen();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  next() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.passages.length, true);
    this.displayPassageOnScreen();
  }

  prev() {
    this.currentIndex = PassageUtils.getNextIndex(this.currentIndex, this.passages.length, false);
    this.displayPassageOnScreen();
  }

  showAnswer() {
    if (this.showPsgRefFirst && this.showingPassageRef) {
      this.searching = true;
      this.searchingMessage = "Calling server to get passage " + 
        (this.currentIndex + 1) + " with passage id " + 
        this.currentPassage.passageId + "...";
      let override:Passage = this.memoryService.getMemoryPassageTextOverride(this.currentPassage.passageId);
      if (override) {
        this.currentPassage.verses = override.verses;
        this.currentPassage.passageRefAppendLetter = override.passageRefAppendLetter;
        // hack to make sure the view bible passage component recognizes the change being made
        // see answer #8 here: https://stackoverflow.com/questions/34796901/angular2-change-detection-ngonchanges-not-firing-for-nested-object
        this.currentPassage = Object.assign({}, this.currentPassage);
        this.memoryService.setCurrentPassage(this.currentPassage, this.currentUser);
        this.searching = false;
        this.searchingMessage = null;
      } else {
        this.memoryService.getPassage(this.currentPassage, this.currentUser).subscribe((passage: Passage) => {
          passage.frequencyDays = this.currentPassage.frequencyDays;
          passage.last_viewed_num = this.currentPassage.last_viewed_num;
          passage.last_viewed_str = this.currentPassage.last_viewed_str;
          passage.passageId = this.currentPassage.passageId;
          passage.bookName = this.currentPassage.bookName;
          passage.translationId = this.currentPassage.translationId;
          passage.translationName = this.currentPassage.translationName;
          this.currentPassage = passage;
          this.memoryService.setCurrentPassage(this.currentPassage, this.currentUser);
          this.searching = false;
          this.searchingMessage = null;
        });
      } 
      this.showingPassageRef = false;
    } else {
      // here, we're showing the passage text first, so, answer is passage ref
      // no need to do anything - the view-bible-passage component will handle it
      this.showingPassageRef = true;
    }
  }

  displayPassageOnScreen() {
    this.searching = true;
    this.findStartAtPassage();
    let currPassage: Passage = this.passages[this.currentIndex];
    this.selectedTranslation = Constants.translationMediumNames[currPassage.translationName];
    this.searchingMessage = "Calling server to get passage " + (this.currentIndex + 1) + " with passage id " + 
      currPassage.passageId + "...";
    if (this.showPsgRefFirst) {
      let override:Passage = this.memoryService.getMemoryPassageTextOverride(currPassage.passageId);
      if (override) {
        currPassage.passageRefAppendLetter = override.passageRefAppendLetter;
      }
      this.showingPassageRef = true;
      this.completeDisplayPassage(currPassage);
    } else {
      // we're showing passage text first, so need to call server to get it...
      this.showingPassageRef = false;
      let override:Passage = this.memoryService.getMemoryPassageTextOverride(currPassage.passageId);
      if (override) {
        currPassage.passageRefAppendLetter = override.passageRefAppendLetter;
        currPassage.verses = override.verses;
        this.completeDisplayPassage(currPassage);
      } else {
        this.memoryService.getPassage(currPassage, this.currentUser).subscribe((passage: Passage) => {
          currPassage.verses = passage.verses;
          this.completeDisplayPassage(currPassage);
        });
      }
    }
  }

  private completeDisplayPassage(newPassage: Passage) {
    this.memoryService.setCurrentPassage(newPassage, this.currentUser);
    let dt = new Date();
    let dtNum = dt.getTime();
    let formattedDateTime = moment(dt).format('dddd, MMM d HH:mm:ss Z YYYY');
    // fire and forget...
    this.subscription = this.memoryService.updateLastViewed(this.currentUser, newPassage.passageId, dtNum, formattedDateTime).subscribe();
    this.searching = false;
    this.searchingMessage = null;
    this.currentPassage = newPassage;
  }

  private findStartAtPassage() {
    if (this.startAtPassageId !== -1) {
      let foundIndex = 0;
      for (let passage of this.passages) {
        if (passage.passageId === this.startAtPassageId) {
          this.currentIndex = foundIndex;
          break;
        }
        foundIndex++;
      }
      this.startAtPassageId = -1;
    }
  }
}
