import React, { useState } from 'react';
import {
    Badge,
    Button,
    Collapse,
    Container,
    Form,
    InputGroup,
    Row,
    Col,
    Spinner,
    Toast,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { bibleService } from '../services/bible-service';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addQuote } from '../store/quoteSlice';
import { useToast } from '../hooks/useToast';
import { useTopics } from '../hooks/useTopics';
import { Topic } from '../models/topic';

const AddQuote = () => {
    const [quoteText, setQuoteText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTopicSection, setShowTopicSection] = useState(false);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [topicSearchTerm, setTopicSearchTerm] = useState('');
    const { showToast, toastProps, toastMessage } = useToast();

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.user.currentUser);
    const { topics, loading: topicsLoading } = useTopics();

    const handleToggleTopic = (topicId: number) => {
        setSelectedTopicIds((prev) =>
            prev.includes(topicId)
                ? prev.filter((id) => id !== topicId)
                : [...prev, topicId]
        );
    };

    const filteredTopics: Topic[] = topicSearchTerm
        ? topics.filter((t) =>
            t.name.toLowerCase().includes(topicSearchTerm.toLowerCase())
        )
        : topics;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quoteText.trim()) {
            showToast({ message: 'Please enter quote text', variant: 'error' });
            return;
        }

        setIsSubmitting(true);

        try {
            const prompt = quoteText.substring(0, 10) + '...';

            const result = await bibleService.addQuote(user, quoteText, prompt);

            if (result && result.quoteId > 1) {
                const selectedTopics = topics.filter((t) =>
                    selectedTopicIds.includes(t.id)
                );

                if (selectedTopics.length > 0) {
                    try {
                        await bibleService.addQuoteTopic(user, result.quoteId, selectedTopics);
                    } catch (topicError) {
                        console.error('Error associating topics with quote:', topicError);
                        showToast({
                            message: 'Quote added, but some topics could not be associated.',
                            variant: 'warning',
                        });
                    }
                }

                dispatch(
                    addQuote({
                        quoteId: result.quoteId,
                        quoteTx: quoteText,
                        approved: 'Y',
                        fromUser: user,
                        sourceId: 0,
                        tags: selectedTopics,
                        tagIds: selectedTopicIds,
                    })
                );

                showToast({ message: 'Quote added successfully!', variant: 'success' });
                navigate(`/viewQuotes/${result.quoteId}`);
            } else {
                showToast({ message: 'Failed to add quote', variant: 'error' });
            }
        } catch (error) {
            console.error('Error adding quote:', error);
            showToast({ message: 'Error adding quote', variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Add Quote</h1>

            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                    <Form.Control
                        as="textarea"
                        value={quoteText}
                        onChange={(e) => setQuoteText(e.target.value)}
                        placeholder="Paste or type your quote here..."
                        className="bg-dark text-white quote-text"
                        style={{
                            minHeight: '50vh',
                            whiteSpace: 'pre-line',
                            fontSize: '1.71rem',
                        }}
                    />
                </Form.Group>

                {/* Topic selection section */}
                <div className="mb-4 border border-secondary rounded">
                    <Button
                        variant="link"
                        className="text-white text-decoration-none w-100 text-start p-3"
                        onClick={() => setShowTopicSection(!showTopicSection)}
                        aria-controls="topic-collapse"
                        aria-expanded={showTopicSection}
                    >
                        <FontAwesomeIcon
                            icon={showTopicSection ? faChevronDown : faChevronRight}
                            className="me-2"
                        />
                        Associate Topics
                        {selectedTopicIds.length > 0 && (
                            <Badge bg="primary" className="ms-2">
                                {selectedTopicIds.length}
                            </Badge>
                        )}
                    </Button>

                    <Collapse in={showTopicSection}>
                        <div id="topic-collapse" className="px-3 pb-3">
                            {topicsLoading ? (
                                <div className="text-center p-3">
                                    <Spinner animation="border" size="sm" role="status" className="me-2" />
                                    <span>Loading topics...</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-white-50 mb-3">
                                        Select topics to associate with this quote. You can select
                                        multiple topics.
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
                                            <p className="mb-2">
                                                Selected topics: {selectedTopicIds.length}
                                            </p>
                                            <div className="d-flex flex-wrap gap-2">
                                                {topics
                                                    .filter((t) => selectedTopicIds.includes(t.id))
                                                    .map((t) => (
                                                        <Badge
                                                            key={t.id}
                                                            bg="primary"
                                                            className="p-2 d-flex align-items-center"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleToggleTopic(t.id)}
                                                        >
                                                            {t.name} ×
                                                        </Badge>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className="mb-3"
                                        style={{ maxHeight: '300px', overflowY: 'auto' }}
                                    >
                                        {filteredTopics.length > 0 ? (
                                            <Row xs={1} md={2} lg={3} className="g-3">
                                                {filteredTopics.map((topic) => (
                                                    <Col key={topic.id}>
                                                        <Form.Check
                                                            type="checkbox"
                                                            id={`add-quote-topic-${topic.id}`}
                                                            label={topic.name}
                                                            checked={selectedTopicIds.includes(topic.id)}
                                                            onChange={() => handleToggleTopic(topic.id)}
                                                            className="mb-2"
                                                        />
                                                    </Col>
                                                ))}
                                            </Row>
                                        ) : (
                                            <p className="text-muted">No topics match your search.</p>
                                        )}
                                    </div>

                                    {topicSearchTerm && (
                                        <div className="mb-2 text-muted">
                                            Showing {filteredTopics.length} of {topics.length} topics
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Collapse>
                </div>

                <div className="d-grid">
                    <Button
                        variant="primary"
                        type="submit"
                        size="lg"
                        disabled={isSubmitting || !quoteText.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Adding Quote...
                            </>
                        ) : (
                            'Add Quote'
                        )}
                    </Button>
                </div>
            </Form>

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default AddQuote;
