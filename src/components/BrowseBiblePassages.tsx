import BiblePassage from './BiblePassage';
import Toolbar from './Toolbar';
import SwipeContainer from './SwipeContainer';
import {useBiblePassages} from '../hooks/useBiblePassages';
import {getUnformattedPassageTextNoVerseNumbers} from '../models/passage-utils';
import {Button, Modal, Form, Badge, InputGroup, Row, Col, Collapse, Spinner} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFilter, faSearch, faTimesCircle, faTags, faBookOpen, faBook} from '@fortawesome/free-solid-svg-icons';
import {bookAbbrev} from '../models/constants';

const BrowseBiblePassages = () => {
    const {state, functions} = useBiblePassages();

    // Get topics for current passage
    const currentPassageTopics = state.currentPassage?.topics || [];

    // Create additional menus for topic filtering
    const additionalMenus = [
        {
            itemLabel: "Filter by Topic...",
            icon: faFilter,
            callbackFunction: () => functions.setShowFilterModal(true)
        },
        {
            itemLabel: "Filter by Book/Chapter...",
            icon: faBook,
            callbackFunction: () => functions.setShowBookChapterModal(true)
        },
        {
            itemLabel: "Manage Topics...",
            icon: faTags,
            callbackFunction: () => functions.setShowManageTopicsModal(true)
        },
        {
            itemLabel: "View In Context...",
            icon: faBookOpen,
            callbackFunction: () => functions.viewInContext()
        }
    ];

    // Add clear filter menu items if there are selected filters
    if (state.selectedTopicIds.length > 0 || state.activeBookFilter) {
        additionalMenus.push({
            itemLabel: "Clear Filter(s)",
            icon: faTimesCircle,
            callbackFunction: functions.clearFilters
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
                            onClick={() => functions.setShowTopics(!state.showTopics)}
                            className="text-white-50 text-decoration-none"
                            aria-controls="topics-collapse"
                            aria-expanded={state.showTopics}
                        >
                            {state.showTopics ? '▼ Hide Topics' : '▶ Show Topics'}
                            {currentPassageTopics.length > 0 && ` (${currentPassageTopics.length})`}
                        </Button>

                        <Collapse in={state.showTopics}>
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
                        show={state.showFilterModal}
                        onHide={() => {
                            functions.setShowFilterModal(false);
                            functions.setTopicSearchTerm('');
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
                                    <FontAwesomeIcon icon={faSearch}/>
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search topics..."
                                    value={state.topicSearchTerm}
                                    onChange={(e) => functions.setTopicSearchTerm(e.target.value)}
                                    className="bg-dark text-white border-secondary"
                                />
                                {state.topicSearchTerm && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => functions.setTopicSearchTerm('')}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </InputGroup>

                            {state.selectedTopicIds.length > 0 && (
                                <div className="mb-3">
                                    <p>Selected topics: {state.selectedTopicIds.length}</p>
                                    <div className="d-flex flex-wrap gap-2">
                                        {state.topics
                                            .filter(topic => state.selectedTopicIds.includes(topic.id))
                                            .map(topic => (
                                                <Badge
                                                    key={topic.id}
                                                    bg="primary"
                                                    className="p-2 d-flex align-items-center"
                                                    style={{cursor: 'pointer'}}
                                                    onClick={() => functions.handleTopicFilterChange(topic.id)}
                                                >
                                                    {topic.name} ({state.topicCounts[topic.id] || 0}) ×
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                <Form>
                                    <Row xs={1} md={2} lg={3} className="g-3">
                                        {state.sortedTopics.length > 0 ? (
                                            state.sortedTopics.map(topic => {
                                                const count = state.topicCounts[topic.id] || 0;
                                                return (
                                                    <Col key={topic.id}>
                                                        <Form.Check
                                                            type="checkbox"
                                                            id={`topic-${topic.id}`}
                                                            label={
                                                                <span>
                                                                    {topic.name}
                                                                    <Badge
                                                                        bg="secondary"
                                                                        className="ms-2"
                                                                        style={{fontSize: '0.75em'}}
                                                                    >
                                                                        {count}
                                                                    </Badge>
                                                                </span>
                                                            }
                                                            checked={state.selectedTopicIds.includes(topic.id)}
                                                            onChange={() => functions.handleTopicFilterChange(topic.id)}
                                                            className="mb-2"
                                                            disabled={count === 0}
                                                        />
                                                    </Col>
                                                );
                                            })
                                        ) : (
                                            <Col>
                                                <p className="text-muted">No topics match your search.</p>
                                            </Col>
                                        )}
                                    </Row>
                                </Form>
                            </div>

                            {state.topicSearchTerm && (
                                <div className="mb-3 text-muted">
                                    Showing {state.sortedTopics.length} of {state.topics.length} topics
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer className="bg-dark text-white">
                            <Button variant="secondary" onClick={() => {
                                functions.setShowFilterModal(false);
                                functions.setTopicSearchTerm('');
                            }}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={functions.clearFilters}
                                disabled={state.selectedTopicIds.length === 0}
                            >
                                Clear Filter
                            </Button>
                            <Button variant="primary"
                                    onClick={() => functions.applyTopicFilter(state.selectedTopicIds)}>
                                Apply Filter
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Book/Chapter Filter Modal */}
                    <Modal
                        show={state.showBookChapterModal}
                        onHide={() => functions.setShowBookChapterModal(false)}
                        style={{top: '20px'}}
                        dialogClassName="modal-near-top"
                    >
                        <Modal.Header closeButton className="bg-dark text-white">
                            <Modal.Title>Filter by Book/Chapter</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="bg-dark text-white">
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Book</Form.Label>
                                    <Form.Select
                                        value={state.selectedBook}
                                        onChange={(e) => functions.setSelectedBook(e.target.value)}
                                        className="bg-dark text-white"
                                    >
                                        <option value="">Select a book...</option>
                                        {Object.entries(bookAbbrev).map(([key, [_, fullName]]) => (
                                            <option key={key} value={key}>
                                                {fullName} ({state.passageFilterCounts[key]?.total || 0})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                {state.selectedBook && (
                                    <Form.Group>
                                        <Form.Label>Chapter</Form.Label>
                                        <Form.Select
                                            value={state.selectedChapter}
                                            onChange={(e) => functions.setSelectedChapter(e.target.value)}
                                            className="bg-dark text-white"
                                        >
                                            <option value="all">All Chapters</option>
                                            {Object.entries(state.passageFilterCounts[state.selectedBook]?.chapters || {})
                                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                                .map(([chapter, count]) => (
                                                    <option key={chapter} value={chapter}>
                                                        Chapter {chapter} ({count})
                                                    </option>
                                                ))}
                                        </Form.Select>
                                    </Form.Group>
                                )}
                            </Form>
                        </Modal.Body>
                        <Modal.Footer className="bg-dark text-white">
                            <Button variant="secondary" onClick={() => functions.setShowBookChapterModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={functions.clearFilters}
                                disabled={!state.activeBookFilter}
                            >
                                Clear Filter
                            </Button>
                            <Button
                                variant="primary"
                                onClick={functions.applyBookChapterFilter}
                                disabled={!state.selectedBook}
                            >
                                Apply Filter
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Manage Topics Modal */}
                    <Modal
                        show={state.showManageTopicsModal}
                        onHide={() => {
                            functions.setShowManageTopicsModal(false);
                            functions.setTopicSearchTerm('');
                        }}
                        centered
                        size="lg"
                    >
                        <Modal.Header closeButton className="bg-dark text-white">
                            <Modal.Title>Add Topics to Passage</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="bg-dark text-white">
                            <p className="mb-3">
                                Select topics to add to this passage. Only topics not already associated with the
                                passage are shown.
                            </p>

                            <InputGroup className="mb-3">
                                <InputGroup.Text className="bg-dark text-white border-secondary">
                                    <FontAwesomeIcon icon={faSearch}/>
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search topics..."
                                    value={state.topicSearchTerm}
                                    onChange={(e) => functions.setTopicSearchTerm(e.target.value)}
                                    className="bg-dark text-white border-secondary"
                                />
                                {state.topicSearchTerm && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => functions.setTopicSearchTerm('')}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </InputGroup>

                            {state.topicsToAdd.length > 0 && (
                                <div className="mb-3">
                                    <p>Selected topics to add: {state.topicsToAdd.length}</p>
                                    <div className="d-flex flex-wrap gap-2">
                                        {state.topics
                                            .filter(topic => state.topicsToAdd.includes(topic.id))
                                            .map(topic => (
                                                <Badge
                                                    key={topic.id}
                                                    bg="primary"
                                                    className="p-2 d-flex align-items-center"
                                                    style={{cursor: 'pointer'}}
                                                    onClick={() => functions.handleTopicToAddChange(topic.id)}
                                                >
                                                    {topic.name} ×
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                <Form>
                                    <Row xs={1} md={2} lg={3} className="g-3">
                                        {state.availableTopics.length > 0 ? (
                                            state.availableTopics.map(topic => (
                                                <Col key={topic.id}>
                                                    <Form.Check
                                                        type="checkbox"
                                                        id={`add-topic-${topic.id}`}
                                                        label={topic.name}
                                                        checked={state.topicsToAdd.includes(topic.id)}
                                                        onChange={() => functions.handleTopicToAddChange(topic.id)}
                                                        className="mb-2"
                                                    />
                                                </Col>
                                            ))
                                        ) : (
                                            <Col>
                                                <p className="text-muted">
                                                    {state.topicSearchTerm
                                                        ? 'No topics match your search.'
                                                        : 'No additional topics available to add.'}
                                                </p>
                                            </Col>
                                        )}
                                    </Row>
                                </Form>
                            </div>
                        </Modal.Body>
                        <Modal.Footer className="bg-dark text-white">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    functions.setShowManageTopicsModal(false);
                                    functions.setTopicSearchTerm('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={functions.handleAddTopics}
                                disabled={state.isAddingTopics || state.topicsToAdd.length === 0}
                            >
                                {state.isAddingTopics ? (
                                    <>
                                        <Spinner
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden="true"
                                            className="me-2"
                                        />
                                        Adding Topics...
                                    </>
                                ) : (
                                    'Add Topics'
                                )}
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </>
            )}
        </SwipeContainer>
    );
};

export default BrowseBiblePassages;