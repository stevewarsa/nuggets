import React, { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    Container,
    Form,
    InputGroup,
    Modal,
    Pagination,
    Spinner,
    Toast,
} from 'react-bootstrap';
import { bibleService } from '../services/bible-service';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import {
    setQuotes,
    setQuotesError,
    setQuotesLoading,
    removeQuote,
} from '../store/quoteSlice';
import { setSearchResults } from '../store/searchSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faEye,
    faCopy,
    faTrashAlt,
    faSearchPlus,
    faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';
import { Quote } from '../models/quote';

const QUOTES_PER_PAGE = 4;
const MAX_VISIBLE_PAGES = 5;
const MAX_PREVIEW_LENGTH = 100;

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const escapeRegex = (s: string): string =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (text: string): string =>
    text.toLowerCase().replace(/\s+/g, ' ').trim();

interface DuplicateGroup {
    type: 'exact' | 'substring';
    quotes: Quote[];
}

const findDuplicateGroups = (allQuotes: Quote[]): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const seenIds = new Set<number>();

    // Sort by quoteId ascending so we keep the oldest as the "original"
    const sorted = [...allQuotes]
        .filter((q) => q.quoteTx && q.quoteTx.trim().length > 0)
        .sort((a, b) => a.quoteId - b.quoteId);

    for (let i = 0; i < sorted.length; i++) {
        if (seenIds.has(sorted[i].quoteId)) continue;

        const normI = normalizeText(sorted[i].quoteTx);
        const exactMatches: Quote[] = [];
        const substringMatches: Quote[] = [];

        for (let j = i + 1; j < sorted.length; j++) {
            if (seenIds.has(sorted[j].quoteId)) continue;

            const normJ = normalizeText(sorted[j].quoteTx);

            if (normI === normJ) {
                exactMatches.push(sorted[j]);
                seenIds.add(sorted[j].quoteId);
            } else if (
                normJ.includes(normI) ||
                normI.includes(normJ)
            ) {
                substringMatches.push(sorted[j]);
                seenIds.add(sorted[j].quoteId);
            }
        }

        if (exactMatches.length > 0) {
            groups.push({
                type: 'exact',
                quotes: [sorted[i], ...exactMatches],
            });
        } else if (substringMatches.length > 0) {
            groups.push({
                type: 'substring',
                quotes: [sorted[i], ...substringMatches],
            });
        }
    }

    return groups;
};

const SearchQuotes: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedQuotes, setExpandedQuotes] = useState<Set<number>>(new Set());
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [scanningDuplicates, setScanningDuplicates] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
    const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
    const [deletingQuote, setDeletingQuote] = useState(false);
    const navigate = useNavigate();
    const { showToast, toastProps, toastMessage } = useToast();

    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.user.currentUser);
    const { quotes, loading, error } = useAppSelector((state) => state.quote);

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            showToast({ message: 'Quote copied to clipboard!', variant: 'success' });
        } catch (e) {
            console.error('Failed to copy text:', e);
            showToast({
                message: `Error occurred copying quote: ${
                    e?.message || e?.toString() || 'Unknown error'
                }`,
                variant: 'error',
            });
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
        if (!searchTerm.trim()) return escapeHtml(text);

        const searchWords = searchTerm
            .toLowerCase()
            .split(' ')
            .filter((word) => word.length > 0)
            .sort((a, b) => b.length - a.length);

        if (searchWords.length === 0) return escapeHtml(text);

        const escaped = escapeHtml(text);
        const pattern = searchWords.map(escapeRegex).join('|');

        return escaped.replace(
            new RegExp(`(${pattern})`, 'gi'),
            '<span style="background-color: yellow; color: black">$1</span>'
        );
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

    const handleFindDuplicates = () => {
        setScanningDuplicates(true);
        // Use setTimeout to allow the spinner to render before the potentially heavy computation
        setTimeout(() => {
            const groups = findDuplicateGroups(quotes);
            setDuplicateGroups(groups);
            setShowDuplicates(true);
            setScanningDuplicates(false);
            if (groups.length === 0) {
                showToast({
                    message: 'No duplicates found!',
                    variant: 'success',
                });
            } else {
                showToast({
                    message: `Found ${groups.length} duplicate group${groups.length === 1 ? '' : 's'}.`,
                    variant: 'success',
                });
            }
        }, 50);
    };

    const handleDeleteQuote = async () => {
        if (!quoteToDelete || !user) return;

        setDeletingQuote(true);
        try {
            const result = await bibleService.deleteQuote(user, quoteToDelete.quoteId);
            if (result === 'success') {
                dispatch(removeQuote(quoteToDelete.quoteId));

                // Remove from duplicate groups as well
                setDuplicateGroups((prevGroups) =>
                    prevGroups
                        .map((group) => ({
                            ...group,
                            quotes: group.quotes.filter(
                                (q) => q.quoteId !== quoteToDelete.quoteId
                            ),
                        }))
                        .filter((group) => group.quotes.length > 1)
                );

                showToast({
                    message: 'Quote deleted successfully.',
                    variant: 'success',
                });
                setQuoteToDelete(null);
            } else {
                showToast({
                    message: 'Failed to delete quote.',
                    variant: 'error',
                });
            }
        } catch (e) {
            console.error('Error deleting quote:', e);
            showToast({
                message: `Error deleting quote: ${
                    e?.message || e?.toString() || 'Unknown error'
                }`,
                variant: 'error',
            });
        } finally {
            setDeletingQuote(false);
        }
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
            items.push(<Pagination.Ellipsis key="ellipsis-start" disabled />);
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
            items.push(<Pagination.Ellipsis key="ellipsis-end" disabled />);
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

    const renderDuplicateCard = (quote: Quote, type: 'exact' | 'substring') => (
        <Card key={quote.quoteId} className="mb-3 bg-dark text-white border-danger">
            <Card.Body>
                <div className="d-flex align-items-start justify-content-between mb-2">
                    <Badge bg={type === 'exact' ? 'danger' : 'warning'} text-dark={type === 'substring'}>
                        {type === 'exact' ? 'Exact Duplicate' : 'Possible Duplicate'}
                    </Badge>
                    <Badge bg="secondary">ID: {quote.quoteId}</Badge>
                </div>
                <div className="quote-text mb-3" style={{ fontSize: '0.9rem' }}>
                    {quote.quoteTx}
                </div>
                <div className="d-flex justify-content-end gap-2">
                    <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => handleCopyQuote(quote.quoteTx)}
                    >
                        <FontAwesomeIcon icon={faCopy} className="me-1" />
                        Copy
                    </Button>
                    <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => navigate(`/viewQuotes/${quote.quoteId}`)}
                    >
                        Go To...
                    </Button>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => setQuoteToDelete(quote)}
                    >
                        <FontAwesomeIcon icon={faTrashAlt} className="me-1" />
                        Delete
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );

    const renderDuplicateGroups = () => (
        <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="text-white mb-0">
                    Duplicate Quotes
                    <Badge bg="danger" className="ms-2">
                        {duplicateGroups.length} group
                        {duplicateGroups.length === 1 ? '' : 's'}
                    </Badge>
                </h2>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowDuplicates(false)}
                >
                    <FontAwesomeIcon icon={faTimes} className="me-1" />
                    Close
                </Button>
            </div>

            {duplicateGroups.length === 0 ? (
                <Card className="bg-dark text-white">
                    <Card.Body className="text-center py-4">
                        <p className="mb-0">No duplicates found in your quote collection.</p>
                    </Card.Body>
                </Card>
            ) : (
                duplicateGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="mb-4">
                        <div className="d-flex align-items-center mb-2">
                            <Badge
                                bg={group.type === 'exact' ? 'danger' : 'warning'}
                                text-dark={group.type === 'substring'}
                                className="me-2"
                            >
                                {group.type === 'exact'
                                    ? 'Exact Duplicates'
                                    : 'Possible Duplicates (substring match)'}
                            </Badge>
                            <span className="text-white-50">
                Group {groupIdx + 1} — {group.quotes.length} quotes
              </span>
                        </div>
                        {group.quotes.map((quote) => renderDuplicateCard(quote, group.type))}
                    </div>
                ))
            )}
        </div>
    );

    if (loading) {
        return (
            <Container className="py-4">
                <div className="text-center text-white">
                    <Spinner animation="border" role="status" />
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
                                <FontAwesomeIcon icon={faTimes} />
                            </Button>
                        )}
                    </InputGroup>
                    <Form.Text className="text-white-50">
                        Enter one or more words to search for. Quotes containing all of the
                        words will be shown.
                    </Form.Text>
                </Form.Group>
            </Form>

            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div className="text-white">
                    Found {filteredQuotes.length}{' '}
                    {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
                    {searchTerm.trim() && ` containing all terms in "${searchTerm}"`}
                </div>
                <div className="d-flex gap-2">
                    {filteredQuotes.length > 0 && searchTerm.trim() && (
                        <Button
                            variant="primary"
                            onClick={handleBrowseResults}
                            className="d-flex align-items-center"
                        >
                            <FontAwesomeIcon icon={faEye} className="me-2" />
                            Browse Results
                        </Button>
                    )}
                    <Button
                        variant="outline-warning"
                        onClick={handleFindDuplicates}
                        disabled={scanningDuplicates || quotes.length === 0}
                        className="d-flex align-items-center"
                    >
                        {scanningDuplicates ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    className="me-2"
                                />
                                Scanning...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSearchPlus} className="me-2" />
                                Find Duplicates
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {showDuplicates && renderDuplicateGroups()}

            {!showDuplicates && (
                <>
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
                                            {expandedQuotes.has(quote.quoteId)
                                                ? 'Less...'
                                                : 'More...'}
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
                            <Button
                                variant="primary"
                                onClick={() => navigate('/addQuote')}
                                className="d-inline-flex align-items-center mt-2"
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add Quote
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                show={quoteToDelete !== null}
                onHide={() => (deletingQuote ? undefined : setQuoteToDelete(null))}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Delete Quote</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <p>Are you sure you want to delete this quote?</p>
                    <p className="mb-0 text-danger">
                        This action cannot be undone.
                    </p>
                    {quoteToDelete && (
                        <div
                            className="mt-3 p-3 rounded"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                fontSize: '0.9rem',
                                maxHeight: '200px',
                                overflowY: 'auto',
                            }}
                        >
                            {quoteToDelete.quoteTx}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => setQuoteToDelete(null)}
                        disabled={deletingQuote}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteQuote}
                        disabled={deletingQuote}
                    >
                        {deletingQuote ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    className="me-2"
                                />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faTrashAlt} className="me-2" />
                                Delete Permanently
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default SearchQuotes;
