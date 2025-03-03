import React, { useEffect, useState } from 'react';
import { Container, Spinner, Modal, Form, Button } from 'react-bootstrap';
import { Passage } from '../models/passage';
import { USER, translationsShortNms } from '../models/constants';
import { bibleService } from '../services/bible-service';
import { getBookName, getDisplayBookName } from '../models/passage-utils';
import { useAppSelector } from '../store/hooks';

interface BiblePassageProps {
  passage: Passage;
  translation: string;
  showPassageRef?: boolean;
  showVerseNumbers?: boolean;
  showVerseText?: boolean;
  showVerseModal?: boolean;
  onVerseSelection?: (startVerse: number, endVerse: number) => void;
  onVerseModalClose?: () => void;
}

const BiblePassage: React.FC<BiblePassageProps> = ({
  passage,
  translation,
  showPassageRef = true,
  showVerseNumbers = true,
  showVerseText = true,
  showVerseModal = false,
  onVerseSelection,
  onVerseModalClose,
}) => {
  const [localPassage, setLocalPassage] = useState<Passage>(passage);
  const [displayBookName, setDisplayBookName] = useState<string>('');
  const [displayChapter, setDisplayChapter] = useState<number>(-1);
  const [displayStartVerse, setDisplayStartVerse] = useState<number>(-1);
  const [displayEndVerse, setDisplayEndVerse] = useState<number>(-1);
  const [busy, setBusy] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  
  const currentUser = useAppSelector(state => state.user.currentUser);
  const user = currentUser || USER;

  useEffect(() => {
    console.log('BiblePassage.tsx -showVerseText = ' + showVerseText + ', passage passed in changed:', passage);

    // Scroll to top when passage changes
    window.scrollTo(0, 0);

    setDisplayBookName(getDisplayBookName(passage.bookId));
    setDisplayChapter(passage.chapter);
    setDisplayStartVerse(passage.startVerse);
    setDisplayEndVerse(passage.endVerse);

    // Only fetch verses if showVerseText is true
    if (showVerseText && (!passage.verses || passage.verses.length === 0)) {
      const fetchVerses = async () => {
        try {
          setBusy(true);
          setSeconds(0);
          const intervalId = setInterval(() => {
            setSeconds(s => s + 1);
          }, 1000);

          const fullPassage = await bibleService.getPassageText(
            user,
            translation,
            getBookName(passage.bookId),
            passage.chapter,
            passage.startVerse,
            passage.endVerse
          );

          clearInterval(intervalId);
          setBusy(false);

          // Update the local passage with the new verses
          const updatedPassage = {
            ...passage,
            verses: fullPassage.verses,
          };
          
          setLocalPassage(updatedPassage);

          // If the passage has verses, update it in the parent component
          if (fullPassage.verses && fullPassage.verses.length > 0) {
            // Update the passage in the parent's state to include verses
            passage.verses = fullPassage.verses;
          }
        } catch (error) {
          console.error('Error fetching passage verses:', error);
          setBusy(false);
        }
      };

      fetchVerses();
    } else {
      setLocalPassage(passage);
    }
  }, [passage, translation, showVerseText, user]);

  const translationName = translationsShortNms.find(t => t.code === translation)?.translationName || '';

  const handleVerseSelect = (verseNumber: number) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseNumber)) {
        return prev.filter(v => v !== verseNumber);
      }
      if (prev.length < 2) {
        return [...prev, verseNumber].sort((a, b) => a - b);
      }
      return [verseNumber];
    });
  };

  const handleSubmitVerseSelection = () => {
    if (selectedVerses.length > 0 && onVerseSelection) {
      const startVerse = selectedVerses[0];
      const endVerse = selectedVerses.length > 1 ? selectedVerses[1] : startVerse;
      onVerseSelection(startVerse, endVerse);
    }
    setSelectedVerses([]);
    onVerseModalClose?.();
  };

  const handleCloseModal = () => {
    setSelectedVerses([]);
    onVerseModalClose?.();
  };

  const getVerseText = (verse: any) => {
    return verse.verseParts.map(part => part.verseText).join(' ');
  };

  if (busy) {
    return (
      <Container className="text-white text-center">
        <Spinner animation="border" role="status" className="me-2" />
        <span>Loading passage... ({seconds} seconds)</span>
      </Container>
    );
  }

  if (showVerseText && !localPassage.verses) {
    return <Container className="text-white text-center">Loading passage...</Container>;
  }

  const getPassageReference = () => {
    const baseRef = `${displayBookName} ${displayChapter}:${displayStartVerse}`;
    if (displayEndVerse !== displayStartVerse) {
      return `${baseRef}-${displayEndVerse}${localPassage.passageRefAppendLetter || ''}`;
    }
    return `${baseRef}${localPassage.passageRefAppendLetter || ''}`;
  };

  return (
    <>
      <Container className="text-center">
        {showPassageRef && (
          <h2 className="passage-title mb-4 fw-bolder">
            {getPassageReference()} (<span style={{ color: '#B0E0E6' }}>{translationName}</span>)
          </h2>
        )}
        {showVerseText && localPassage.verses && (
          <p>
            {localPassage.verses.map((verse) => (
              <React.Fragment key={verse.verseParts[0].verseNumber}>
                {showVerseNumbers && localPassage.verses.length > 1 && (
                  <span className="verse-number me-2">
                    {verse.verseParts[0].verseNumber}
                  </span>
                )}
                {verse.verseParts.map((part, index) => (
                  <span
                    key={`${verse.verseParts[0].verseNumber}-${index}`}
                    className={`${
                      part.wordsOfChrist ? 'words-of-christ' : 'verse-text'
                    } fw-bold`}
                  >
                    {part.verseText}{' '}
                  </span>
                ))}
              </React.Fragment>
            ))}
          </p>
        )}
      </Container>

      <Modal show={showVerseModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Verses</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            Select one verse for a single verse, or two verses to define a range.
          </p>
          <div className="d-flex flex-column gap-2">
            {localPassage.verses?.map((verse) => (
              <Form.Check
                key={verse.verseParts[0].verseNumber}
                type="checkbox"
                id={`verse-${verse.verseParts[0].verseNumber}`}
                checked={selectedVerses.includes(verse.verseParts[0].verseNumber)}
                onChange={() => handleVerseSelect(verse.verseParts[0].verseNumber)}
                label={
                  <div>
                    <strong>{verse.verseParts[0].verseNumber}</strong>
                    <span className="ms-2">{getVerseText(verse)}</span>
                  </div>
                }
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitVerseSelection}
            disabled={selectedVerses.length === 0}
          >
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BiblePassage;