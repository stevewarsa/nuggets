import React, {useState, useEffect, useMemo} from 'react';
import {Container, Form, Button, Spinner, Card, Toast, Pagination} from 'react-bootstrap';
import {Quote} from '../models/quote';
import {bibleService} from '../services/bible-service';
import {USER} from '../models/constants';
import copy from 'clipboard-copy';
import {useAppSelector} from '../store/hooks';
import {useNavigate} from "react-router-dom";

const QUOTES_PER_PAGE = 4;
const MAX_VISIBLE_PAGES = 5; // Number of page numbers to show at once

const SearchQuotes: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showToast, setShowToast] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastBg, setToastBg] = useState<string>('#28a745');
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    const currentUser = useAppSelector(state => state.user.currentUser);
    const user = currentUser || USER;

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                setIsLoading(true);
                // Get quotes with text included for searching
                const quoteList = await bibleService.getQuoteList(user, true);
                setQuotes(quoteList);
            } catch (error) {
                console.error('Error fetching quotes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuotes();
    }, [user]);

    // Filter quotes based on search term
    const filteredQuotes = useMemo(() => {
        if (searchTerm.trim() === '') {
            return quotes;
        }

        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word.length > 0);

        return quotes.filter(quote => {
            if (!quote.quoteTx) return false;

            const quoteText = quote.quoteTx.toLowerCase();
            // Match only if ALL of the search words are found in the quote
            return searchWords.every(word => quoteText.includes(word));
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
            await copy(quoteText);
            setToastMessage('Quote copied to clipboard!');
            setToastBg('#28a745');
            setShowToast(true);
        } catch (err) {
            console.error('Failed to copy text:', err);
            setToastMessage('Failed to copy text');
            setToastBg('#dc3545');
            setShowToast(true);
        }
    };

    const highlightSearchTerms = (text: string) => {
        if (!searchTerm.trim()) return text;

        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word.length > 0);
        let highlightedText = text;

        searchWords.forEach(word => {
            if (word.length > 0) {
                const regex = new RegExp(`(${word})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<span style="background-color: yellow; color: black">$1</span>');
            }
        });

        return highlightedText;
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
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            />
        );

        // Calculate visible page range
        let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Search Quotes</h1>

            <Form className="mb-4">
                <Form.Group>
                    <Form.Label className="text-white">Search for quotes</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter search terms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Form.Text className="text-white-50">
                        Enter one or more words to search for. Quotes containing all of the words will be shown.
                    </Form.Text>
                </Form.Group>
            </Form>

            {isLoading ? (
                <div className="text-center text-white">
                    <Spinner animation="border" role="status"/>
                    <p className="mt-2">Loading quotes...</p>
                </div>
            ) : (
                <>
                    <div className="mb-3 text-white">
                        Found {filteredQuotes.length} {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
                        {searchTerm.trim() && ` containing all terms in "${searchTerm}"`}
                    </div>

                    {renderPagination()}

                    {currentQuotes.map((quote) => (
                        <Card key={quote.quoteId} className="mb-4 bg-dark text-white">
                            <Card.Body>
                                <div
                                    className="quote-text mb-3"
                                    dangerouslySetInnerHTML={{__html: highlightSearchTerms(quote.quoteTx)}}
                                />
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

                    {filteredQuotes.length === 0 && !isLoading && (
                        <div className="text-center text-white">
                            <p>No quotes found matching your search.</p>
                        </div>
                    )}
                </>
            )}

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
        </Container>
    );
};

export default SearchQuotes;