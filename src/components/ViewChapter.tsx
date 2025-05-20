import { Container, Form, Row, Col, Collapse } from 'react-bootstrap';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {translations, bookAbbrev, getMaxChapterByBook} from '../models/constants';

const ViewChapter = () => {
  const [selectedTranslation, setSelectedTranslation] = useState('niv');
  const [selectedBook, setSelectedBook] = useState('genesis');
  const [currentBookMaxChapter, setCurrentBookMaxChapter] = useState(50);
  const [isBookOpen, setIsBookOpen] = useState(true);
  const [isChapterOpen, setIsChapterOpen] = useState(false);

  const handleBookChange = (book: string) => {
    setSelectedBook(book);
    setCurrentBookMaxChapter(getMaxChapterByBook(book));
    setIsBookOpen(false);
    setIsChapterOpen(true);
  };

  const toggleBookPanel = () => {
    setIsBookOpen(!isBookOpen);
    if (!isBookOpen) {
      setIsChapterOpen(false);
    }
  };

  const toggleChapterPanel = () => {
    setIsChapterOpen(!isChapterOpen);
    if (!isChapterOpen) {
      setIsBookOpen(false);
    }
  };

  return (
    <Container className="p-4">
      <h1 className="text-white mb-4">View Bible Chapter</h1>
      <Row className="mb-4">
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label className="text-white">Translation</Form.Label>
            <Form.Select
              value={selectedTranslation}
              onChange={(e) => setSelectedTranslation(e.target.value)}
            >
              {translations.map((trans) => (
                <option key={trans.code} value={trans.code}>
                  {trans.translationName}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <div className="mb-4">
        <div 
          className="bg-dark p-3 rounded mb-3 cursor-pointer"
          onClick={toggleBookPanel}
          style={{ cursor: 'pointer' }}
        >
          <h2 className="text-white mb-0 d-flex justify-content-between align-items-center">
            <span>Select Book {selectedBook && !isBookOpen && `(${bookAbbrev[selectedBook][0]})`}</span>
            <span>{isBookOpen ? '▼' : '▶'}</span>
          </h2>
        </div>
        <Collapse in={isBookOpen}>
          <div className="bg-dark p-3 rounded border border-secondary">
            <div className="d-flex flex-wrap gap-3">
              {Object.entries(bookAbbrev).map(([key, [shortName]]) => (
                <Form.Check
                  key={key}
                  type="radio"
                  id={`book-${key}`}
                  label={shortName}
                  name="selectedBook"
                  className="text-white"
                  checked={selectedBook === key}
                  onChange={() => handleBookChange(key)}
                  inline
                />
              ))}
            </div>
          </div>
        </Collapse>
      </div>

      <div className="mb-4">
        <div 
          className="bg-dark p-3 rounded mb-3"
          onClick={toggleChapterPanel}
          style={{ cursor: 'pointer' }}
        >
          <h2 className="text-white mb-0 d-flex justify-content-between align-items-center">
            <span>Select Chapter {!isChapterOpen && selectedBook && `(1-${currentBookMaxChapter})`}</span>
            <span>{isChapterOpen ? '▼' : '▶'}</span>
          </h2>
        </div>
        <Collapse in={isChapterOpen}>
          <div className="bg-dark p-3 rounded border border-secondary">
            <div className="d-flex flex-wrap justify-content-center gap-2">
              {[...Array(currentBookMaxChapter)].map((_, i) => (
                <Link
                  key={i + 1}
                  to={`/readBibleChapter/${selectedTranslation}/${selectedBook}/${i + 1}`}
                  className="btn btn-outline-light"
                  style={{ minWidth: '60px' }}
                >
                  {i + 1}
                </Link>
              ))}
            </div>
          </div>
        </Collapse>
      </div>
    </Container>
  );
};

export default ViewChapter;