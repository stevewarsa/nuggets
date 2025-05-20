import { Container, Button, Card, Row, Col } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReadingHistoryEntry } from '../models/reading-history-entry';
import { bibleService } from '../services/bible-service';
import { DateUtils } from '../models/date-utils';
import {
  booksByDay,
  booksByNum,
  bookAbbrev,
  TRANSLATION,
  GUEST_USER,
  getMaxChapterByBook
} from '../models/constants';
import { useAppSelector } from '../store/hooks';

const BibleReadingPlan: React.FC = () => {
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryEntry[]>([]);
  const [todaysReading, setTodaysReading] = useState<ReadingHistoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const user = useAppSelector(state => state.user.currentUser);
  const isGuestUser = user === GUEST_USER;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [readingPlanData] = await Promise.all([
          bibleService.getAllReadingPlanProgress(user),
        ]);

        setReadingHistory(readingPlanData);

        const currentDayOfWeek = DateUtils.getDayOfWeek();
        let nextReadingEntry: ReadingHistoryEntry;
        let readingEntriesForTodaysGroup = readingPlanData.filter(re => re.dayOfWeek === currentDayOfWeek);

        if (readingEntriesForTodaysGroup.length === 0) {
          // First time reading for this day of the week
          const bookToRead = booksByDay[currentDayOfWeek][0];
          nextReadingEntry = {
            bookName: bookToRead,
            bookId: parseInt(Object.entries(booksByNum).find(([_, name]) => name === bookToRead)?.[0] || '0'),
            chapter: 1,
            dayOfWeek: currentDayOfWeek,
            dateRead: DateUtils.formatDate(new Date(), "yyyy-MM-dd")
          };
        } else {
          // Continue from last reading
          nextReadingEntry = JSON.parse(JSON.stringify(readingEntriesForTodaysGroup[0]));

          const maxChap = getMaxChapterByBook(nextReadingEntry.bookName) || 1;

          if (nextReadingEntry.chapter === maxChap) {
            // Move to next book
            let currentBookIndex = booksByDay[currentDayOfWeek].findIndex(bk => bk === nextReadingEntry.bookName);
            if (currentBookIndex === (booksByDay[currentDayOfWeek].length - 1)) {
              // Start over from first book
              nextReadingEntry.bookName = booksByDay[currentDayOfWeek][0];
            } else {
              nextReadingEntry.bookName = booksByDay[currentDayOfWeek][currentBookIndex + 1];
            }
            nextReadingEntry.chapter = 1;
            nextReadingEntry.bookId = parseInt(
              Object.entries(booksByNum)
                .find(([_, name]) => name === nextReadingEntry.bookName)?.[0] || '0'
            );
          } else {
            nextReadingEntry.chapter++;
          }
          nextReadingEntry.dateRead = DateUtils.formatDate(new Date(), "yyyy-MM-dd");
        }

        setTodaysReading(nextReadingEntry);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching reading plan data:', error);
        setIsLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleReadClick = async () => {
    if (todaysReading) {
      if (isGuestUser) {
        // For guest users, just navigate to the chapter without updating the reading plan
        navigate(`/readBibleChapter/${TRANSLATION}/${todaysReading.bookName}/${todaysReading.chapter}`);
        return;
      }
      
      try {
        // Get the numeric book ID from booksByNum
        const bookId = parseInt(
          Object.entries(booksByNum)
            .find(([_, name]) => name === todaysReading.bookName)?.[0] || '0'
        );

        const response = await bibleService.updateReadingPlan(
          user,
          todaysReading.dayOfWeek,
          todaysReading.bookName,
          bookId,
          todaysReading.chapter
        );

        if (response === 'success') {
          navigate(`/readBibleChapter/${TRANSLATION}/${todaysReading.bookName}/${todaysReading.chapter}`);
        } else {
          console.error('Error updating reading plan:', response);
        }
      } catch (error) {
        console.error('Error updating reading plan:', error);
      }
    }
  };

  const handleReReadClick = (bookName: string, chapter: number) => {
    // Simply navigate to the ReadBibleChapter component without updating reading plan
    navigate(`/readBibleChapter/${TRANSLATION}/${bookName}/${chapter}`);
  };

  const getBookDisplayName = (bookName: string): string => {
    return bookAbbrev[bookName]?.[1] || bookName;
  };

  if (isLoading) {
    return (
      <Container className="py-4">
        <div className="text-white text-center">Loading reading plan...</div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {todaysReading && (
        <div className="text-center mb-5">
          <h2 className="text-white mb-3">Today's Reading</h2>
          <h3 className="text-white mb-4">
            {getBookDisplayName(todaysReading.bookName)} {todaysReading.chapter}
          </h3>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleReadClick}
          >
            Read
          </Button>
        </div>
      )}

      {readingHistory.length > 0 && (
        <div>
          <h3 className="text-white mb-3">Reading History</h3>
          <Row xs={1} md={2} lg={3} className="g-4">
            {readingHistory.map((entry, index) => (
              <Col key={index}>
                <Card bg="dark" text="white" className="h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>{entry.dayOfWeek}</span>
                    <span>{DateUtils.formatISODate(entry.dateRead)}</span>
                  </Card.Header>
                  <Card.Body className="text-center">
                    <Card.Title className="mb-3">
                      {getBookDisplayName(entry.bookName)}
                    </Card.Title>
                    <Card.Text>
                      Chapter {entry.chapter}
                    </Card.Text>
                    <Button 
                      variant="outline-light" 
                      size="sm"
                      onClick={() => handleReReadClick(entry.bookName, entry.chapter)}
                    >
                      Re-read
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Container>
  );
};

export default BibleReadingPlan;