import {Container, Spinner, Toast, Badge, Collapse, Button, Modal, Form, Row, Col, InputGroup} from 'react-bootstrap';
import {useState, useEffect, useMemo} from 'react';
import {Quote} from '../models/quote';
import {bibleService} from '../services/bible-service';
import Toolbar from './Toolbar';
import SwipeContainer from './SwipeContainer';
import {shuffleArray} from '../models/passage-utils';
import {useAppSelector, useAppDispatch} from '../store/hooks';
import {setTopics, setTopicsLoading, setTopicsError} from '../store/topicSlice';
import {clearSearchResults} from '../store/searchSlice';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faFilter,
    faSearch,
    faTags,
    faTimesCircle,
    faPencilAlt,
    faCopy,
    faArrowUp,
    faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import {useNavigate, useParams} from 'react-router-dom';

const ViewQuotes = () => {
    const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingSeconds, setLoadingSeconds] = useState(0);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');
    const [showTopics, setShowTopics] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAddTopicModal, setShowAddTopicModal] = useState(false);
    const [showEditQuoteModal, setShowEditQuoteModal] = useState(false);
    const [editedQuoteText, setEditedQuoteText] = useState('');
    const [isUpdatingQuote, setIsUpdatingQuote] = useState(false);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [topicSearchTerm, setTopicSearchTerm] = useState('');
    const [selectedTopicsToAdd, setSelectedTopicsToAdd] = useState<number[]>([]);
    const [isAddingTopics, setIsAddingTopics] = useState(false);
    const [showOnlyAssociatedTopics, setShowOnlyAssociatedTopics] = useState(true);
    const [showFloatingButtons, setShowFloatingButtons] = useState(false);

    const user = useAppSelector(state => state.user.currentUser);
    const topics = useAppSelector(state => state.topic.topics);
    const topicsLoading = useAppSelector(state => state.topic.loading);
    const topicsError = useAppSelector(state => state.topic.error);
    const storedQuotes = useAppSelector((state) => state.quote.quotes);
    const searchState = useAppSelector((state) => state.search);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const {quoteId} = useParams();

    useEffect(() => {
        const handleScroll = () => {
            setShowFloatingButtons(window.scrollY > 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const copyCurrentQuote = async () => {
        if (currentQuote?.quoteTx) {
            try {
                await navigator.clipboard.writeText(currentQuote.quoteTx);
                setToastMessage('Quote copied to clipboard!');
                setToastBg('#28a745');
                setShowToast(true);
            } catch (err) {
                console.error('Failed to copy text:', err);
                setToastMessage('Failed to copy text');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        }
    };

    const goBackToSearch = () => {
        dispatch(clearSearchResults());
        navigate('/searchQuotes');
    };

    // Function to highlight search terms in quote text
    const highlightSearchTerms = (text: string) => {
        if (!searchState.searchTerm.trim()) return text;

        const searchWords = searchState.searchTerm
            .toLowerCase()
            .split(' ')
            .filter((word) => word.length > 0);
        let highlightedText = text;

        searchWords.forEach((word) => {
            if (word.length > 0) {
                const regex = new RegExp(`(${word})`, 'gi');
                highlightedText = highlightedText.replace(
                    regex,
                    '<span style="background-color: yellow; color: black">$1</span>'
                );
            }
        });

        return highlightedText;
    };

    // Calculate topic counts from current quotes
    const topicCounts = useMemo(() => {
        const counts: { [key: number]: number } = {};

        quotes.forEach(quote => {
            if (quote.tagIds && quote.tagIds.length > 0) {
                quote.tagIds.forEach(tagId => {
                    counts[tagId] = (counts[tagId] || 0) + 1;
                });
            }
        });

        return counts;
    }, [quotes]);

    // Get list of topic IDs that are associated with at least one quote
    const associatedTopicIds = useMemo(() => {
        return Object.keys(topicCounts).map(id => parseInt(id));
    }, [topicCounts]);

    // Filter topics based on search term and optionally by association with quotes
    const filteredTopics = useMemo(() => {
        if (!topics.length) return [];

        let filtered = topics;

        // First filter by search term if provided
        if (topicSearchTerm.trim()) {
            filtered = filtered.filter(topic =>
                topic.name.toLowerCase().includes(topicSearchTerm.toLowerCase())
            );
        }

        // Then filter by association with quotes if enabled
        if (showOnlyAssociatedTopics) {
            filtered = filtered.filter(topic =>
                associatedTopicIds.includes(topic.id)
            );
        }

        // Sort topics by count (most used first) and then alphabetically
        return filtered.sort((a, b) => {
            const countA = topicCounts[a.id] || 0;
            const countB = topicCounts[b.id] || 0;

            if (countB !== countA) {
                return countB - countA; // Sort by count descending
            }

            // If counts are equal, sort alphabetically
            return a.name.localeCompare(b.name);
        });
    }, [topics, topicSearchTerm, showOnlyAssociatedTopics, associatedTopicIds, topicCounts]);

    useEffect(() => {
        if (!quoteId || !allQuotes || !allQuotes.length) {
            return;
        }
        const iQuoteId = parseInt(quoteId);
        let quoteIndex = allQuotes.findIndex(q => q.quoteId === iQuoteId);
        if (!quoteIndex || quoteIndex === -1) {
            return;
        } else {
            console.log("ViewQuotes.tsx.useEffect[quoteId, allQuotes] quoteId=" + quoteId + ", quoteIndex=" + quoteIndex);
            handleChangeIndex(quoteIndex);
        }
    }, [quoteId, allQuotes]);

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                setIsLoading(true);
                const quoteList = await bibleService.getQuoteList(user);
                shuffleArray(quoteList);
                setAllQuotes(quoteList);
                setQuotes(quoteList);

                if (quoteList.length > 0) {
                    const quoteText = await bibleService.getQuoteText(user, quoteList[0].quoteId);
                    setCurrentQuote({
                        ...quoteList[0],
                        quoteTx: quoteText
                    });
                }
            } catch (error) {
                console.error('Error fetching quotes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const loadingInterval = setInterval(() => {
            setLoadingSeconds(s => s + 1);
        }, 1000);

        // Check if we have search results to use
        if (searchState.hasSearchResults && searchState.searchResults.length > 0) {
            console.log('ViewQuotes: Using search results from Redux store');
            const searchResults = [...searchState.searchResults];
            setAllQuotes(searchResults);
            setQuotes(searchResults);
            setCurrentQuote(searchResults[0]);
            setIsLoading(false);
        } else if (storedQuotes?.length > 0) {
            const locStoredQuotes = [...storedQuotes];
            shuffleArray(locStoredQuotes);
            setAllQuotes(locStoredQuotes);
            setQuotes(locStoredQuotes);
            setCurrentQuote(locStoredQuotes[0]);
            setIsLoading(false);
        } else {
            if (user) {
                fetchQuotes();
            }
        }
        return () => clearInterval(loadingInterval);
    }, [user, searchState, storedQuotes]);

    useEffect(() => {
        // Fetch topics if they're not already in the store
        if (topics.length === 0 && !topicsLoading && !topicsError) {
            const fetchTopics = async () => {
                try {
                    dispatch(setTopicsLoading());
                    const tagList = await bibleService.getTagList(user);
                    dispatch(setTopics(tagList));
                } catch (error) {
                    console.error('Error fetching topics:', error);
                    dispatch(setTopicsError('Failed to load topics'));
                }
            };
            if (user) {
                fetchTopics();
            }
        }
    }, [user, topics.length, topicsLoading, topicsError, dispatch]);

    // Reset search term when modal is opened or closed
    useEffect(() => {
        if (!showFilterModal && !showAddTopicModal) {
            setTopicSearchTerm('');
        }
    }, [showFilterModal, showAddTopicModal]);

    // Initialize selectedTopicsToAdd when opening the add topic modal
    useEffect(() => {
        if (showAddTopicModal && currentQuote) {
            // Initialize with current quote's topics
            setSelectedTopicsToAdd(currentQuote.tagIds || []);
        }
    }, [showAddTopicModal, currentQuote]);

    // Initialize editedQuoteText when opening the edit quote modal
    useEffect(() => {
        if (showEditQuoteModal && currentQuote) {
            setEditedQuoteText(currentQuote.quoteTx || '');
        }
    }, [showEditQuoteModal, currentQuote]);

    const handleToolbarClick = async (direction: string) => {
        if (quotes.length === 0) return;

        let newIndex = currentIndex;
        if (direction === 'RIGHT') {
            newIndex = currentIndex + 1 >= quotes.length ? 0 : currentIndex + 1;
        } else if (direction === 'LEFT') {
            newIndex = currentIndex - 1 < 0 ? quotes.length - 1 : currentIndex - 1;
        }
        handleChangeIndex(newIndex);
    };

    const handleChangeIndex = async (toIndex: number) => {
        setCurrentIndex(toIndex);
        if (quotes[toIndex].quoteTx) {
            setCurrentQuote(quotes[toIndex]);
            // Scroll to top when new quote is loaded
            window.scrollTo(0, 0);
            return;
        }
        setIsLoading(true);

        try {
            const quoteText = await bibleService.getQuoteText(user, quotes[toIndex].quoteId);
            setCurrentQuote({
                ...quotes[toIndex],
                quoteTx: quoteText
            });
            // Scroll to top when new quote is loaded
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Error fetching quote text:', error);
        } finally {
            setIsLoading(false);
        }

    };

    const handleCopy = async () => {
        if (currentQuote && currentQuote.quoteTx) {
            try {
                await navigator.clipboard.writeText(currentQuote.quoteTx);
                setToastMessage('Quote copied to clipboard!');
                setToastBg('#28a745');
                setShowToast(true);
            } catch (err) {
                console.error('Failed to copy text:', err);
                setToastMessage('Failed to copy text');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        }
    };

    const getTopicsForQuote = () => {
        if (!currentQuote || !currentQuote.tagIds || !topics.length) return [];

        return topics.filter(topic =>
            currentQuote.tagIds.includes(topic.id)
        );
    };

    const handleTopicFilterChange = (topicId: number) => {
        setSelectedTopicIds(prev => {
            if (prev.includes(topicId)) {
                return prev.filter(id => id !== topicId);
            } else {
                return [...prev, topicId];
            }
        });
    };

    const handleTopicToAddChange = (topicId: number) => {
        setSelectedTopicsToAdd(prev => {
            if (prev.includes(topicId)) {
                return prev.filter(id => id !== topicId);
            } else {
                return [...prev, topicId];
            }
        });
    };

    const applyTopicFilter = () => {
        if (selectedTopicIds.length === 0) {
            // If no topics selected, show all quotes
            setQuotes(allQuotes);
            setCurrentIndex(0);
            if (allQuotes.length > 0) {
                loadQuoteText(allQuotes[0]);
            }
        } else {
            // Filter quotes that have at least one of the selected topics
            const filteredQuotes = allQuotes.filter(quote =>
                quote.tagIds && quote.tagIds.some(tagId => selectedTopicIds.includes(tagId))
            );

            setQuotes(filteredQuotes);
            setCurrentIndex(0);
            if (filteredQuotes.length > 0) {
                loadQuoteText(filteredQuotes[0]);
            } else {
                setCurrentQuote(null);
            }
        }

        setShowFilterModal(false);
    };

    const clearTopicFilter = () => {
        setSelectedTopicIds([]);
        setQuotes(allQuotes);
        setCurrentIndex(0);
        if (allQuotes.length > 0) {
            loadQuoteText(allQuotes[0]);
        }
        setShowFilterModal(false);
    };

    const loadQuoteText = async (quote: Quote) => {
        setIsLoading(true);
        try {
            const quoteText = await bibleService.getQuoteText(user, quote.quoteId);
            setCurrentQuote({
                ...quote,
                quoteTx: quoteText
            });
        } catch (error) {
            console.error('Error fetching quote text:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTopics = async () => {
        if (!currentQuote) return;

        setIsAddingTopics(true);

        try {
            // Get the current quote's topic IDs (or empty array if none)
            const currentTopicIds = currentQuote.tagIds || [];

            // Find only the newly selected topics (ones that aren't already associated)
            const newTopicIds = selectedTopicsToAdd.filter(id => !currentTopicIds.includes(id));

            // Find topics that were removed
            const removedTopicIds = currentTopicIds.filter(id => !selectedTopicsToAdd.includes(id));

            // If there are no changes, just close the modal
            if (newTopicIds.length === 0 && removedTopicIds.length === 0) {
                setShowAddTopicModal(false);
                setIsAddingTopics(false);
                return;
            }

            // Get the full topic objects for only the newly selected topics
            const topicsToAdd = topics.filter(topic => newTopicIds.includes(topic.id));

            // Only send the new topics to the API
            const result = await bibleService.addQuoteTopic(user, currentQuote.quoteId, topicsToAdd);

            if (result.message === "success") {
                // Update the current quote with all selected topics (both old and new)
                const updatedQuote = {
                    ...currentQuote,
                    tagIds: selectedTopicsToAdd,
                    tags: topics.filter(topic => selectedTopicsToAdd.includes(topic.id))
                };

                setCurrentQuote(updatedQuote);

                // Update the quote in both quotes and allQuotes arrays
                const updateQuoteInArray = (quoteArray: Quote[]) => {
                    return quoteArray.map(quote =>
                        quote.quoteId === currentQuote.quoteId
                            ? {...quote, tagIds: selectedTopicsToAdd}
                            : quote
                    );
                };

                setQuotes(updateQuoteInArray(quotes));
                setAllQuotes(updateQuoteInArray(allQuotes));

                setToastMessage('Topics updated successfully!');
                setToastBg('#28a745');
                setShowToast(true);
                setShowAddTopicModal(false);
            } else {
                setToastMessage('Failed to update topics');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        } catch (error) {
            console.error('Error adding topics to quote:', error);
            setToastMessage('Error updating topics');
            setToastBg('#dc3545');
            setShowToast(true);
        } finally {
            setIsAddingTopics(false);
        }
    };

    const handleUpdateQuote = async () => {
        if (!currentQuote || !editedQuoteText.trim()) return;

        setIsUpdatingQuote(true);

        try {
            // Create updated quote object with new text
            const updatedQuote = {
                ...currentQuote,
                quoteTx: editedQuoteText
            };

            // Call the API to update the quote
            const result = await bibleService.updateQuote(user, updatedQuote);

            if (result === "success") {
                // Update the current quote with the new text
                setCurrentQuote(updatedQuote);

                // Update the quote in both quotes and allQuotes arrays
                const updateQuoteInArray = (quoteArray: Quote[]) => {
                    return quoteArray.map(quote =>
                        quote.quoteId === currentQuote.quoteId
                            ? {...quote, quoteTx: editedQuoteText}
                            : quote
                    );
                };

                setQuotes(updateQuoteInArray(quotes));
                setAllQuotes(updateQuoteInArray(allQuotes));

                setToastMessage('Quote updated successfully!');
                setToastBg('#28a745');
                setShowToast(true);
                setShowEditQuoteModal(false);
            } else {
                setToastMessage('Failed to update quote');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        } catch (error) {
            console.error('Error updating quote:', error);
            setToastMessage('Error updating quote');
            setToastBg('#dc3545');
            setShowToast(true);
        } finally {
            setIsUpdatingQuote(false);
        }
    };

    if (isLoading && !currentQuote) {
        return (
            <Container className="p-4 text-white text-center">
                <Spinner animation="border" role="status\" className="me-2"/>
                <span>Loading quotes... ({loadingSeconds} seconds)</span>
            </Container>
        );
    }

    if (!currentQuote) {
        return (
            <Container className="p-4">
                <div className="text-white text-center">
                    {quotes.length === 0 && selectedTopicIds.length > 0 ? (
                        <>
                            <p>No quotes found with the selected topics.</p>
                            <Button variant="primary" onClick={clearTopicFilter}>
                                Clear Filter
                            </Button>
                        </>
                    ) : (
                        <p>No quotes available</p>
                    )}
                </div>
            </Container>
        );
    }

    const quoteTopics = getTopicsForQuote();
    const activeFilterCount = selectedTopicIds.length;

    // Create additional menus for the toolbar
    const additionalMenus = [
        {
            itemLabel: "Edit Quote...",
            icon: faPencilAlt,
            callbackFunction: () => {
                setShowEditQuoteModal(true);
            }
        },
        {
            itemLabel: "Manage Topics...",
            icon: faTags,
            callbackFunction: () => {
                setShowAddTopicModal(true);
            }
        },
        {
            itemLabel: "Filter by Topic...",
            icon: faFilter,
            callbackFunction: () => {
                setShowFilterModal(true);
            }
        },
        {
            itemLabel: "Search Quotes...",
            icon: faSearch,
            callbackFunction: () => {
                navigate('/searchQuotes');
            }
        }
    ];

    // Conditionally add Clear Filter menu item when filters are active
    if (selectedTopicIds.length > 0) {
        additionalMenus.push({
            itemLabel: "Clear Filter",
            icon: faTimesCircle,
            callbackFunction: clearTopicFilter
        });
    }

    // Add "Back to Search" menu item if we're viewing search results
    if (searchState.hasSearchResults) {
        additionalMenus.unshift({
            itemLabel: "Back to Search",
            icon: faArrowLeft,
            callbackFunction: goBackToSearch
        });
    }

    return (
        <SwipeContainer
            onSwipeLeft={() => handleToolbarClick('RIGHT')}
            onSwipeRight={() => handleToolbarClick('LEFT')}
        >
            <div className="d-flex justify-content-between align-items-center mb-3 px-3">
                <div className="text-white">
                    {searchState.hasSearchResults && (
                        <span className="me-2">
                            Search Results for "{searchState.searchTerm}" ({quotes.length} quotes)
                        </span>
                    )}
                    {quotes.length !== allQuotes.length && !searchState.hasSearchResults && (
                        <span className="me-2">
              Showing {quotes.length} of {allQuotes.length} quotes
                            {activeFilterCount > 0 && ` (${activeFilterCount} filters active)`}
            </span>
                    )}
                </div>
            </div>

            <Toolbar
                currentIndex={currentIndex}
                totalCount={quotes.length}
                clickFunction={handleToolbarClick}
                translation=""
                onTranslationChange={() => {
                }}
                currentPassage={null}
                getUnformattedText={() => currentQuote?.quoteTx || ""}
                onCopy={handleCopy}
                additionalMenus={additionalMenus}
            />

            {isLoading ? (
                <div className="text-white text-center mt-4">
                    <Spinner animation="border" role="status\" className="me-2"/>
                    <span>Loading quote... ({loadingSeconds} seconds)</span>
                </div>
            ) : (
                <Container className="p-4">
                    <div className="text-center mb-4">
                        <p className="quote-text">
                            {searchState.hasSearchResults ? (
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerms(currentQuote.quoteTx)
                                    }}
                                />
                            ) : (
                                currentQuote.quoteTx
                            )}
                        </p>
                    </div>

                    <div className="mt-4">
                        <Button
                            variant="link"
                            onClick={() => setShowTopics(!showTopics)}
                            className="text-white-50 text-decoration-none mb-2"
                            aria-controls="topics-collapse"
                            aria-expanded={showTopics}
                        >
                            {showTopics ? '▼ Hide Topics' : '▶ Show Topics'}
                            {quoteTopics.length > 0 && ` (${quoteTopics.length})`}
                        </Button>

                        <Collapse in={showTopics}>
                            <div id="topics-collapse" className="mb-3">
                                {topicsLoading ? (
                                    <div className="text-white-50">
                                        <Spinner animation="border" size="sm" className="me-2"/>
                                        Loading topics...
                                    </div>
                                ) : topicsError ? (
                                    <div className="text-danger">Error loading topics: {topicsError}</div>
                                ) : quoteTopics.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                        {quoteTopics.map(topic => (
                                            <Badge key={topic.id} bg="secondary" className="p-2">
                                                {topic.name}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-white-50">No topics associated with this quote</div>
                                )}
                            </div>
                        </Collapse>
                    </div>
                </Container>
            )}

            {/* Add floating buttons */}
            {showFloatingButtons && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        display: 'flex',
                        gap: '10px',
                        zIndex: 1000
                    }}
                >
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={copyCurrentQuote}
                        style={{borderRadius: '50%', width: '50px', height: '50px'}}
                    >
                        <FontAwesomeIcon icon={faCopy}/>
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={scrollToTop}
                        style={{borderRadius: '50%', width: '50px', height: '50px'}}
                    >
                        <FontAwesomeIcon icon={faArrowUp}/>
                    </Button>
                </div>
            )}

            {/* Edit Quote Modal */}
            <Modal
                show={showEditQuoteModal}
                onHide={() => setShowEditQuoteModal(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Edit Quote</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        <Form.Group>
                            <Form.Control
                                as="textarea"
                                value={editedQuoteText}
                                onChange={(e) => setEditedQuoteText(e.target.value)}
                                className="bg-dark text-white quote-text"
                                style={{
                                    minHeight: '40vh',
                                    whiteSpace: 'pre-line',
                                    fontSize: "1.71rem"
                                }}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setShowEditQuoteModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleUpdateQuote}
                        disabled={isUpdatingQuote || !editedQuoteText.trim()}
                    >
                        {isUpdatingQuote ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Topic Filter Modal */}
            <Modal
                show={showFilterModal}
                onHide={() => setShowFilterModal(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Filter Quotes by Topic</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {topicsLoading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" role="status\" className="me-2"/>
                            <span>Loading topics...</span>
                        </div>
                    ) : (
                        <>
                            <p className="mb-3">
                                Select one or more topics to filter quotes. Only quotes with at least one of the
                                selected topics will be shown.
                            </p>

                            {/* Search and filter options */}
                            <div className="mb-3">
                                <Row>
                                    <Col md={8}>
                                        <InputGroup>
                                            <InputGroup.Text className="bg-dark text-white border-secondary">
                                                <FontAwesomeIcon icon={faSearch}/>
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
                                    </Col>
                                    <Col md={4}>
                                        <Form.Check
                                            type="switch"
                                            id="show-only-associated-topics"
                                            label="Show only topics with quotes"
                                            checked={showOnlyAssociatedTopics}
                                            onChange={(e) => setShowOnlyAssociatedTopics(e.target.checked)}
                                            className="mt-2"
                                        />
                                    </Col>
                                </Row>
                            </div>

                            {/* Top action buttons */}
                            <div className="d-flex justify-content-between mb-3">
                                <div>
                                    <Button
                                        variant="danger"
                                        onClick={clearTopicFilter}
                                        disabled={selectedTopicIds.length === 0}
                                        size="sm"
                                        className="me-2"
                                    >
                                        Clear Filter
                                    </Button>
                                </div>
                                <div>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowFilterModal(false)}
                                        size="sm"
                                        className="me-2"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={applyTopicFilter}
                                        size="sm"
                                    >
                                        Apply Filter
                                    </Button>
                                </div>
                            </div>

                            {/* Selected topics */}
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
                                                    style={{cursor: 'pointer'}}
                                                    onClick={() => handleTopicFilterChange(topic.id)}
                                                >
                                                    {topic.name} ×
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Topic checkboxes */}
                            <div className="mb-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                <Form>
                                    <Row xs={1} md={2} lg={3} className="g-3">
                                        {filteredTopics.length > 0 ? (
                                            filteredTopics.map(topic => {
                                                const count = topicCounts[topic.id] || 0;
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
                                                            checked={selectedTopicIds.includes(topic.id)}
                                                            onChange={() => handleTopicFilterChange(topic.id)}
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

                            {/* Search results info */}
                            {(topicSearchTerm || showOnlyAssociatedTopics) && (
                                <div className="mb-3 text-muted">
                                    Showing {filteredTopics.length} of {topics.length} topics
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setShowFilterModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={clearTopicFilter} disabled={selectedTopicIds.length === 0}>
                        Clear Filter
                    </Button>
                    <Button variant="primary" onClick={applyTopicFilter}>
                        Apply Filter
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Add Topic Modal */}
            <Modal
                show={showAddTopicModal}
                onHide={() => setShowAddTopicModal(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Manage Topics for Quote</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {topicsLoading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" role="status\" className="me-2"/>
                            <span>Loading topics...</span>
                        </div>
                    ) : (
                        <>
                            <p className="mb-3">
                                Select topics to associate with this quote. You can select multiple topics.
                            </p>

                            {/* Search box for topics */}
                            <InputGroup className="mb-3">
                                <InputGroup.Text className="bg-dark text-white border-secondary">
                                    <FontAwesomeIcon icon={faSearch}/>
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

                            {/* Selected topics */}
                            {selectedTopicsToAdd.length > 0 && (
                                <div className="mb-3">
                                    <p>Selected topics: {selectedTopicsToAdd.length}</p>
                                    <div className="d-flex flex-wrap gap-2">
                                        {topics
                                            .filter(topic => selectedTopicsToAdd.includes(topic.id))
                                            .map(topic => (
                                                <Badge
                                                    key={topic.id}
                                                    bg="primary"
                                                    className="p-2 d-flex align-items-center"
                                                    style={{cursor: 'pointer'}}
                                                    onClick={() => handleTopicToAddChange(topic.id)}
                                                >
                                                    {topic.name} ×
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Topic checkboxes */}
                            <div className="mb-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                <Form>
                                    <Row xs={1} md={2} lg={3} className="g-3">
                                        {filteredTopics.length > 0 ? (
                                            filteredTopics.map(topic => {
                                                const count = topicCounts[topic.id] || 0;
                                                return (
                                                    <Col key={topic.id}>
                                                        <Form.Check
                                                            type="checkbox"
                                                            id={`add-topic-${topic.id}`}
                                                            label={
                                                                <span>
                                  {topic.name}
                                                                    {count > 0 && (
                                                                        <Badge
                                                                            bg="secondary"
                                                                            className="ms-2"
                                                                            style={{fontSize: '0.75em'}}
                                                                        >
                                                                            {count}
                                                                        </Badge>
                                                                    )}
                                </span>
                                                            }
                                                            checked={selectedTopicsToAdd.includes(topic.id)}
                                                            onChange={() => handleTopicToAddChange(topic.id)}
                                                            className="mb-2"
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

                            {/* Search results info */}
                            {topicSearchTerm && (
                                <div className="mb-3 text-muted">
                                    Showing {filteredTopics.length} of {topics.length} topics
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setShowAddTopicModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddTopics}
                        disabled={isAddingTopics}
                    >
                        {isAddingTopics ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Saving...
                            </>
                        ) : (
                            'Save Topics'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

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

export default ViewQuotes;