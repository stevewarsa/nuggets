import React, {useEffect, useState} from 'react';
import {Button, Card, Container, Form, ListGroup, Modal, Spinner, Toast} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faExternalLinkAlt, faPlus, faStar} from '@fortawesome/free-solid-svg-icons';
import {bibleService} from '../services/bible-service';
import {useAppSelector} from '../store/hooks';

interface Link {
  key: string;
  label: string;
  action: string;
  additional?: boolean;
}

const Links: React.FC = () => {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newLinkLabel, setNewLinkLabel] = useState<string>('');
  const [newLinkUrl, setNewLinkUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastBg, setToastBg] = useState<string>('#28a745');

  const user = useAppSelector(state => state.user.currentUser);

  // Hard-coded links
  const hardcodedLinks: Link[] = [
    {
      key: "4.1",
      label: "Valley of Vision",
      action: "https://banneroftruth.org/us/valley/",
      additional: false
    },
    {
      key: "4.2",
      label: "Spurgeon Morning & Evening",
      action: "http://biblegateway.com/devotionals/morning-and-evening/today",
      additional: false
    },
    {
      key: "4.3",
      label: "Grace Gems",
      action: "http://gracegems.org/",
      additional: false
    },
    {
      key: "4.4",
      label: "Got Questions",
      action: "http://www.gotquestions.net/getrandompage.asp?websiteid=1",
      additional: false
    },
    {
      key: "4.5",
      label: "J.C. Ryle",
      action: "http://gracegems.org/Ryle",
      additional: false
    },
    {
      key: "4.6",
      label: "Our Daily Bread",
      action: "http://odb.org",
      additional: false
    },
    {
      key: "4.7",
      label: "Plugged In Movie Reviews",
      action: "http://www.pluggedin.com",
      additional: false
    }
  ];

  useEffect(() => {
    const fetchAdditionalLinks = async () => {
      try {
        setIsLoading(true);
        const additionalLinks = await bibleService.getAdditionalLinks(user);
        
        // Mark fetched links as additional
        const markedAdditionalLinks = additionalLinks.map(link => ({
          ...link,
          additional: true
        }));
        
        // Combine hardcoded and additional links
        setLinks([...hardcodedLinks, ...markedAdditionalLinks]);
      } catch (error) {
        console.error('Error fetching additional links:', error);
        // If there's an error, still show the hardcoded links
        setLinks(hardcodedLinks);
        
        setToastMessage('Failed to load additional links');
        setToastBg('#dc3545');
        setShowToast(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdditionalLinks();
  }, [user]);

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Generate the next key based on the highest existing key
  const generateNextKey = (): string => {
    // Extract all numeric parts after the dot in keys (e.g., "4.7" -> 7)
    const keyNumbers = links.map(link => {
      const parts = link.key.split('.');
      return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    });
    
    // Find the highest number
    const highestNumber = Math.max(...keyNumbers, 0);
    
    // Return the next key in sequence
    return `4.${highestNumber + 1}`;
  };

  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      setToastMessage('Please enter both a label and URL');
      setToastBg('#dc3545');
      setShowToast(true);
      return;
    }
    
    // Basic URL validation
    if (!newLinkUrl.startsWith('http://') && !newLinkUrl.startsWith('https://')) {
      setToastMessage('URL must start with http:// or https://');
      setToastBg('#dc3545');
      setShowToast(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate the next key
      const newKey = generateNextKey();
      
      // Include the key in the API request
      const result = await bibleService.addAdditionalLink(
        user,
        newLinkLabel,
        newLinkUrl,
        newKey
      );
      
      if (result === 'success') {
        // Add the new link to the list
        const newLink: Link = {
          key: newKey,
          label: newLinkLabel,
          action: newLinkUrl,
          additional: true
        };
        
        setLinks([...links, newLink]);
        
        // Reset form and close modal
        setNewLinkLabel('');
        setNewLinkUrl('');
        setShowAddModal(false);
        
        setToastMessage('Link added successfully!');
        setToastBg('#28a745');
        setShowToast(true);
      } else {
        setToastMessage('Failed to add link');
        setToastBg('#dc3545');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error adding link:', error);
      setToastMessage('Error adding link');
      setToastBg('#dc3545');
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-white">Links</h1>
        <Button 
          variant="primary" 
          onClick={() => setShowAddModal(true)}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Add Link
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center text-white">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading links...</p>
        </div>
      ) : (
        <Card bg="dark" text="white">
          <ListGroup variant="flush">
            {links.map((link) => (
              <ListGroup.Item 
                key={link.key} 
                action 
                onClick={() => handleOpenLink(link.action)}
                className="bg-dark text-white d-flex justify-content-between align-items-center"
              >
                <div>
                  {link.additional && (
                    <FontAwesomeIcon 
                      icon={faStar} 
                      className="me-2 text-warning" 
                      title="Custom Link"
                    />
                  )}
                  {link.label}
                </div>
                <FontAwesomeIcon icon={faExternalLinkAlt} />
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      )}
      
      {/* Add Link Modal */}
      <Modal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>Add New Link</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Link Label</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter link name"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                className="bg-dark text-white border-secondary"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>URL</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://example.com"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="bg-dark text-white border-secondary"
              />
              <Form.Text className="text-muted">
                URL must start with http:// or https://
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white">
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddLink}
            disabled={isSubmitting || !newLinkLabel.trim() || !newLinkUrl.trim()}
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
                Adding...
              </>
            ) : (
              'Add Link'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Toast notification */}
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

export default Links;