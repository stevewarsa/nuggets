import { LoginComponent } from './login/login.component';
import { MyVerseListComponent } from './my-verse-list/my-verse-list.component';
import { SearchComponent } from './search/search.component';
import { PracticeComponent } from './practice/practice.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PracticeSetupComponent } from 'src/app/practice-setup/practice-setup.component';
import { EditPassageComponent } from 'src/app/edit-passage/edit-passage.component';
import { BibleSearchComponent } from 'src/app/bible-search/bible-search.component';

const routes: Routes = [
  {path: '', component: LoginComponent},
  {path: 'practiceSetup', component: PracticeSetupComponent},
  {path: 'search', component: SearchComponent},
  {path: 'bibleSearch', component: BibleSearchComponent},
  {path: 'edit', component: EditPassageComponent},
  {path: 'myverselist', component: MyVerseListComponent},
  {path: 'practice/:mode/:order/:passageId', component: PracticeComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
