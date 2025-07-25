import React, {useEffect, useMemo, useState} from 'react';
import {
    Button,
    Card,
    Container,
    Form,
    InputGroup,
    Pagination,
    Spinner,
    Toast,
} from 'react-bootstrap';
import {bibleService} from '../services/bible-service';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {useNavigate} from 'react-router-dom';
import {
    setQuotes,
    setQuotesError,
    setQuotesLoading,
} from '../store/quoteSlice';
import {setSearchResults} from '../store/searchSlice';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTimes, faEye} from '@fortawesome/free-solid-svg-icons';
import {useToast} from '../hooks/useToast';

const QUOTES_PER_PAGE = 4;
const MAX_VISIBLE_PAGES = 5; // Number of page numbers to show at once
const MAX_PREVIEW_LENGTH = 100;

const SearchQuotes: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedQuotes, setExpandedQuotes] = useState<Set<number>>(new Set());
    const navigate = useNavigate();
    const {showToast, toastProps, toastMessage} = useToast();

    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.user.currentUser);
    const {quotes, loading, error} = useAppSelector((state) => state.quote);

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [currentPage]);

    useEffect(() => {
        const fetchQuotes = async () => {
            if (quotes.length === 0) {
                try {
                    dispatch(setQuotesLoading());
                    const quoteList = await bibleService.getQuoteList(user, true);
                    dispatch(setQuotes(quoteList));
                } catch (error) {
                    console.error('Error fetching quotes:', error);
                    dispatch(setQuotesError('Failed to load quotes'));
                }
            }
        };
        if (user) {
            fetchQuotes();
        }
    }, [user, quotes.length, dispatch]);

    // Filter quotes based on search term
    const filteredQuotes = useMemo(() => {
        if (searchTerm.trim() === '') {
            return quotes;
        }

        const searchWords = searchTerm
            .toLowerCase()
            .split(' ')
            .filter((word) => word.length > 0);

        return quotes.filter((quote) => {
            if (!quote.quoteTx) return false;

            const quoteText = quote.quoteTx.toLowerCase();
            // Match only if ALL of the search words are found in the quote
            return searchWords.every((word) => quoteText.includes(word));
        });
    }, [searchTerm, quotes]);

    // Calculate pagination values
    const totalPages = Math.ceil(filteredQuotes.length / QUOTES_PER_PAGE);
    const startIndex = (currentPage - 1) * QUOTES_PER_PAGE;
    const endIndex = startIndex + QUOTES_PER_PAGE;
    const currentQuotes = filteredQuotes.slice(startIndex, endIndex);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleCopyQuote = async (quoteText: string) => {
        try {
            await navigator.clipboard.writeText(quoteText);
            showToast({message: 'Quote copied to clipboard!', variant: 'success'});
        } catch (err) {
            console.error('Failed to copy text:', err);
            showToast({message: 'Failed to copy text', variant: 'error'});
        }
    };

    const toggleQuoteExpansion = (quoteId: number) => {
        setExpandedQuotes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(quoteId)) {
                newSet.delete(quoteId);
            } else {
                newSet.add(quoteId);
            }
            return newSet;
        });
    };

    const highlightSearchTerms = (text: string) => {
        if (!searchTerm.trim()) return text;

        const searchWords = searchTerm
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

    const handleBrowseResults = () => {
        // Store search results and term in Redux
        dispatch(
            setSearchResults({
                quotes: filteredQuotes,
                searchTerm: searchTerm,
            })
        );

        // Navigate to ViewQuotes
        navigate('/viewQuotes');
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const items = [];

        // First page
        items.push(
            <Pagination.First
                key="first"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
            />
        );

        // Previous page
        items.push(
            <Pagination.Prev
                key="prev"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            />
        );

        // Calculate visible page range
        let startPage = Math.max(
            1,
            currentPage - Math.floor(MAX_VISIBLE_PAGES / 2)
        );
        let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
            startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
        }

        // Add ellipsis at start if needed
        if (startPage > 1) {
            items.push(<Pagination.Ellipsis key="ellipsis-start" disabled/>);
        }

        // Add page numbers
        for (let number = startPage; number <= endPage; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === currentPage}
                    onClick={() => setCurrentPage(number)}
                >
                    {number}
                </Pagination.Item>
            );
        }

        // Add ellipsis at end if needed
        if (endPage < totalPages) {
            items.push(<Pagination.Ellipsis key="ellipsis-end" disabled/>);
        }

        // Next page
        items.push(
            <Pagination.Next
                key="next"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            />
        );

        // Last page
        items.push(
            <Pagination.Last
                key="last"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
            />
        );

        return (
            <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 mb-4">
                <Pagination className="mb-0">{items}</Pagination>
                <span className="text-white">
          Page {currentPage} of {totalPages}
        </span>
            </div>
        );
    };

    if (loading) {
        return (
            <Container className="py-4">
                <div className="text-center text-white">
                    <Spinner animation="border" role="status"/>
                    <p className="mt-2">Loading quotes...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-4">
                <div className="text-center text-white">
                    <p>Error: {error}</p>
                </div>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Search Quotes</h1>

            <Form className="mb-4">
                <Form.Group>
                    <Form.Label className="text-white">Search for quotes</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            placeholder="Enter search terms..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <Button
                                variant="outline-secondary"
                                onClick={() => setSearchTerm('')}
                            >
                                <FontAwesomeIcon icon={faTimes}/>
                            </Button>
                        )}
                    </InputGroup>
                    <Form.Text className="text-white-50">
                        Enter one or more words to search for. Quotes containing all of the
                        words will be shown.
                    </Form.Text>
                </Form.Group>
            </Form>

            {/* Browse Results Button */}
            {filteredQuotes.length > 0 && searchTerm.trim() && (
                <div className="mb-3 d-flex justify-content-end">
                    <Button
                        variant="primary"
                        onClick={handleBrowseResults}
                        className="d-flex align-items-center"
                    >
                        <FontAwesomeIcon icon={faEye} className="me-2"/>
                        Browse Results
                    </Button>
                </div>
            )}

            <div className="mb-3 text-white">
                Found {filteredQuotes.length}{' '}
                {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
                {searchTerm.trim() && ` containing all terms in "${searchTerm}"`}
            </div>

            {renderPagination()}

            {currentQuotes.map((quote) => (
                <Card key={quote.quoteId} className="mb-4 bg-dark text-white">
                    <Card.Body>
                        <div className="quote-text mb-3">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: highlightSearchTerms(
                                        expandedQuotes.has(quote.quoteId)
                                            ? quote.quoteTx
                                            : quote.quoteTx.slice(0, MAX_PREVIEW_LENGTH) +
                                            (quote.quoteTx.length > MAX_PREVIEW_LENGTH
                                                ? '...'
                                                : '')
                                    ),
                                }}
                            />
                            {quote.quoteTx.length > MAX_PREVIEW_LENGTH && (
                                <Button
                                    variant="link"
                                    className="text-white p-0"
                                    onClick={() => toggleQuoteExpansion(quote.quoteId)}
                                >
                                    {expandedQuotes.has(quote.quoteId) ? 'Less...' : 'More...'}
                                </Button>
                            )}
                        </div>
                        <div className="d-flex justify-content-end">
                            <Button
                                className="me-2"
                                variant="outline-light"
                                size="sm"
                                onClick={() => handleCopyQuote(quote.quoteTx)}
                            >
                                Copy
                            </Button>
                            <Button
                                variant="outline-light"
                                size="sm"
                                onClick={() => navigate(`/viewQuotes/${quote.quoteId}`)}
                            >
                                Go To...
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            ))}

            {renderPagination()}

            {filteredQuotes.length === 0 && (
                <div className="text-center text-white">
                    <p>No quotes found matching your search.</p>
                </div>
            )}

            <Toast
                {...toastProps}
            >
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default SearchQuotes;
