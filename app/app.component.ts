import { Component, OnInit, OnDestroy } from '@angular/core';
import { MemoryService } from 'src/app/memory.service';
import { Subscription } from 'rxjs';
import { Router, NavigationStart } from '@angular/router';

@Component({
  selector: 'mem-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Memory Verses';
  user: string = null;
  subscription: Subscription;

  constructor(private memoryService: MemoryService, private router: Router) { }

  ngOnInit() {
    this.user = this.memoryService.getCurrentUser();
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.user = this.memoryService.getCurrentUser();
      }
    });
  }
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
