import { useState } from 'react';
import BiblePassage from './BiblePassage';
import Toolbar from './Toolbar';
import SwipeContainer from './SwipeContainer';
import { useBiblePassages } from '../hooks/useBiblePassages';
import { useTopics } from '../hooks/useTopics';
import { getUnformattedPassageTextNoVerseNumbers } from '../models/passage-utils';
import { Button, Modal, Form, Badge, InputGroup, Row, Col, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faSearch, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const BrowseBiblePassages = () => {
  const { state, functions } = useBiblePassages();
  const { topics } = useTopics();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [topicSearchTerm, setTopicSearchTerm] = useState('');
  const [showTopics, setShowTopics] = useState(false);

  // Filter topics based on search term
  const filteredTopics = topics.filter(topic =>
      topicSearchTerm.trim() === '' ||
      topic.name.toLowerCase().includes(topicSearchTerm.toLowerCase())
  );

  const handleTopicFilterChange = (topicId: number) => {
    setSelectedTopicIds(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        return [...prev, topicId];
      }
    });
  };

  const clearTopicFilter = () => {
    setSelectedTopicIds([]);
    functions.clearTopicFilter();
    setShowFilterModal(false);
  };

  const applyTopicFilter = () => {
    functions.applyTopicFilter(selectedTopicIds);
    setShowFilterModal(false);
  };

  // Get topics for current passage
  const currentPassageTopics = state.currentPassage?.topics || [];

  // Create additional menus for topic filtering
  const additionalMenus = [
    {
      itemLabel: "Filter by Topic...",
      icon: faFilter,
      callbackFunction: () => setShowFilterModal(true)
    }
  ];

  // Add clear filter menu item if there are selected topics
  if (selectedTopicIds.length > 0) {
    additionalMenus.push({
      itemLabel: "Clear Topic Filter",
      icon: faTimesCircle,
      callbackFunction: clearTopicFilter
    });
  }

  return (
      <SwipeContainer
          onSwipeLeft={functions.handleNext}
          onSwipeRight={functions.handlePrev}
      >
        {state.currentPassage && (
            <>
              <Toolbar
                  totalCount={state.totalCount}
                  currentIndex={state.currentIndex}
                  clickFunction={functions.handleToolbarClick}
                  translation={state.translation}
                  onTranslationChange={functions.handleTranslationChange}
                  currentPassage={state.currentPassage}
                  getUnformattedText={getUnformattedPassageTextNoVerseNumbers}
                  additionalMenus={additionalMenus}
              />

              <div className="text-center mb-3">
                <Button
                    variant="link"
                    onClick={() => setShowTopics(!showTopics)}
                    className="text-white-50 text-decoration-none"
                    aria-controls="topics-collapse"
                    aria-expanded={showTopics}
                >
                  {showTopics ? '▼ Hide Topics' : '▶ Show Topics'}
                  {currentPassageTopics.length > 0 && ` (${currentPassageTopics.length})`}
                </Button>

                <Collapse in={showTopics}>
                  <div id="topics-collapse" className="mb-3">
                    {currentPassageTopics.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2 justify-content-center">
                          {currentPassageTopics.map(topic => (
                              <Badge key={topic.id} bg="secondary" className="p-2">
                                {topic.name}
                              </Badge>
                          ))}
                        </div>
                    ) : (
                        <div className="text-white-50">No topics associated with this passage</div>
                    )}
                  </div>
                </Collapse>
              </div>

              <BiblePassage
                  passage={state.currentPassage}
                  translation={state.translation}
              />

              {/* Topic Filter Modal */}
              <Modal
                  show={showFilterModal}
                  onHide={() => {
                    setShowFilterModal(false);
                    setTopicSearchTerm('');
                  }}
                  centered
                  size="lg"
              >
                <Modal.Header closeButton className="bg-dark text-white">
                  <Modal.Title>Filter Passages by Topic</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                  <p className="mb-3">
                    Select one or more topics to filter passages. Only passages with at least one of the
                    selected topics will be shown.
                  </p>

                  <InputGroup className="mb-3">
                    <InputGroup.Text className="bg-dark text-white border-secondary">
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                        placeholder="Search topics..."
                        value={topicSearchTerm}
                        onChange={(e) => setTopicSearchTerm(e.target.value)}
                        className="bg-dark text-white border-secondary"
                    />
                    {topicSearchTerm && (
                        <Button
                            variant="outline-secondary"
                            onClick={() => setTopicSearchTerm('')}
                        >
                          Clear
                        </Button>
                    )}
                  </InputGroup>

                  {selectedTopicIds.length > 0 && (
                      <div className="mb-3">
                        <p>Selected topics: {selectedTopicIds.length}</p>
                        <div className="d-flex flex-wrap gap-2">
                          {topics
                              .filter(topic => selectedTopicIds.includes(topic.id))
                              .map(topic => (
                                  <Badge
                                      key={topic.id}
                                      bg="primary"
                                      className="p-2 d-flex align-items-center"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleTopicFilterChange(topic.id)}
                                  >
                                    {topic.name} ×
                                  </Badge>
                              ))}
                        </div>
                      </div>
                  )}

                  <div className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Form>
                      <Row xs={1} md={2} lg={3} className="g-3">
                        {filteredTopics.length > 0 ? (
                            filteredTopics.map(topic => (
                                <Col key={topic.id}>
                                  <Form.Check
                                      type="checkbox"
                                      id={`topic-${topic.id}`}
                                      label={topic.name}
                                      checked={selectedTopicIds.includes(topic.id)}
                                      onChange={() => handleTopicFilterChange(topic.id)}
                                      className="mb-2"
                                  />
                                </Col>
                            ))
                        ) : (
                            <Col>
                              <p className="text-muted">No topics match your search.</p>
                            </Col>
                        )}
                      </Row>
                    </Form>
                  </div>

                  {topicSearchTerm && (
                      <div className="mb-3 text-muted">
                        Showing {filteredTopics.length} of {topics.length} topics
                      </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                  <Button variant="secondary" onClick={() => {
                    setShowFilterModal(false);
                    setTopicSearchTerm('');
                  }}>
                    Cancel
                  </Button>
                  <Button
                      variant="danger"
                      onClick={clearTopicFilter}
                      disabled={selectedTopicIds.length === 0}
                  >
                    Clear Filter
                  </Button>
                  <Button variant="primary" onClick={applyTopicFilter}>
                    Apply Filter
                  </Button>
                </Modal.Footer>
              </Modal>
            </>
        )}
      </SwipeContainer>
  );
};

export default BrowseBiblePassages;