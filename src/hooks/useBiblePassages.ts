import { useState, useEffect } from 'react';
import { Passage } from '../models/passage';
import { bibleService } from '../services/bible-service';
import {
  getBookName,
  getNextIndex,
  shuffleArray,
} from '../models/passage-utils';
import { Verse } from '../models/verse';
import { USER } from '../models/constants';
import { useAppSelector } from '../store/hooks';

export const useBiblePassages = () => {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [currentPassage, setCurrentPassage] = useState<Passage | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [translation, setTranslation] = useState<string>('niv');
  
  const currentUser = useAppSelector(state => state.user.currentUser);
  const user = currentUser || USER;

  useEffect(() => {
    const fetchData = async () => {
      try {
        let response: {
          nuggetId: number;
          bookId: number;
          chapter: number;
          startVerse: number;
          endVerse: number;
        }[] = await bibleService.getNuggetIdList(user);
        shuffleArray(response);
        const locPassages = response.map(
          (item) =>
            ({
              passageId: item.nuggetId,
              chapter: item.chapter,
              startVerse: item.startVerse,
              endVerse: item.endVerse,
              bookId: item.bookId,
              bookName: getBookName(item.bookId),
              verses: [] as Verse[],
            } as Passage)
        );
        setPassages(locPassages);

        // now make sure the current passage is initialized to display on the screen
        setCurrentPassage(locPassages[0]);
      } catch (error) {
        console.error('Error fetching passage:', error);
      }
    };

    fetchData();
  }, [user]);

  const handleToolbarClick = (indicator: string) => {
    switch (indicator) {
      case 'LEFT':
        handlePrev();
        break;
      case 'RIGHT':
        handleNext();
        break;
    }
  };

  const handleNext = () => {
    if (passages && passages.length > 0) {
      const nextIndex = getNextIndex(currentIndex, passages.length, true);
      setCurrentIndex(nextIndex);
      setCurrentPassage(passages[nextIndex]);
    }
  };

  const handlePrev = () => {
    if (passages && passages.length > 0) {
      const prevIndex = getNextIndex(currentIndex, passages.length, false);
      setCurrentIndex(prevIndex);
      setCurrentPassage(passages[prevIndex]);
    }
  };

  const handleTranslationChange = (newTranslation: string) => {
    setTranslation(newTranslation);
    if (currentPassage) {
      // Clear verses to force a refresh with new translation
      setCurrentPassage({ ...currentPassage, verses: [] });
    }
  };

  return {
    state: {
      currentPassage,
      currentIndex,
      totalCount: passages.length,
      translation,
    },
    functions: { 
      handleNext, 
      handlePrev, 
      handleToolbarClick,
      handleTranslationChange,
    },
  };
};