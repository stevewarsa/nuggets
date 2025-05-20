import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { bibleService } from '../services/bible-service';
import { setMemoryPassages, setMemoryPassagesLoading, setMemoryPassagesError } from '../store/memoryPassageSlice';

interface TranslationStat {
  translation: string;
  count: number;
  percentage: number;
}

const MemoryStats: React.FC = () => {
  const [translationStats, setTranslationStats] = useState<TranslationStat[]>([]);
  
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user.currentUser);
  const { passages, loading, error, lastLoaded } = useAppSelector(state => state.memoryPassage);
  
  // Calculate if we need to refresh the data (e.g., if it's older than 5 minutes)
  const needsRefresh = !lastLoaded || (Date.now() - lastLoaded > 5 * 60 * 1000);

  useEffect(() => {
    const fetchMemoryPassages = async () => {
      // Only fetch if we don't have passages or they need to be refreshed
      if (passages.length === 0 || needsRefresh) {
        try {
          dispatch(setMemoryPassagesLoading());
          const memoryPassages = await bibleService.getMemoryPassageList(user);
          dispatch(setMemoryPassages(memoryPassages));
        } catch (error) {
          console.error('Error fetching memory passages:', error);
          dispatch(setMemoryPassagesError('Failed to load memory passages'));
        }
      }
    };
    if (user) {
      fetchMemoryPassages();
    }
  }, [dispatch, user, passages.length, needsRefresh]);

  useEffect(() => {
    // Calculate translation statistics whenever passages change
    if (passages.length > 0) {
      // Count passages by translation
      const translationCounts: { [key: string]: number } = {};
      
      passages.forEach(passage => {
        const translation = passage.translationName;
        translationCounts[translation] = (translationCounts[translation] || 0) + 1;
      });
      
      // Convert to array of stats with percentages
      const stats: TranslationStat[] = Object.entries(translationCounts).map(([translation, count]) => ({
        translation,
        count,
        percentage: (count / passages.length) * 100
      }));
      
      // Sort by count (descending)
      stats.sort((a, b) => b.count - a.count);
      
      setTranslationStats(stats);
    }
  }, [passages]);

  // Calculate total verse count
  const totalVerseCount = passages.reduce((total, passage) => {
    return total + (passage.endVerse - passage.startVerse + 1);
  }, 0);

  // Calculate average verses per passage
  const avgVersesPerPassage = passages.length > 0 
    ? (totalVerseCount / passages.length).toFixed(2) 
    : '0';

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status" />
        <p className="text-white mt-2">Loading memory passage statistics...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          Error loading memory passages: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="text-white mb-4">Memory Passage Stats</h1>
      
      <Row className="mb-4">
        <Col md={4}>
          <Card bg="dark" text="white" className="h-100">
            <Card.Header>Passage Count</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <h2 className="mb-0">{passages.length}</h2>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card bg="dark" text="white" className="h-100">
            <Card.Header>Total Verse Count</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <h2 className="mb-0">{totalVerseCount}</h2>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card bg="dark" text="white" className="h-100">
            <Card.Header>Avg Verses per Passage</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <h2 className="mb-0">{avgVersesPerPassage}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card bg="dark" text="white">
        <Card.Header>Percentages By Translation</Card.Header>
        <Card.Body>
          {translationStats.length > 0 ? (
            <Row>
              {translationStats.map((stat) => (
                <Col key={stat.translation} md={6} lg={4} className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span>{stat.translation}</span>
                    <span>{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div 
                      className="progress-bar" 
                      role="progressbar" 
                      style={{ width: `${stat.percentage}%` }}
                      aria-valuenow={stat.percentage} 
                      aria-valuemin={0} 
                      aria-valuemax={100}
                    ></div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <p className="text-center">No memory passages found</p>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MemoryStats;