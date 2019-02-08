import { LoginComponent } from './login/login.component';
import { MyVerseListComponent } from './my-verse-list/my-verse-list.component';
import { SearchComponent } from './search/search.component';
import { PracticeComponent } from './practice/practice.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PracticeSetupComponent } from 'src/app/practice-setup/practice-setup.component';
import { EditPassageComponent } from 'src/app/edit-passage/edit-passage.component';
import { BibleSearchComponent } from 'src/app/bible-search/bible-search.component';
import { ViewChapterComponent } from 'src/app/view-chapter/view-chapter.component';
import { ChapterSelectionComponent } from 'src/app/chapter-selection/chapter-selection.component';
import { MainMenuComponent } from 'src/app/main-menu/main-menu.component';
import { TopicListComponent } from 'src/app/topic-list/topic-list.component';
import { BrowseTopicComponent } from 'src/app/browse-topic/browse-topic.component';
import { RandomTopicComponent } from 'src/app/random-topic/random-topic.component';
import { MemoryStatsComponent } from 'src/app/memory-stats/memory-stats.component';
import { BrowseNuggetsComponent } from 'src/app/browse-nuggets/browse-nuggets.component';
import { AddNonbibleMemoryFactComponent } from 'src/app/add-nonbible-memory-fact/add-nonbible-memory-fact.component';
import { PracticeNonbibleMemoryFactsComponent } from 'src/app/practice-nonbible-memory-facts/practice-nonbible-memory-facts.component';
import { AddNonbibleQuoteComponent } from 'src/app/add-nonbible-quote/add-nonbible-quote.component';
import { BrowseQuotesComponent } from 'src/app/browse-quotes/browse-quotes.component';
import { SearchFactsAndQuotesComponent } from 'src/app/search-facts-and-quotes/search-facts-and-quotes.component';
import { CopyDbToGuestComponent } from 'src/app/copy-db-to-guest/copy-db-to-guest.component';
import { SelectQuotesComponent } from 'src/app/select-quotes/select-quotes.component';
import { QuotesNoLoginComponent } from 'src/app/quotes-no-login/quotes-no-login.component';
import { ManageEmailsComponent } from 'src/app/manage-emails/manage-emails.component';

const routes: Routes = [
  {path: '', component: LoginComponent},
  {path: 'main', component: MainMenuComponent},
  {path: 'copyThisDbToGuest', component: CopyDbToGuestComponent},
  {path: 'practiceSetup', component: PracticeSetupComponent},
  {path: 'addMemoryFact', component: AddNonbibleMemoryFactComponent},
  {path: 'addQuote', component: AddNonbibleQuoteComponent},
  {path: 'practiceFacts', component: PracticeNonbibleMemoryFactsComponent},
  {path: 'searchFactsAndQuotes', component: SearchFactsAndQuotesComponent},
  {path: 'selectQuotes', component: SelectQuotesComponent},
  {path: 'search', component: SearchComponent},
  {path: 'bibleSearch', component: BibleSearchComponent},
  {path: 'chapterSelection', component: ChapterSelectionComponent},
  {path: 'edit', component: EditPassageComponent},
  {path: 'myverselist', component: MyVerseListComponent},
  {path: 'memorystats', component: MemoryStatsComponent},
  {path: 'topiclist', component: TopicListComponent},
  {path: 'randomtopic', component: RandomTopicComponent},
  {path: 'browsenuggets', component: BrowseNuggetsComponent},
  {path: 'manageEmails', component: ManageEmailsComponent},
  {path: 'browsequotes', component: BrowseQuotesComponent},
  {path: 'browsequotes/:quoteId', component: BrowseQuotesComponent},
  {path: 'quotes', component: QuotesNoLoginComponent},
  {path: 'browseTopic/:topicId/:order', component: BrowseTopicComponent},
  {path: 'viewPassage/:book/:chapter/:startVerse/:endVerse/:translation', component: ViewChapterComponent},
  {path: 'viewChapter/:book/:chapter/:translation', component: ViewChapterComponent},
  {path: 'practice', component: PracticeComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
