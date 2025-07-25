import React, {useState} from 'react';
import {
    Button,
    Col,
    Container,
    Form,
    Modal,
    Row,
    Toast,
} from 'react-bootstrap';
import {bookAbbrev, translations} from '../models/constants';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {getDisplayBookName} from '../models/passage-utils';
import {useAppSelector} from '../store/hooks';
import {useNavigate} from 'react-router-dom';
import {useToast} from '../hooks/useToast';

const BibleSearch: React.FC = () => {
    const navigate = useNavigate();
    const [testament, setTestament] = useState<string>('both');
    const [selectedBook, setSelectedBook] = useState<string>('All');
    const [selectedTranslation, setSelectedTranslation] = useState<string>('all');
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const [searchResults, setSearchResults] = useState<Passage[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
    const [emailAddress, setEmailAddress] = useState<string>('');
    const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
    const {showToast, toastProps, toastMessage} = useToast();

    const user = useAppSelector((state) => state.user.currentUser);

    const testamentOptions = [
        {label: 'NT', value: 'new'},
        {label: 'OT', value: 'old'},
        {label: 'Full', value: 'both'},
        {label: 'Gospels', value: 'gospels'},
        {label: "Paul's Letters", value: 'pauls_letters'},
        {label: 'Non-Pauline Letters', value: 'non_pauline_letters'},
    ];

    const handleSearch = async () => {
        try {
            setIsSearching(true);

            const translationsToSearch =
                selectedTranslation === 'all'
                    ? translations.map((t) => t.code)
                    : [selectedTranslation];

            const results = await bibleService.searchBible({
                book: selectedBook,
                translations: translationsToSearch,
                testament: testament,
                searchPhrase: searchPhrase,
                user: user,
            });

            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const highlightSearchText = (text: string) => {
        if (!searchPhrase) return text;

        const searchTerms = searchPhrase
            .replace(/\*/g, '\\w*') // Convert wildcard to regex pattern
            .split(' ')
            .filter((term) => term.length > 0);

        const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
        return text.split(regex).map((part, i) =>
                regex.test(part) ? (
                    <span key={i} style={{color: 'green'}}>
          {part}
        </span>
                ) : (
                    part
                )
        );
    };

    const handleGoToVerse = (passage: Passage) => {
        const readChapRoute = `/readBibleChapter/${passage.translationName}/${passage.bookName}/${passage.chapter}/${passage.startVerse}`;
        console.log(
            'BibleSearch.handleGoToVerse - navigating to route:',
            readChapRoute
        );
        navigate(readChapRoute);
    };

    const handleCopyPassage = async (passage: Passage) => {
        try {
            const reference = `${getDisplayBookName(passage.bookId)} ${
                passage.chapter
            }:${passage.startVerse}${
                passage.endVerse !== passage.startVerse ? `-${passage.endVerse}` : ''
            }`;

            // Get the verse text without verse numbers
            let verseText = '';
            passage.verses.forEach((verse) => {
                verse.verseParts.forEach((part) => {
                    verseText += part.verseText + ' ';
                });
            });

            // Don't include the translation in the copied text
            const textToCopy = `${reference}\n\n${verseText.trim()}`;

            await navigator.clipboard.writeText(textToCopy);
            showToast({message: 'Passage copied to clipboard!', variant: 'success'});
        } catch (err) {
            console.error('Failed to copy text:', err);
            showToast({message: 'Failed to copy text', variant: 'error'});
        }
    };

    const handleSendEmail = async () => {
        if (!emailAddress || !searchResults.length) return;

        setIsSendingEmail(true);
        try {
            // Format search results for email
            const formattedResults: [string, string][] = searchResults.map(
                (passage) => {
                    const reference = `${getDisplayBookName(passage.bookId)} ${
                        passage.chapter
                    }:${passage.startVerse}${
                        passage.endVerse !== passage.startVerse
                            ? `-${passage.endVerse}`
                            : ''
                    } (${passage.translationId.toUpperCase()})`;

                    let verseText = '';
                    passage.verses.forEach((verse) => {
                        verse.verseParts.forEach((part) => {
                            const text = part.verseText;
                            // Add words of Christ class if needed
                            const formattedText = part.wordsOfChrist
                                ? `<span class='wordsOfChrist'>${text}</span>`
                                : text;
                            verseText += formattedText + ' ';
                        });
                    });

                    // Highlight search terms
                    const searchTerms = searchPhrase
                        .replace(/\*/g, '\\w*')
                        .split(' ')
                        .filter((term) => term.length > 0);

                    const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
                    verseText = verseText.replace(
                        regex,
                        "<span class='search_result'>$1</span>"
                    );

                    return [reference, verseText.trim()];
                }
            );

            const result = await bibleService.sendSearchResults({
                emailTo: emailAddress,
                searchResults: formattedResults,
                searchParam: {
                    book: selectedBook,
                    translation: selectedTranslation,
                    testament: testament,
                    searchPhrase: searchPhrase,
                    user: user,
                },
            });

            if (result === 'success') {
                showToast({message: 'Search results sent successfully!', variant: 'success'});
                setShowEmailModal(false);
                setEmailAddress('');
            } else {
                showToast({message: `Failed to send email: ${result}`, variant: 'error'});
            }
        } catch (error) {
            console.error('Error sending email:', error);
            showToast({message: 'Error sending email', variant: 'error'});
        } finally {
            setIsSendingEmail(false);
        }
    };

    const renderPassage = (passage: Passage) => {
        const reference = `${getDisplayBookName(passage.bookId)} ${
            passage.chapter
        }:${passage.startVerse}${
            passage.endVerse !== passage.startVerse ? `-${passage.endVerse}` : ''
        }`;
        const translationName =
            translations.find((t) => t.code === passage.translationId)
                ?.translationName || passage.translationId;

        return (
            <div className="bg-dark p-4 rounded mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="text-white mb-0">
                        {reference}{' '}
                        <span style={{color: '#B0E0E6'}}>({translationName})</span>
                    </h3>
                    <Button
                        variant="outline-light"
                        size="sm"
                        className="me-2"
                        onClick={() => handleCopyPassage(passage)}
                    >
                        Copy
                    </Button>
                    <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => handleGoToVerse(passage)}
                    >
                        Go...
                    </Button>
                </div>
                <div className="text-white">
                    {passage.verses.map((verse, verseIndex) => (
                        <div key={verseIndex} className="mb-2">
                            {verse.verseParts.map((part, partIndex) => (
                                <React.Fragment key={`${verseIndex}-${partIndex}`}>
                                    {verseIndex === 0 &&
                                        partIndex === 0 &&
                                        passage.verses.length > 1 && (
                                            <span className="me-2">
                        {verse.verseParts[0].verseNumber}
                      </span>
                                        )}
                                    <span
                                        className={
                                            part.wordsOfChrist ? 'words-of-christ' : 'verse-text'
                                        }
                                    >
                    {highlightSearchText(part.verseText)}{' '}
                  </span>
                                </React.Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Bible Search</h1>

            <Form className="mb-4">
                {/* Testament Selection */}
                <Row className="mb-3">
                    <Col>
                        <div className="bg-dark p-3 rounded">
                            {testamentOptions.map((option) => (
                                <Form.Check
                                    key={option.value}
                                    inline
                                    type="radio"
                                    id={`testament-${option.value}`}
                                    label={option.label}
                                    name="testament"
                                    value={option.value}
                                    checked={testament === option.value}
                                    onChange={(e) => setTestament(e.target.value)}
                                    className="text-white me-3"
                                />
                            ))}
                        </div>
                    </Col>
                </Row>

                {/* Book Selection */}
                <Row className="mb-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="text-white">Select Book</Form.Label>
                            <Form.Select
                                value={selectedBook}
                                onChange={(e) => setSelectedBook(e.target.value)}
                            >
                                <option value="All">ALL</option>
                                {Object.entries(bookAbbrev).map(([key, [_, longName]]) => (
                                    <option key={key} value={key}>
                                        {longName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>

                    {/* Translation Selection */}
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="text-white">Select Translation</Form.Label>
                            <Form.Select
                                value={selectedTranslation}
                                onChange={(e) => setSelectedTranslation(e.target.value)}
                            >
                                <option value="all">ALL</option>
                                {translations.map((trans) => (
                                    <option key={trans.code} value={trans.code}>
                                        {trans.translationName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                {/* Search Phrase */}
                <Row className="mb-3">
                    <Col>
                        <Form.Group>
                            <Form.Label className="text-white">
                                Search Phrase (use * for wildcard)
                            </Form.Label>
                            <Form.Control
                                type="text"
                                value={searchPhrase}
                                onChange={(e) => setSearchPhrase(e.target.value)}
                                placeholder="Enter search phrase..."
                            />
                        </Form.Group>
                    </Col>
                </Row>

                {/* Search Button */}
                <Row>
                    <Col className="text-center">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleSearch}
                            disabled={isSearching || !searchPhrase.trim()}
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </Button>
                    </Col>
                </Row>
            </Form>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2 className="text-white mb-0">
                            Search Results ({searchResults.length})
                        </h2>
                        <Button
                            variant="outline-light"
                            onClick={() => setShowEmailModal(true)}
                        >
                            Email Results
                        </Button>
                    </div>
                    {searchResults.map((passage, index) => (
                        <div key={`${passage.passageId}-${index}`}>
                            {renderPassage(passage)}
                        </div>
                    ))}
                </div>
            )}

            {/* Email Modal */}
            <Modal
                show={showEmailModal}
                onHide={() => setShowEmailModal(false)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Email Search Results</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        <Form.Group>
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                                placeholder="Enter email address..."
                                className="bg-dark text-white"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSendEmail}
                        disabled={isSendingEmail || !emailAddress.trim()}
                    >
                        {isSendingEmail ? 'Sending...' : 'Send'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast notification for copy success/failure */}
            <Toast
                {...toastProps}
            >
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default BibleSearch;
