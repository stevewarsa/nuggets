import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-nonbible-quote.component.html'
})
export class AddNonbibleQuoteComponent implements OnInit {
  quote: string = "";
  @ViewChild('quoteInput') promptInput: ElementRef;

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

  changeQuote(event: any) {
    //this.quote = event.target.value;
    const textArea = this.promptInput.nativeElement;
    textArea.style.overflow = 'hidden';
    textArea.style.height = '0px';
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  submit() {
    this.quote = this.promptInput.nativeElement.value;
    let quote: any = {
      prompt: this.quote.substring(0, this.quote.length > 10 ? 10 : this.quote.length) + '...',
      answer: this.quote,
      sourceId: null,
      fromUser: null
    };
    console.log(quote);
    this.memoryService.addNonBibleQuote(quote).subscribe((response: any) => {
      console.log('Response from addNonBibleQuote: ');
      console.log(response);
      this.route.navigate(['browsequotes/' + response.objectionId]);
    });
  }
}
