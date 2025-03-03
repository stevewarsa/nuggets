import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Card, Toast } from 'react-bootstrap';
import { Quote } from '../models/quote';
import { bibleService } from '../services/bible-service';
import { USER } from '../models/constants';
import copy from 'clipboard-copy';
import { useAppSelector } from '../store/hooks';

const SearchQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastBg, setToastBg] = useState<string>('#28a745');
  
  const currentUser = useAppSelector(state => state.user.currentUser);
  const user = currentUser || USER;

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setIsLoading(true);
        // Get quotes with text included for searching
        const quoteList = await bibleService.getQuoteList(user, true);
        setQuotes(quoteList);
        setFilteredQuotes(quoteList);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredQuotes(quotes);
      return;
    }

    const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word.length > 0);
    
    const filtered = quotes.filter(quote => {
      if (!quote.quoteTx) return false;
      
      const quoteText = quote.quoteTx.toLowerCase();
      // Match only if ALL of the search words are found in the quote
      return searchWords.every(word => quoteText.includes(word));
    });
    
    setFilteredQuotes(filtered);
  }, [searchTerm, quotes]);

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
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading quotes...</p>
        </div>
      ) : (
        <>
          <div className="mb-3 text-white">
            Found {filteredQuotes.length} {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
            {searchTerm.trim() && ` containing all terms in "${searchTerm}"`}
          </div>
          
          {filteredQuotes.map((quote) => (
            <Card key={quote.quoteId} className="mb-4 bg-dark text-white">
              <Card.Body>
                {/* Using a div instead of Card.Text to avoid nesting issues */}
                <div 
                  className="quote-text mb-3"
                  dangerouslySetInnerHTML={{ __html: highlightSearchTerms(quote.quoteTx) }}
                />
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="outline-light" 
                    size="sm"
                    onClick={() => handleCopyQuote(quote.quoteTx)}
                  >
                    Copy
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
          
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