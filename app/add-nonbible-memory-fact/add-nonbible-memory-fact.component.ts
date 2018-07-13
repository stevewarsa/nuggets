import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-nonbible-memory-fact.component.html'
})
export class AddNonbibleMemoryFactComponent implements OnInit, AfterViewInit {
  prompt: string = "";
  answer: string = "";
  @ViewChild('promptInput') promptInput: ElementRef;

  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currentUser = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
  }

  ngAfterViewInit() {
    this.promptInput.nativeElement.focus();
  }

  changePrompt(event: any) {
    this.prompt = event.target.value;
  }
  changeAnswer(event: any) {
    this.answer = event.target.value;
  }

  submit() {
    let fact: any = {
      prompt: this.prompt,
      answer: this.answer
    };
    console.log(fact);
    this.memoryService.addNonBibleMemoryFact(fact).subscribe((response: any) => {
      console.log('Response from addNonBibleMemoryFact: ');
      console.log(response);
      this.route.navigate(['/main']);
    });
  }
}
