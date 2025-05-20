import axios, { AxiosError } from 'axios';
import { Passage } from '../models/passage';
import { Quote } from '../models/quote';
import { ReadingHistoryEntry } from '../models/reading-history-entry';
import { Topic } from '../models/topic';
import {MemoryPracticeHistoryEntry} from "../models/memory-practice-history.ts";

interface BibleSearchPayload {
  book: string;
  translations: string[];
  testament: string;
  searchPhrase: string;
  user: string;
}

type SearchResultTuple = [string, string];

interface EmailSearchResultsPayload {
  emailTo: string;
  searchResults: SearchResultTuple[];
  searchParam: {
    book: string;
    translation: string;
    testament: string;
    searchPhrase: string;
    user: string;
  };
}

interface User {
  fileName: string;
  userName: string;
  numLastMod: number;
  lastModified: string;
}

interface AddQuotePayload {
  prompt: string;
  answer: string;
  sourceId: null;
  fromUser: null;
  user: string;
  category: string;
}

interface AddQuoteTopicPayload {
  user: string;
  topics: Topic[];
  quoteId: number;
}

interface AddQuoteTopicResponse {
  quoteId: number;
  message: string;
  topics: Topic[];
}

interface Link {
  key: string;
  label: string;
  action: string;
}

interface AddPassageTopicPayload {
  user: string;
  topicIds: number[];
  passageId: number;
}

export class BibleService {
  //private static readonly BASE_URL = 'https://ps11911.com/bible/api/';
  private static readonly BASE_URL = '/bible/api/';

  private handleError(error: unknown, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error(`Error ${operation}:`, {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
      });
    } else {
      console.error(`Error ${operation}:`, error);
    }
    throw error;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}get_all_users.php`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching users');
    }
  }

  async nuggetLogin(user: string, copyUser: string | null = null): Promise<string> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}nuggets_login.php`, {
        params: { user, copyUser }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'logging in');
    }
  }

  async copyDbToAnother(dbSource: string, dbDest: string): Promise<string> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}copy_db_to_another.php`, {
        params: { dbSource, dbDest }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'copying database');
    }
  }

  async addQuote(user: string, quoteText: string, prompt: string): Promise<Quote> {
    try {
      const payload: AddQuotePayload = {
        prompt,
        answer: quoteText,
        sourceId: null,
        fromUser: null,
        user,
        category: 'quote'
      };
      
      const response = await axios.post(
        `${BibleService.BASE_URL}add_nonbible_memory_fact.php`,
        payload
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'adding quote');
    }
  }

  async updateQuote(user: string, quote: Quote): Promise<string> {
    try {
      const response = await axios.post(
        `${BibleService.BASE_URL}update_quote.php`,
        {
          user,
          quote
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'updating quote');
    }
  }

  async addQuoteTopic(user: string, quoteId: number, topics: Topic[]): Promise<AddQuoteTopicResponse> {
    try {
      const payload: AddQuoteTopicPayload = {
        user,
        topics,
        quoteId
      };
      
      const response = await axios.post(
        `${BibleService.BASE_URL}add_quote_topic.php`,
        payload
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'adding quote topics');
    }
  }

  async addPassageTopics(user: string, topicIds: number[], passageId: number): Promise<string> {
    try {
      const payload: AddPassageTopicPayload = {
        user,
        topicIds,
        passageId
      };

      const response = await axios.post(
          `${BibleService.BASE_URL}add_passage_topic.php`,
          payload
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'adding passage topics');
    }
  }

  async getAdditionalLinks(user: string): Promise<Link[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_additional_links.php`,
        {
          params: { user }
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching additional links');
    }
  }

  async addAdditionalLink(user: string, label: string, action: string, key: string): Promise<string> {
    try {
      const response = await axios.post(
        `${BibleService.BASE_URL}add_additional_link.php`,
        {
          user,
          label,
          action,
          key
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'adding additional link');
    }
  }

  async addMemoryPassage(
    user: string,
    translation: string,
    book: string,
    chapter: number,
    start: number,
    end: number,
    queue: string = 'N'
  ): Promise<number> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}add_memory_passage.php`, {
        params: {
          user,
          translation,
          book,
          chapter,
          start,
          end,
          queue
        }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'adding memory passage');
    }
  }

  async updateReadingPlan(user: string, dayOfWeek: string, book: string, bookId: number, chapter: number): Promise<string> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}update_reading_plan.php`, {
        params: {
          user,
          dayOfWeek,
          book,
          bookId,
          chapter
        }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'updating reading plan');
    }
  }

  async updateLastViewed(user: string, passageId: number, lastViewedNum: number, lastViewedStr: string): Promise<void> {
    try {
      // Fire and forget - we don't await the response
      axios.get(`${BibleService.BASE_URL}update_last_viewed.php`, {
        params: {
          user,
          passageId,
          lastViewedNum,
          lastViewedStr: encodeURIComponent(lastViewedStr)
        }
      });
    } catch (error) {
      // Log error but don't throw since this is fire and forget
      console.error('Error updating last viewed:', error);
    }
  }

  async updatePassage(
    user: string, 
    passage: Passage, 
    newText: string | null = null, 
    passageRefAppendLetter: string | null = null
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${BibleService.BASE_URL}update_passage.php`,
        {
          user,
          passage,
          newText,
          passageRefAppendLetter
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'updating passage');
    }
  }

  async getAllReadingPlanProgress(
    user: string
  ): Promise<ReadingHistoryEntry[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_all_reading_plan_progress.php`,
        {
          params: { user },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching reading plan progress');
    }
  }

  async searchBible(payload: BibleSearchPayload): Promise<Passage[]> {
    try {
      const response = await axios.post(
        `${BibleService.BASE_URL}bible_search.php`,
        payload
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'searching bible');
    }
  }

  async getQuoteList(user: string, includeQuoteText: boolean = false): Promise<Quote[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_quote_list.php`,
        {
          params: {
            user,
            includeQuoteText,
          },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching quote list');
    }
  }

  async getQuoteText(user: string, quoteId: number): Promise<string> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_quote_text.php`,
        {
          params: { user, quoteId },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching quote text');
    }
  }

  async getTagList(user: string): Promise<Topic[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_tag_list.php`,
        {
          params: { user },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching tag list');
    }
  }

  async getPassageText(
    user: string,
    translation: string,
    book: string,
    chapter: number,
    start: number,
    end: number
  ): Promise<Passage> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_passage_text.php`,
        {
          params: {
            user,
            translation,
            book,
            chapter,
            start,
            end,
          },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching passage text');
    }
  }

  async getMemoryPassageTextOverrides(user: string): Promise<Passage[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_mempsg_text_overrides.php`,
        {
          params: { user },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching passage text overrides');
    }
  }

  async getNuggetIdList(user: string): Promise<Passage[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_nugget_id_list.php`,
        {
          params: { user },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching nugget ID list');
    }
  }

  async getMemoryPassageList(user: string): Promise<Passage[]> {
    try {
      const response = await axios.get(
        `${BibleService.BASE_URL}get_mempsg_list.php`,
        {
          params: { user },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching memory passages');
    }
  }

  async addNonMemoryPassage(
      user: string,
      translation: string,
      book: string,
      chapter: number,
      start: number,
      end: number
  ): Promise<number> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}add_nonmemory_passage.php`, {
        params: {
          user,
          translation,
          book,
          chapter,
          start,
          end
        }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'adding non-memory passage');
    }
  }

  async sendSearchResults(payload: EmailSearchResultsPayload): Promise<string> {
    try {
      const response = await axios.post(
          `${BibleService.BASE_URL}send_search_results.php`,
          payload
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'sending search results');
    }
  }

  async getMemoryPracticeHistory(user: string): Promise<MemoryPracticeHistoryEntry[]> {
    try {
      const response = await axios.get(`${BibleService.BASE_URL}get_mem_practice_history.php`, {
        params: { user }
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'fetching memory practice history');
    }
  }
}

export const bibleService = new BibleService();