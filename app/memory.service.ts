import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { Http } from '@angular/http';
import { Observable, Subject } from 'rxjs';
import { Passage } from 'src/app/passage';
import { MemUser } from 'src/app/mem-user';
import { UpdatePassageParam } from 'src/app/update-passage-param';
import { Constants } from 'src/app/constants';

@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  private currentPassage: Passage = null;
  private currentUser: string = null;
  private _url:string = "http://ps11911.com/nuggets/server/";
  private cachedPassages: Passage[];
  private passageTextOverrides: Passage[] = null;
  private topicList: any[] = [];
  public GUEST_USER: string = 'Guest';
  currentPassageChangeEvent: Subject<Passage> = new Subject<Passage>();

  constructor(private httpService:Http) { }

  public getMemoryPassageList(user: string): Observable<Passage[]> {
    console.log('MemoryService.getMemoryPassageList - calling ' + this._url + 'get_mempsg_list.php...')
    return this.httpService.get(this._url + 'get_mempsg_list.php?user=' + user).pipe(map(res => res.json()));
  }

  public getMemoryPassageCount(user: string): Observable<number> {
    console.log('MemoryService.getMemoryPassageCount - calling ' + this._url + 'get_mempsg_count.php...')
    return this.httpService.get(this._url + 'get_mempsg_count.php?user=' + user).pipe(map(res => res.json()));
  }

  public getPassage(passage: Passage, user: string): Observable<Passage> {
    console.log('MemoryService.getPassage - calling ' + this._url + 'get_passage_text.php?user=' + user + '&translation=' + passage.translationName + '&book=' + passage.bookName + '&chapter=' + passage.chapter + '&start=' + passage.startVerse + '&end=' + passage.endVerse)
    return this.httpService.get(this._url + 'get_passage_text.php?user=' + user + '&translation=' + passage.translationName + '&book=' + passage.bookName + '&chapter=' + passage.chapter + '&start=' + passage.startVerse + '&end=' + passage.endVerse).pipe(map(res => res.json()));
  }

  public getPassageByKeys(book: string, chapter: number, startVerse: number, endVerse: number, translation: string): Observable<Passage> {
    let bookId: number = this.getBookId(book);
    console.log('MemoryService.getPassageByKeys - calling ' + this._url + 'get_passage_by_keys.php?bookId=' + bookId + '&translation=' + translation + '&chapter=' + chapter + '&startVerse=' + startVerse + '&endVerse=' + endVerse);
    return this.httpService.get(this._url + 'get_passage_by_keys.php?bookId=' + bookId + '&translation=' + translation + '&chapter=' + chapter + '&startVerse=' + startVerse + '&endVerse=' + endVerse).pipe(map(res => res.json()));
  }

  public getPassageById(passageId: number, selectedTranslation: string): Observable<Passage> {
    console.log('MemoryService.getPassageById - calling ' + this._url + 'get_nugget_by_id.php?nugget_id=' + passageId + '&translation=' + selectedTranslation);
    return this.httpService.get(this._url + 'get_nugget_by_id.php?nugget_id=' + passageId + '&translation=' + selectedTranslation).pipe(map(res => res.json()));
  }

  public getChapter(book: string, chapter: number, translation: string): Observable<Passage> {
    let bookId: number = this.getBookId(book);
    console.log('MemoryService.getChapter - calling ' + this._url + 'get_chapter.php?bookId=' + bookId + '&chapter=' + chapter + '&translation=' + translation);
    return this.httpService.get(this._url + 'get_chapter.php?bookId=' + bookId + '&chapter=' + chapter + '&translation=' + translation).pipe(map(res => res.json()));
  }

  public getBookId(bookName: string): number {
    let keys: string[] = Object.keys(Constants.booksByNum);
    for (let key of keys) {
      let keyNum: number = parseInt(key);
      let foundBookName: string = Constants.booksByNum[key];
      if (bookName === foundBookName) {
        return keyNum;
      }
    }
    return -1;
  }

  public getMemoryPassageTextOverrides(user: string): Observable<Passage[]> {
    console.log('MemoryService.getMemoryPassageTextOverrides - calling ' + this._url + 'get_mempsg_text_overrides.php?user=' + user + '...')
    return this.httpService.get(this._url + 'get_mempsg_text_overrides.php?user=' + user).pipe(map(res => res.json()));
  }

  public setMemoryPassageTextOverrides(passageTextOverrides: Passage[]) {
    this.passageTextOverrides = passageTextOverrides;
  }

  public getMemoryPassageTextOverride(passageId: number): Passage {
    if (!this.passageTextOverrides || this.passageTextOverrides.length === 0) {
      return null;
    }
    for (let overridePassage of this.passageTextOverrides) {
      if (overridePassage.passageId === passageId) {
        return overridePassage;
      }
    }
    return null;
  }

  public updatePassage(updatePassageParam: UpdatePassageParam): Observable<string> {
    console.log('MemoryService.updatePassage - calling ' + this._url + 'update_passage.php...')
    return this.httpService.post(this._url + 'update_passage.php', updatePassageParam).pipe(map(res => res.json()));
  }

  public getMaxChaptersByBook(): Observable<any[]> {
    console.log('MemoryService.getMaxChaptersByBook - calling ' + this._url + 'get_max_chapter_by_book.php...')
    return this.httpService.get(this._url + 'get_max_chapter_by_book.php').pipe(map(res => res.json()));
  }

  public getMaxVerseByBookChapter(translation: string): Observable<any[]> {
    console.log('MemoryService.getMaxVerseByBookChapter - calling ' + this._url + 'get_max_verse_by_book_chapter.php?translation=' + translation + '...')
    return this.httpService.get(this._url + 'get_max_verse_by_book_chapter.php?translation=' + translation).pipe(map(res => res.json()));
  }

  public getTopicList(): Observable<any[]> {
    console.log('MemoryService.getTopicList - calling ' + this._url + 'get_tag_list.php')
    return this.httpService.get(this._url + 'get_tag_list.php').pipe(map(res => res.json()));
  }

  public getQuoteList(): Observable<any[]> {
    console.log('MemoryService.getQuoteList - calling ' + this._url + 'get_quote_list.php?user=' + this.currentUser)
    return this.httpService.get(this._url + 'get_quote_list.php?user=' + this.currentUser).pipe(map(res => res.json()));
  }

  public setTopicList(topicList: any[]) {
    this.topicList = topicList;
  }

  public getTopicName(topicId: number): string {
    for (let topic of this.topicList) {
      if (topic.id === topicId) {
        return topic.name;
      }
    }
    return null;
  }

  public getPassagesForTopic(topicId: number): Observable<Passage[]> {
    console.log('MemoryService.getPassagesForTopic - calling ' + this._url + 'get_tag_list.php?tagId=' + topicId)
    return this.httpService.get(this._url + 'get_tag_list.php?tagId=' + topicId).pipe(map(res => res.json()));
  }

  public updateLastViewed(userName: string, passageId: number, lastViewedNum: number, lastViewedString: string): Observable<string> {
    var encodedLastViewedString = encodeURIComponent(lastViewedString);
    console.log('MemoryService.updateLastViewed - calling ' + this._url + 'update_last_viewed.php?user=' + userName + '&passageId=' + passageId + '&lastViewedNum=' + lastViewedNum + '&lastViewedStr=' + encodedLastViewedString + '...')
    return this.httpService.get(this._url + 'update_last_viewed.php?user=' + userName + '&passageId=' + passageId + '&lastViewedNum=' + lastViewedNum + '&lastViewedStr=' + encodedLastViewedString).pipe(map(res => res.json()));
  }

  public getAllUsers(): Observable<MemUser[]> {
    console.log('MemoryService.getAllUsers - calling ' + this._url + 'get_all_users.php');
    return this.httpService.get(this._url + 'get_all_users.php').pipe(map(res => res.json()));
  }

  public doLogin(userName: string): Observable<string> {
    console.log('MemoryService.doLogin - calling ' + this._url + 'nuggets_login.php?user=' + userName);
    return this.httpService.get(this._url + 'nuggets_login.php?user=' + userName).pipe(map(res => res.json()));
  }

  public getPreferences(): Observable<any[]> {
    console.log('MemoryService.getPreferences - calling ' + this._url + 'get_preferences.php?user=' + this.currentUser);
    return this.httpService.get(this._url + 'get_preferences.php?user=' + this.currentUser).pipe(map(res => res.json()));
  }

  public addPassage(passage: Passage): Observable<number> {
    console.log('MemoryService.addPassage - calling ' + this._url + 'add_memory_passage_new.php?user=' + this.currentUser + '&translation=' + passage.translationId + '&book=' + passage.bookName + '&chapter=' + passage.chapter + '&start=' + passage.startVerse + '&end=' + passage.endVerse + '&queue=N');
    return this.httpService.get(this._url + 'add_memory_passage_new.php?user=' + this.currentUser + '&translation=' + passage.translationId + '&book=' + passage.bookName + '&chapter=' + passage.chapter + '&start=' + passage.startVerse + '&end=' + passage.endVerse + '&queue=N').pipe(map(res => res.json()));
  }

  public addNonBibleMemoryFact(fact: any): Observable<string> {
    fact.user = this.currentUser;
    fact.category = 'fact';
    console.log('MemoryService.addNonBibleMemoryFact - calling ' + this._url + 'add_nonbible_memory_fact.php');
    return this.httpService.post(this._url + 'add_nonbible_memory_fact.php', fact).pipe(map(res => res.json()));
  }

  public addNonBibleQuote(quote: any): Observable<string> {
    quote.user = this.currentUser;
    quote.category = 'quote';
    console.log('MemoryService.addNonBibleMemoryFact - calling ' + this._url + 'add_nonbible_memory_fact.php');
    return this.httpService.post(this._url + 'add_nonbible_memory_fact.php', quote).pipe(map(res => res.json()));
  }

  public getNonBibleMemoryFactList(): Observable<any[]> {
    console.log('MemoryService.getNonBibleMemoryFactList - calling ' + this._url + 'get_fact_list.php?user=' + this.currentUser);
    return this.httpService.get(this._url + 'get_fact_list.php?user=' + this.currentUser).pipe(map(res => res.json()));
  }

  public demoteAllPassagesByOne(notIncludingPassageId: number): Observable<string> {
    console.log('MemoryService.demoteAllPassagesByOne - calling ' + this._url + 'demote_all_verses_by_1.php?user=' + this.currentUser + '&passage_id=' + notIncludingPassageId);
    return this.httpService.get(this._url + 'demote_all_verses_by_1.php?user=' + this.currentUser + '&passage_id=' + notIncludingPassageId).pipe(map(res => res.json()));
  }

  public searchBible(searchParam: any): Observable<Passage[]> {
    searchParam.user = this.currentUser;
    console.log('MemoryService.searchBible - calling ' + this._url + 'bible_search.php');
    return this.httpService.post(this._url + 'bible_search.php', searchParam).pipe(map(res => res.json()));
  }

  public searchFactOrQuote(searchParam: any): Observable<any[]> {
    console.log('MemoryService.searchFactOrQuote - calling ' + this._url + 'search_facts_and_quotes.php');
    return this.httpService.post(this._url + 'search_facts_and_quotes.php', searchParam).pipe(map(res => res.json()));
  }

  public getNuggetIdList(): Observable<any[]> {
    console.log('MemoryService.getNuggetIdList - calling ' + this._url + 'get_nugget_id_list.php');
    return this.httpService.get(this._url + 'get_nugget_id_list.php').pipe(map(res => res.json()));
  }

  public copyDbToGuestDb(): Observable<string> {
    console.log('MemoryService.copyDbToGuestDb - calling ' + this._url + 'copy_db_to_another.php?dbSource=SteveWarsa&dbDest=Guest');
    return this.httpService.get(this._url + 'copy_db_to_another.php?dbSource=SteveWarsa&dbDest=Guest').pipe(map(res => res.json()));
  }

  public setCurrentPassage(passage: Passage, currentUser: string) {
    this.currentPassage = passage;
    this.currentUser = currentUser;
    this.currentPassageChangeEvent.next(this.currentPassage);
  }

  public getCurrentPassage(): Passage {
    if (!this.currentPassage) {
      return null;
    }
    let override:Passage = this.getMemoryPassageTextOverride(this.currentPassage.passageId);
    if (override) {
      this.currentPassage.passageRefAppendLetter = override.passageRefAppendLetter;
      this.currentPassage.verses = override.verses;
    }
    return this.currentPassage;
  }

  public setCurrentUser(currentUser: string) {
    this.currentUser = currentUser;
  }

  public getCurrentUser(): string {
    return this.currentUser;
  }

  public getUpdatedCurrentPassageText(): Observable<Passage> {
    return this.getPassage(this.currentPassage, this.currentUser);
  }

  public setCachedPassages(passages: Passage[]) {
    this.cachedPassages = passages;
  }

  public getCachedPassages(): Passage[] {
    return this.cachedPassages;
  }
}
