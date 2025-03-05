import { Container, Toast } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import BiblePassage from './BiblePassage';
import Toolbar from './Toolbar';
import { Passage } from '../models/passage';
import { bibleService } from '../services/bible-service';
import { booksByNum, USER, GUEST_USER } from '../models/constants';
import {
  getUnformattedPassageTextNoVerseNumbers,
  getNextBook,
  getDisplayBookName,
  openBibleHubLink, COPY_VERSE_RANGE, OPEN_IN_BIBLEHUB, ADD_TO_MEMORY_VERSES, OPEN_INTERLINEAR, openInterlinearLink
} from '../models/passage-utils';
import SwipeContainer from './SwipeContainer';
import copy from 'clipboard-copy';
import { useAppSelector } from '../store/hooks';

const ReadBibleChapter = () => {
  const { translation, book, chapter } = useParams();
  const navigate = useNavigate();
  const [passage, setPassage] = useState<Passage | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState(translation || 'niv');
  const [maxChapters, setMaxChapters] = useState<{ [key: string]: number }>({});
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [addToMemoryMode, setAddToMemoryMode] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [bibleHubMode, setBibleHubMode] = useState(false);
  const [interLinearMode, setInterLinearMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('#28a745');
  
  const currentUser = useAppSelector(state => state.user.currentUser);
  const user = currentUser || USER;
  const isGuestUser = currentUser === GUEST_USER;

  useEffect(() => {
    const fetchMaxChapters = async () => {
      try {
        const chapters = await bibleService.getMaxChaptersByBook();
        const maxChaptersMap = chapters.reduce((acc, { bookName, maxChapter }) => {
          acc[bookName] = maxChapter;
          return acc;
        }, {} as { [key: string]: number });
        setMaxChapters(maxChaptersMap);
      } catch (error) {
        console.error('Error fetching max chapters:', error);
      }
    };
    fetchMaxChapters();
  }, []);

  useEffect(() => {
    const fetchMaxVerse = async () => {
      if (!translation || !book || !chapter) return;

      try {
        const response = await bibleService.getMaxVersesByBookChapter(translation);
        const bookData = response[book];
        if (bookData) {
          const chapterData = bookData.find(([chapterNum]) => chapterNum === parseInt(chapter));
          if (chapterData) {            
            const bookId = Object.entries(booksByNum).find(([_, name]) => name === book)?.[0];
            
            if (!bookId) {
              console.error('Could not find bookId for book:', book);
              return;
            }

            const newPassage: Passage = {
              passageId: 0,
              bookId: parseInt(bookId),
              bookName: book,
              translationId: translation,
              translationName: '',
              chapter: parseInt(chapter),
              startVerse: 1,
              endVerse: chapterData[1],
              verseText: '',
              frequencyDays: 0,
              last_viewed_str: '',
              last_viewed_num: 0,
              passageRefAppendLetter: '',
              verses: [],
              topics: [],
              explanation: ''
            };
            setPassage(newPassage);
          }
        }
      } catch (error) {
        console.error('Error fetching max verse:', error);
      }
    };

    fetchMaxVerse();
  }, [translation, book, chapter]);

  const handleToolbarClick = (direction: string) => {
    if (!book || !chapter || !maxChapters[book]) return;

    const currentChapter = parseInt(chapter);
    const maxChapter = maxChapters[book];

    if (direction === 'RIGHT') {
      if (currentChapter < maxChapter) {
        // Move to next chapter in current book
        navigate(`/readBibleChapter/${currentTranslation}/${book}/${currentChapter + 1}`);
      } else {
        // Move to first chapter of next book
        const nextBook = getNextBook(book, 'next');
        if (nextBook) {
          navigate(`/readBibleChapter/${currentTranslation}/${nextBook}/1`);
        }
      }
    } else if (direction === 'LEFT') {
      if (currentChapter > 1) {
        // Move to previous chapter in current book
        navigate(`/readBibleChapter/${currentTranslation}/${book}/${currentChapter - 1}`);
      } else {
        // Move to last chapter of previous book
        const previousBook = getNextBook(book, 'previous');
        if (previousBook && maxChapters[previousBook]) {
          navigate(`/readBibleChapter/${currentTranslation}/${previousBook}/${maxChapters[previousBook]}`);
        }
      }
    }
  };

  const handleTranslationChange = (newTranslation: string) => {
    setCurrentTranslation(newTranslation);
    if (passage) {
      setPassage({ ...passage, verses: [], translationId: newTranslation });
    }
  };

  const handleVerseSelection = async (startVerse: number, endVerse: number) => {
    if (!passage || !book) return;

    if (copyMode) {
      handleCopyVerseRange(startVerse, endVerse);
      setCopyMode(false);
    } if (bibleHubMode) {
      const bibleHubPassage = {...passage,
        startVerse,
        endVerse
      };
      openBibleHubLink(bibleHubPassage);
      setBibleHubMode(false);
    } if (interLinearMode) {
      const interlinearPassage = {...passage,
        startVerse,
        endVerse
      };
      openInterlinearLink(interlinearPassage);
      setInterLinearMode(false);
    } else if (addToMemoryMode) {
      setAddToMemoryMode(false);
      // Don't allow guest users to add memory passages
      if (isGuestUser) {
        setToastMessage('Guest users cannot add memory passages');
        setToastBg('#dc3545');
        setShowToast(true);
        return;
      }
      
      try {
        const passageId = await bibleService.addMemoryPassage(
          user,
          currentTranslation,
          book,
          passage.chapter,
          startVerse,
          endVerse
        );

        console.log('Added memory passage with ID:', passageId);

        if (passageId > 0) {
          navigate('/practiceSetup');
        }
      } catch (error) {
        console.error('Error adding memory passage:', error);
      }
    }
  };

  const handleCopyVerseRange = async (startVerse: number, endVerse: number) => {
    if (!passage || !passage.verses) return;

    const selectedVerses = passage.verses.filter(
      verse => {
        const verseNum = verse.verseParts[0].verseNumber;
        return verseNum >= startVerse && verseNum <= endVerse;
      }
    );

    if (selectedVerses.length === 0) return;

    const reference = `${getDisplayBookName(passage.bookId)} ${passage.chapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ''}`;
    
    let verseText = '';
    selectedVerses.forEach(verse => {
      verse.verseParts.forEach(part => {
        verseText += part.verseText + ' ';
      });
    });

    const textToCopy = `${reference}\n\n${verseText.trim()}`;
    
    try {
      await copy(textToCopy);
      setToastMessage('Passage copied to clipboard!');
      setToastBg('#28a745');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setToastMessage('Failed to copy text');
      setToastBg('#dc3545');
      setShowToast(true);
    }
  };

  // Create additional menus based on user status
  const getAdditionalMenus = () => {
    const menus = [
      {...COPY_VERSE_RANGE, callbackFunction: () => {setCopyMode(true);setShowVerseModal(true);}},
      {...OPEN_IN_BIBLEHUB, callbackFunction: () => {setCopyMode(false);setBibleHubMode(true);setShowVerseModal(true);}},
      {...OPEN_INTERLINEAR, callbackFunction: () => {setCopyMode(false);setInterLinearMode(true);setShowVerseModal(true);}},
    ];
    
    // Only add "Add to Memory Verses" for non-guest users
    if (!isGuestUser) {
      menus.push({...ADD_TO_MEMORY_VERSES,
        callbackFunction: () => {
          setAddToMemoryMode(true);
          setCopyMode(false);
          setShowVerseModal(true);
        }
      });
    }
    return menus;
  };

  if (!passage || !translation || !book || !chapter || !maxChapters[book]) {
    return (
      <Container>
        <div className="text-white text-center">Loading chapter information...</div>
      </Container>
    );
  }

  return (
    <SwipeContainer
      onSwipeLeft={() => handleToolbarClick('RIGHT')}
      onSwipeRight={() => handleToolbarClick('LEFT')}
    >
      <Toolbar
        currentIndex={parseInt(chapter) - 1}
        totalCount={maxChapters[book]}
        clickFunction={handleToolbarClick}
        translation={currentTranslation}
        onTranslationChange={handleTranslationChange}
        currentPassage={passage}
        getUnformattedText={getUnformattedPassageTextNoVerseNumbers}
        additionalMenus={getAdditionalMenus()}
      />
      <BiblePassage 
        passage={passage}
        translation={currentTranslation}
        onVerseSelection={handleVerseSelection}
        showVerseModal={showVerseModal}
        onVerseModalClose={() => {
          setAddToMemoryMode(false);
          setCopyMode(false);
          setBibleHubMode(false);
          setInterLinearMode(false);
          setShowVerseModal(false);
        }}
      />

      <Toast
        onClose={() => setShowToast(false)}
        show={showToast}
        delay={3000}
        autohide
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: toastBg,
          color: 'white',
        }}
      >
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </SwipeContainer>
  );
};

export default ReadBibleChapter;