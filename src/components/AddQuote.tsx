import React, { useState } from 'react';
import { Container, Form, Button, Spinner, Toast } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { bibleService } from '../services/bible-service';
import { USER } from '../models/constants';
import { useAppSelector } from '../store/hooks';

const AddQuote = () => {
  const [quoteText, setQuoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('#28a745');
  
  const navigate = useNavigate();
  const currentUser = useAppSelector(state => state.user.currentUser);
  const user = currentUser || USER;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quoteText.trim()) {
      setToastMessage('Please enter quote text');
      setToastBg('#dc3545');
      setShowToast(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a shortened version of the quote for the prompt
      const prompt = quoteText.substring(0, 10) + '...';
      
      const result = await bibleService.addQuote(user, quoteText, prompt);
      
      if (result && result.quoteId > 1) {
        setToastMessage('Quote added successfully!');
        setToastBg('#28a745');
        setShowToast(true);
        
        // Navigate to ViewQuotes after a short delay
        setTimeout(() => {
          navigate('/viewQuotes');
        }, 1500);
      } else {
        setToastMessage('Failed to add quote');
        setToastBg('#dc3545');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error adding quote:', error);
      setToastMessage('Error adding quote');
      setToastBg('#dc3545');
      setShowToast(true);
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
              fontSize: "1.71rem"
            }}
          />
        </Form.Group>
        
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

export default AddQuote;