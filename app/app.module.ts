import { BrowserModule, HAMMER_GESTURE_CONFIG, HammerGestureConfig } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TopNavComponent } from './top-nav/top-nav.component';
import { ViewBiblePassageComponent } from './view-bible-passage/view-bible-passage.component';
import { LoginComponent } from './login/login.component';
import { MyVerseListComponent } from './my-verse-list/my-verse-list.component';
import { PassageNavigationComponent } from './passage-navigation/passage-navigation.component';
import { PracticeComponent } from './practice/practice.component';
import { PracticeSetupComponent } from './practice-setup/practice-setup.component';
import { SearchComponent } from './search/search.component';
import { ToastrModule } from 'ngx-toastr';
import { ClipboardModule } from 'ngx-clipboard';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpModule } from '@angular/http';
import { EditPassageComponent } from './edit-passage/edit-passage.component';
import { BibleSearchComponent } from './bible-search/bible-search.component';
import { ViewChapterComponent } from './view-chapter/view-chapter.component';
import { ChapterSelectionComponent } from './chapter-selection/chapter-selection.component';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { TopicListComponent } from './topic-list/topic-list.component';
import { BrowseTopicComponent } from './browse-topic/browse-topic.component';
import { RandomTopicComponent } from './random-topic/random-topic.component';
import { MemoryStatsComponent } from './memory-stats/memory-stats.component';
import { BrowseNuggetsComponent } from './browse-nuggets/browse-nuggets.component';
import { BrowsePassageComponent } from './browse-passage/browse-passage.component';
import { AddNonbibleMemoryFactComponent } from './add-nonbible-memory-fact/add-nonbible-memory-fact.component';
import { PracticeNonbibleMemoryFactsComponent } from './practice-nonbible-memory-facts/practice-nonbible-memory-facts.component';
import { AddNonbibleQuoteComponent } from './add-nonbible-quote/add-nonbible-quote.component';
import { BrowseQuotesComponent } from './browse-quotes/browse-quotes.component';
import { SearchFactsAndQuotesComponent } from './search-facts-and-quotes/search-facts-and-quotes.component';
import { CopyDbToGuestComponent } from './copy-db-to-guest/copy-db-to-guest.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { AlertComponent } from './alert/alert.component';
import { EnterEmailPopupComponent } from './enter-email-popup/enter-email-popup.component';
import { SelectQuotesComponent } from './select-quotes/select-quotes.component';
import { SelectUserComponent } from './select-user/select-user.component';
export class MyHammerConfig extends HammerGestureConfig {
  overrides = <any>{
    'pinch': { enable: false },
    'rotate': { enable: false }
  }
}

@NgModule({
  declarations: [
    AppComponent,
    TopNavComponent,
    ViewBiblePassageComponent,
    LoginComponent,
    MyVerseListComponent,
    PassageNavigationComponent,
    PracticeComponent,
    PracticeSetupComponent,
    SearchComponent,
    EditPassageComponent,
    BibleSearchComponent,
    ViewChapterComponent,
    ChapterSelectionComponent,
    MainMenuComponent,
    TopicListComponent,
    BrowseTopicComponent,
    RandomTopicComponent,
    MemoryStatsComponent,
    BrowseNuggetsComponent,
    BrowsePassageComponent,
    AddNonbibleMemoryFactComponent,
    PracticeNonbibleMemoryFactsComponent,
    AddNonbibleQuoteComponent,
    BrowseQuotesComponent,
    SearchFactsAndQuotesComponent,
    CopyDbToGuestComponent,
    ConfirmComponent,
    AlertComponent,
    EnterEmailPopupComponent,
    SelectQuotesComponent,
    SelectUserComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule, // required animations module (for toaster)
    ToastrModule.forRoot({
      timeOut: 1000
    }),
    ClipboardModule,
    NgbModule.forRoot(),
    FormsModule,
    HttpModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig
    }
  ],
  entryComponents: [
    ConfirmComponent, 
    AlertComponent, 
    EnterEmailPopupComponent, 
    SelectUserComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
