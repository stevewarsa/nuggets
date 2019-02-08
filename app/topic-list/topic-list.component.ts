import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MemoryService } from 'src/app/memory.service';

@Component({
  templateUrl: './topic-list.component.html'
})
export class TopicListComponent implements OnInit {
  filteredTopics: any[] = [];
  allTopics: any[] = [];
  constructor(private memoryService: MemoryService, private route: Router) { }

  ngOnInit() {
    let currentUser: string = this.memoryService.getCurrentUser();
    if (!currentUser) {
      // user not logged in, so re-route to login
      this.route.navigate(['']);
      return;
    }
    this.memoryService.getTopicList().subscribe((topics: any[]) => {
      this.allTopics = topics;
      this.filteredTopics = topics;
      this.memoryService.setTopicList(topics);
    });
  }

  filterItems(event: any) {
    this.filteredTopics = this.allTopics.filter(topic => topic.name.toUpperCase().includes(event.target.value.toUpperCase()))
  }

  browseTopic(topicToBrowse: any) {
    this.route.navigate(['browseTopic'], {queryParams: {topicId: topicToBrowse.id, order: 'rand'}});
  }
}
