import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { MemoryService } from 'src/app/memory.service';
import { Passage } from 'src/app/passage';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Constants } from 'src/app/constants';
import { PassageUtils } from 'src/app/passage-utils';
import { Router } from '@angular/router';
import { UpdatePassageParam } from 'src/app/update-passage-param';

@Component({
  templateUrl: './edit-passage.component.html'
})
export class EditPassageComponent implements OnInit {
  currentUser: string;
  currentPassage: Passage;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  append: string;
  originalAppend: string;
  translation: string;
  translations: string[] = [];
  currPassageText: string;
  originalPassageText: string;
  originalTranslation: string;
  originalChanged: boolean = false;
  processing: boolean = false;
  processingMessage: string = null;
  rowsInTextArea: number = 10;
  colsInTextArea: number = 47;
  frequency: number;
  originalFrequency: number;
  frequencies: any[] = [];
  searchTranslations = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => this.translations.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 8))
    );

  constructor(private memoryService: MemoryService, private route: Router, private location: Location) { }

  ngOnInit() {
    this.currentUser = this.memoryService.getCurrentUser();
    if (!this.currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.currentPassage = this.memoryService.getCurrentPassage();
    this.chapter = this.currentPassage.chapter;
    this.bookName = Constants.bookAbbrev[this.currentPassage.bookName][1];
    this.translation = this.currentPassage.translationName;
    this.originalTranslation = this.translation;
    this.startVerse = this.currentPassage.startVerse;
    this.endVerse = this.currentPassage.endVerse;
    this.append = this.currentPassage.passageRefAppendLetter;
    this.originalAppend = this.append;
    this.frequency = this.currentPassage.frequencyDays;
    this.originalFrequency = this.frequency;
    let keys = Object.keys(Constants.translationMediumNames);
    for (let key of keys) {
      this.translations.push(key);
    }
    this.updateVerseText(true, false);
    this.frequencies.push({freqLabel: "Every Time", freqValue: -1});
    for (let i = 1; i <= 500; i++) {
      this.frequencies.push({freqLabel: i + "", freqValue: i});
    }
  }

  changeTranslation(translation: any) {
    this.translation = translation.item;
    this.updateVerseText(false, true);
  }

  changeStartVerse(event: any) {
    this.startVerse = parseInt(event.target.value);
    this.endVerse = this.startVerse;
    this.updateVerseText(false, true);
  }

  changeEndVerse(event: any) {
    this.endVerse = parseInt(event.target.value);
    this.updateVerseText(false, true);
  }

  changePassageText(event: any) {
    this.currPassageText = event.target.value;
    this.originalChanged = (this.originalPassageText !== this.currPassageText);
  }

  private createPassageFromChanges(): Passage {
    let passage: Passage = new Passage();
    passage.bookId = PassageUtils.getBookId(this.currentPassage.bookName);
    passage.bookName = this.currentPassage.bookName;
    passage.chapter = this.chapter;
    passage.translationName = this.translation;
    passage.translationId = this.translation;
    passage.startVerse = this.startVerse;
    passage.endVerse = this.endVerse;
    passage.frequencyDays = this.frequency;
    passage.passageId = this.currentPassage.passageId;
    return passage;
  }

  private updateVerseText(updateOriginal: boolean, ignoreOverride: boolean) {
    let passage = this.createPassageFromChanges();
    this.memoryService.getPassage(passage, this.memoryService.getCurrentUser()).subscribe((returnedPassage: Passage) => {
      if (!ignoreOverride) {
        let override: Passage = this.memoryService.getMemoryPassageTextOverride(this.currentPassage.passageId);
        if (override) {
          returnedPassage.verses = override.verses;
        }
      } else {
        console.log("Ignoring overrides....");
      }
      this.currPassageText = PassageUtils.getUnformattedPassageTextNoVerseNumbers(returnedPassage);
      if (updateOriginal) {
        this.originalPassageText = this.currPassageText;
      } else {
        this.originalChanged = (this.originalPassageText !== this.currPassageText);
      }
      this.rowsInTextArea = Math.ceil(this.currPassageText.length / this.colsInTextArea);
    });
  }

  submitChanges() {
    // assume that there have actually been changes made - button will be disabled 
    // until changes have been made, so I don't have to worry here
    let passage = this.createPassageFromChanges();
    let updatePassageParam: UpdatePassageParam = new UpdatePassageParam();
    // only set the 'newText' property if the user has modified the text 
    // only in that case, is it considered an override
    if (this.currPassageText !== this.originalPassageText) {
      updatePassageParam.newText = this.currPassageText;
    }
    updatePassageParam.passage = passage;
    updatePassageParam.passageRefAppendLetter = this.append;
    updatePassageParam.user = this.memoryService.getCurrentUser();
    this.processing = true;
    this.processingMessage = "Updating passage...";
    this.memoryService.updatePassage(updatePassageParam).subscribe((result: string) => {
      this.processing = false;
      this.processingMessage = null;
      if (result === "success") {
        if (updatePassageParam.newText) {
          // this means we updated an override, so need to reload our override list
          console.log('Updating memory passage text overrides...');
          this.memoryService.getMemoryPassageTextOverrides(updatePassageParam.user).subscribe((overrides: Passage[]) => {
            this.memoryService.setMemoryPassageTextOverrides(overrides);
            console.log('Memory passage text overrides have been updated.');
            this.location.back();
          });
        } else {
          this.location.back();
        }
      } else {
        console.log("Problem updating passage: " + result);
      }
    });
  }
}
