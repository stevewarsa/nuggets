// MEMORY PASSAGES flow — modal for typing a Bible reference, selecting a verse range, previewing the text, and adding it as a memory passage.
import React, { useState, useEffect, useRef } from 'react';
import { Button, Col, Form, ListGroup, Modal, Row, Spinner, Toast } from 'react-bootstrap';
import {
    TRANSLATION,
    translationsShortNms,
    getMaxVerse,
    GUEST_USER,
} from '../models/constants';
import {
    getPassageFromPassageRef,
    getNewSuggestions,
    getDisplayBookName,
} from '../models/passage-utils';
import { Passage } from '../models/passage';
import { bibleService } from '../services/bible-service';
import { useAppSelector } from '../store/hooks';
import { useToast } from '../hooks/useToast';

interface AddMemoryPassageModalProps {
    show: boolean;
    onHide: () => void;
}

const AddMemoryPassageModal: React.FC<AddMemoryPassageModalProps> = ({
                                                                         show,
                                                                         onHide,
                                                                     }) => {
    const [passageRef, setPassageRef] = useState('');
    const [suggestions, setSuggestions] = useState<string[] | undefined>([]);
    const [selectedTranslation, setSelectedTranslation] = useState(TRANSLATION);
    const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
    const [chapterPassage, setChapterPassage] = useState<Passage | null>(null);
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const [adding, setAdding] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const user = useAppSelector((state) => state.user.currentUser);
    const { showToast, toastProps, toastMessage } = useToast();

    useEffect(() => {
        if (show && inputRef.current && !selectedPassage) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [show, selectedPassage]);

    useEffect(() => {
        if (!show) {
            setPassageRef('');
            setSuggestions([]);
            setSelectedTranslation(TRANSLATION);
            setSelectedPassage(null);
            setChapterPassage(null);
            setSelectedVerses([]);
            setBusy(false);
            setAdding(false);
            setFetchError(false);
        }
    }, [show]);

    useEffect(() => {
        if (!selectedPassage || !show) return;

        const fetchChapter = async () => {
            try {
                setBusy(true);
                setFetchError(false);
                const maxVerse = getMaxVerse(
                    selectedTranslation,
                    selectedPassage.bookName,
                    selectedPassage.chapter
                );
                const fullPassage = await bibleService.getPassageText(
                    user,
                    selectedTranslation,
                    selectedPassage.bookName,
                    selectedPassage.chapter,
                    1,
                    maxVerse
                );
                setChapterPassage(fullPassage);
            } catch (error) {
                console.error('Error fetching chapter text:', error);
                setFetchError(true);
            } finally {
                setBusy(false);
            }
        };

        fetchChapter();
    }, [selectedPassage, selectedTranslation, show, user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassageRef(e.target.value);
        setSuggestions(getNewSuggestions(e.target.value));
    };

    const handleSuggestionClick = (suggestion: string) => {
        const computedSuggestions = getNewSuggestions(suggestion, true);
        if (computedSuggestions === undefined) {
            setSuggestions([]);
            const passages = getPassageFromPassageRef(suggestion);
            if (passages.length > 0) {
                const p = passages[0];
                setSelectedPassage(p);
                setSelectedVerses([p.startVerse]);
            }
        } else {
            setSuggestions(computedSuggestions);
        }
        setPassageRef(suggestion);
    };

    const handleVerseSelect = (verseNumber: number) => {
        setSelectedVerses((prev) => {
            if (prev.includes(verseNumber)) {
                return prev.filter((v) => v !== verseNumber);
            }
            if (prev.length < 2) {
                return [...prev, verseNumber].sort((a, b) => a - b);
            }
            return [verseNumber];
        });
    };

    const startVerse = selectedVerses.length > 0 ? selectedVerses[0] : -1;
    const endVerse = selectedVerses.length > 1 ? selectedVerses[1] : startVerse;

    const handleAddPassage = async () => {
        if (!selectedPassage || selectedVerses.length === 0) return;
        if (user === GUEST_USER) {
            showToast({
                message: 'Guest users cannot add memory passages',
                variant: 'error',
            });
            return;
        }

        try {
            setAdding(true);
            const passageId = await bibleService.addMemoryPassage(
                user,
                selectedTranslation,
                selectedPassage.bookName,
                selectedPassage.chapter,
                startVerse,
                endVerse
            );

            if (passageId > 0) {
                showToast({
                    message: 'Memory passage added successfully!',
                    variant: 'success',
                });
                onHide();
            } else {
                showToast({
                    message: 'Failed to add memory passage',
                    variant: 'error',
                });
            }
        } catch (error) {
            console.error('Error adding memory passage:', error);
            showToast({ message: 'Error adding memory passage', variant: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleReset = () => {
        setSelectedPassage(null);
        setChapterPassage(null);
        setSelectedVerses([]);
        setPassageRef('');
        setSuggestions([]);
        setFetchError(false);
    };

    const getVerseText = (verse: Passage['verses'][number]) => {
        return verse.verseParts.map((part) => part.verseText).join(' ');
    };

    const passageReference = selectedPassage
        ? `${getDisplayBookName(selectedPassage.bookId)} ${selectedPassage.chapter}:${startVerse}${
            endVerse !== startVerse ? `-${endVerse}` : ''
        }`
        : '';

    const translationName =
        translationsShortNms.find((t) => t.code === selectedTranslation)
            ?.translationName || '';

    const selectedRangeVerses =
        chapterPassage?.verses?.filter((v) => {
            const vn = v.verseParts[0].verseNumber;
            return vn >= startVerse && vn <= endVerse;
        }) || [];

    return (
        <>
            <Modal
                show={show}
                onHide={onHide}
                size="lg"
                style={{ top: '20px' }}
                dialogClassName="modal-near-top"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Add Memory Passage</Modal.Title>
                </Modal.Header>
                <Modal.Body
                    className="bg-dark text-white"
                    style={{ minHeight: '70vh', maxHeight: '80vh', overflowY: 'auto' }}
                >
                    <Row className="mb-3">
                        <Col>
                            <Form.Group>
                                <Form.Label>Translation</Form.Label>
                                <Form.Select
                                    value={selectedTranslation}
                                    onChange={(e) => setSelectedTranslation(e.target.value)}
                                    className="bg-dark text-white"
                                >
                                    {translationsShortNms.map((trans) => (
                                        <option key={trans.code} value={trans.code}>
                                            {trans.translationName}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {!selectedPassage && (
                        <Row>
                            <Col>
                                <div className="position-relative">
                                    <Form.Control
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Type a Bible reference (e.g., John 3:16)"
                                        value={passageRef}
                                        onChange={handleInputChange}
                                        className="mb-2"
                                    />
                                    {suggestions && suggestions.length > 0 && (
                                        <ListGroup
                                            className="position-absolute w-100 shadow-sm"
                                            style={{ zIndex: 1000 }}
                                        >
                                            {suggestions.map((suggestion, index) => (
                                                <ListGroup.Item
                                                    key={index}
                                                    action
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="cursor-pointer"
                                                >
                                                    {suggestion}
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    )}

                    {selectedPassage && (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-white-50">
                  Selected:{' '}
                    {getDisplayBookName(selectedPassage.bookId)}{' '}
                    {selectedPassage.chapter}
                </span>
                                <Button
                                    variant="outline-light"
                                    size="sm"
                                    onClick={handleReset}
                                >
                                    Change Passage
                                </Button>
                            </div>

                            <p className="text-white-50 mb-3">
                                Select one verse for a single verse, or two verses to define a
                                range.
                            </p>

                            {busy && (
                                <div className="text-center mb-3">
                                    <Spinner animation="border" role="status" className="me-2" />
                                    <span>Loading verses...</span>
                                </div>
                            )}

                            {fetchError && !busy && (
                                <p className="text-danger">
                                    Error loading verse text. Please try again.
                                </p>
                            )}

                            {chapterPassage?.verses && !busy && (
                                <div className="d-flex flex-column gap-2 mb-4">
                                    {chapterPassage.verses.map((verse) => (
                                        <Form.Check
                                            key={verse.verseParts[0].verseNumber}
                                            type="checkbox"
                                            id={`add-mem-verse-${verse.verseParts[0].verseNumber}`}
                                            checked={selectedVerses.includes(
                                                verse.verseParts[0].verseNumber
                                            )}
                                            onChange={() =>
                                                handleVerseSelect(verse.verseParts[0].verseNumber)
                                            }
                                            label={
                                                <div>
                                                    <strong>
                                                        {verse.verseParts[0].verseNumber}
                                                    </strong>
                                                    <span className="ms-2">{getVerseText(verse)}</span>
                                                </div>
                                            }
                                        />
                                    ))}
                                </div>
                            )}

                            {selectedRangeVerses.length > 0 && !busy && (
                                <div className="bg-dark p-3 rounded border border-secondary mb-3">
                                    <h5 className="text-white mb-2">
                                        {passageReference}{' '}
                                        <span style={{ color: '#B0E0E6' }}>
                      ({translationName})
                    </span>
                                    </h5>
                                    <div className="text-white">
                                        {selectedRangeVerses.map((verse, verseIndex) => (
                                            <div key={verseIndex} className="mb-2">
                                                {selectedRangeVerses.length > 1 && (
                                                    <span className="verse-number me-2">
                            {verse.verseParts[0].verseNumber}
                          </span>
                                                )}
                                                {verse.verseParts.map((part, partIndex) => (
                                                    <span
                                                        key={`${verseIndex}-${partIndex}`}
                                                        className={
                                                            part.wordsOfChrist
                                                                ? 'words-of-christ'
                                                                : 'verse-text'
                                                        }
                                                    >
                            {part.verseText}{' '}
                          </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddPassage}
                        disabled={
                            selectedVerses.length === 0 ||
                            busy ||
                            adding ||
                            !selectedPassage
                        }
                    >
                        {adding ? 'Adding...' : 'Add Passage'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </>
    );
};

export default AddMemoryPassageModal;
