// MEMORY PASSAGES flow — list view of all memorization passages with search, expand-to-read, copy, view details, and edit.
import React, { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Form,
    InputGroup,
    Spinner,
    Collapse,
    Button,
    Toast,
    Modal,
    OverlayTrigger,
    Tooltip,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown,
    faChevronRight,
    faCopy,
    faSearch,
    faTimes,
    faEye,
    faPen,
    faCommentDots,
} from '@fortawesome/free-solid-svg-icons';
import { useAppSelector } from '../store/hooks';
import { bibleService } from '../services/bible-service';
import { Passage } from '../models/passage';
import {
    getPassageReference,
    handleCopyPassage,
    getDisplayBookName,
} from '../models/passage-utils';
import { useToast } from '../hooks/useToast';
import EditPassage from './EditPassage';

const MemoryPassages: React.FC = () => {
    const [passages, setPassages] = useState<Passage[]>([]);
    const [overrides, setOverrides] = useState<Passage[]>([]);
    const [expandedPassages, setExpandedPassages] = useState<Set<number>>(
        new Set()
    );
    const [passageTexts, setPassageTexts] = useState<Map<number, string>>(
        new Map()
    );
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingPassageIds, setLoadingPassageIds] = useState<Set<number>>(
        new Set()
    );
    const [viewPassage, setViewPassage] = useState<Passage | null>(null);
    const [editPassage, setEditPassage] = useState<Passage | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [explanationPassage, setExplanationPassage] = useState<Passage | null>(null);
    const [showExplanationEditor, setShowExplanationEditor] = useState(false);
    const [explanationText, setExplanationText] = useState('');
    const [isUpdatingExplanation, setIsUpdatingExplanation] = useState(false);
    const { showToast, toastProps, toastMessage } = useToast();

    const user = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        const fetchPassages = async () => {
            try {
                setIsLoading(true);
                const [memoryPassages, textOverrides] = await Promise.all([
                    bibleService.getMemoryPassageList(user),
                    bibleService.getMemoryPassageTextOverrides(user),
                ]);

                // Sort passages by book ID, chapter, and verse
                const sortedPassages = [...memoryPassages].sort((a, b) => {
                    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
                    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                    return a.startVerse - b.startVerse;
                });

                setPassages(sortedPassages);
                setOverrides(textOverrides);

                // Initialize passage texts with overrides
                const initialTexts = new Map<number, string>();
                textOverrides.forEach((override) => {
                    if (override.verses && override.verses.length > 0) {
                        const text = override.verses
                            .map(
                                (verse) =>
                                    verse.verseParts?.map((part) => part.verseText).join(' ') ??
                                    ''
                            )
                            .join(' ');
                        initialTexts.set(override.passageId, text);
                    }
                });
                setPassageTexts(initialTexts);
            } catch (error) {
                console.error('Error fetching memory passages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchPassages();
        }
    }, [user]);

    const getPassageWithAppendLetter = (passage: Passage): Passage => {
        const override = overrides.find((o) => o.passageId === passage.passageId);
        return override
            ? { ...passage, passageRefAppendLetter: override.passageRefAppendLetter }
            : passage;
    };

    const filteredPassages = useMemo(() => {
        if (!searchTerm.trim()) return passages;

        return passages.filter((passage) => {
            const reference = getPassageReference(
                getPassageWithAppendLetter(passage),
                false
            ).toLowerCase();
            return reference.includes(searchTerm.toLowerCase());
        });
    }, [passages, searchTerm]);

    const togglePassage = async (passageId: number) => {
        const newExpandedPassages = new Set(expandedPassages);

        if (expandedPassages.has(passageId)) {
            newExpandedPassages.delete(passageId);
            setExpandedPassages(newExpandedPassages);
            return;
        }

        // If we don't have the text yet, fetch it
        if (!passageTexts.has(passageId)) {
            const passage = passages.find((p) => p.passageId === passageId);
            if (!passage) return;

            setLoadingPassageIds((prev) => new Set(prev).add(passageId));

            try {
                const passageWithText = await bibleService.getPassageText(
                    user,
                    passage.translationName,
                    passage.bookName,
                    passage.chapter,
                    passage.startVerse,
                    passage.endVerse
                );

                // Add null checks for verses and verseParts
                const text =
                    passageWithText?.verses
                        ?.map(
                            (verse) =>
                                verse?.verseParts
                                    ?.map((part) => part?.verseText ?? '')
                                    .join(' ') ?? ''
                        )
                        .join(' ') ?? '';

                setPassageTexts((prev) => new Map(prev).set(passageId, text));
            } catch (error) {
                console.error('Error fetching passage text:', error);
            } finally {
                setLoadingPassageIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(passageId);
                    return newSet;
                });
            }
        }

        newExpandedPassages.add(passageId);
        setExpandedPassages(newExpandedPassages);
    };

    const handleCopy = (passage: Passage) => {
        handleCopyPassage(
            passage,
            passageTexts.get(passage.passageId)
        ).then((success) => {
            if (success) {
                showToast({ message: 'Passage copied to clipboard!', variant: 'success' });
            } else {
                showToast({ message: 'Failed to copy text', variant: 'error' });
            }
        });
    };

    const handleView = (passage: Passage) => {
        setViewPassage(passage);
    };

    const handleEdit = (passage: Passage) => {
        setEditPassage(passage);
        setShowEditModal(true);
    };

    const handleExplanation = (passage: Passage) => {
        setExplanationPassage(passage);
        setExplanationText(passage.explanation || '');
        setShowExplanationEditor(true);
    };

    const handleSaveExplanation = async () => {
        if (!explanationPassage || !explanationText.trim()) return;

        setIsUpdatingExplanation(true);
        try {
            const updatedPassage: Passage = {
                ...explanationPassage,
                explanation: explanationText.trim(),
            };

            const result = await bibleService.updatePassage(user, updatedPassage);

            if (result === 'success') {
                const updatedList = passages.map((p) =>
                    p.passageId === updatedPassage.passageId ? updatedPassage : p
                );
                setPassages(updatedList);

                showToast({ message: 'Explanation saved successfully', variant: 'success' });
                setShowExplanationEditor(false);
            } else {
                showToast({ message: 'Failed to save explanation', variant: 'error' });
            }
        } catch (error) {
            console.error('Error saving explanation:', error);
            showToast({ message: 'Error saving explanation', variant: 'error' });
        } finally {
            setIsUpdatingExplanation(false);
        }
    };

    const handleEditingComplete = (
        updatedPassage: Passage | null,
        overrideText: string | null
    ) => {
        setShowEditModal(false);

        if (updatedPassage) {
            const updatedList = passages.map((p) =>
                p.passageId === updatedPassage.passageId ? updatedPassage : p
            );
            setPassages(updatedList);

            if (overrideText !== null) {
                const newOverride: Passage = {
                    ...updatedPassage,
                    verses: [
                        {
                            passageId: updatedPassage.passageId,
                            verseParts: [
                                {
                                    verseNumber: updatedPassage.startVerse,
                                    versePartId: 1,
                                    verseText: overrideText,
                                    wordsOfChrist: false,
                                },
                            ],
                        },
                    ],
                };

                const updatedOverrides = overrides.filter(
                    (o) => o.passageId !== updatedPassage.passageId
                );
                updatedOverrides.push(newOverride);
                setOverrides(updatedOverrides);
                setPassageTexts((prev) => new Map(prev).set(updatedPassage.passageId, overrideText));
            }

            showToast({ message: 'Passage updated successfully', variant: 'success' });
        }

        setEditPassage(null);
    };

    const boxLabel = (frequencyDays: number) => {
        if (frequencyDays === -1) return 'Every Time';
        return `Box ${frequencyDays}`;
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status" />
                <p className="mt-2">Loading memory passages...</p>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">My Memory Passages</h1>

            <Form className="mb-4">
                <InputGroup>
                    <InputGroup.Text className="bg-dark text-white border-secondary">
                        <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Search passages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-dark text-white border-secondary"
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
            </Form>

            <ol className="list-group">
                {filteredPassages.map((passage) => (
                    <li
                        key={passage.passageId}
                        className="list-group-item bg-dark text-white border-secondary mb-2"
                    >
                        <div className="d-flex align-items-center">
                            <Button
                                variant="link"
                                className="text-white p-0 me-2"
                                onClick={() => togglePassage(passage.passageId)}
                            >
                                <FontAwesomeIcon
                                    icon={
                                        expandedPassages.has(passage.passageId)
                                            ? faChevronDown
                                            : faChevronRight
                                    }
                                />
                            </Button>
                            <span>
                {getPassageReference(getPassageWithAppendLetter(passage), false)}
              </span>
                            {loadingPassageIds.has(passage.passageId) && (
                                <Spinner animation="border" size="sm" className="ms-2" />
                            )}
                        </div>
                        <Collapse in={expandedPassages.has(passage.passageId)}>
                            <div className="mt-3">
                                <p className="mb-2 quote-text">
                                    {passageTexts.get(passage.passageId)}
                                </p>
                                <div className="d-flex gap-2">
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip id={`view-tooltip-${passage.passageId}`}>
                                                View Details
                                            </Tooltip>
                                        }
                                    >
                                        <Button
                                            variant="outline-light"
                                            size="sm"
                                            onClick={() => handleView(getPassageWithAppendLetter(passage))}
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip id={`edit-tooltip-${passage.passageId}`}>
                                                Edit Passage
                                            </Tooltip>
                                        }
                                    >
                                        <Button
                                            variant="outline-light"
                                            size="sm"
                                            onClick={() => handleEdit(getPassageWithAppendLetter(passage))}
                                        >
                                            <FontAwesomeIcon icon={faPen} />
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip id={`copy-tooltip-${passage.passageId}`}>
                                                Copy to Clipboard
                                            </Tooltip>
                                        }
                                    >
                                        <Button
                                            variant="outline-light"
                                            size="sm"
                                            onClick={() => handleCopy(passage)}
                                        >
                                            <FontAwesomeIcon icon={faCopy} />
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip id={`explanation-tooltip-${passage.passageId}`}>
                                                Add/Update Explanation
                                            </Tooltip>
                                        }
                                    >
                                        <Button
                                            variant="outline-light"
                                            size="sm"
                                            onClick={() => handleExplanation(getPassageWithAppendLetter(passage))}
                                        >
                                            <FontAwesomeIcon icon={faCommentDots} />
                                        </Button>
                                    </OverlayTrigger>
                                </div>
                            </div>
                        </Collapse>
                    </li>
                ))}
            </ol>

            {filteredPassages.length === 0 && (
                <p className="text-center text-white">
                    {searchTerm
                        ? 'No passages match your search.'
                        : 'No memory passages found.'}
                </p>
            )}

            {/* View Details Modal */}
            <Modal
                show={viewPassage !== null}
                onHide={() => setViewPassage(null)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>
                        {viewPassage &&
                            getPassageReference(getPassageWithAppendLetter(viewPassage), false)}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {viewPassage && (
                        <>
                            <div className="mb-3">
                                <strong>Passage Text:</strong>
                                <p
                                    className="mb-0 mt-1 quote-text"
                                    style={{ whiteSpace: 'pre-line' }}
                                >
                                    {passageTexts.get(viewPassage.passageId) ||
                                        'Text not loaded. Expand the passage first to load it.'}
                                </p>
                            </div>
                            <hr className="border-secondary" />
                            <div className="mb-2">
                                <strong>Box:</strong> {boxLabel(viewPassage.frequencyDays)}
                            </div>
                            <div className="mb-2">
                                <strong>Passage ID:</strong> {viewPassage.passageId}
                            </div>
                            <div className="mb-2">
                                <strong>Translation:</strong> {viewPassage.translationName}
                            </div>
                            <div className="mb-2">
                                <strong>Book:</strong>{' '}
                                {getDisplayBookName(viewPassage.bookId)} (ID: {viewPassage.bookId})
                            </div>
                            <div className="mb-2">
                                <strong>Chapter:</strong> {viewPassage.chapter}
                            </div>
                            <div className="mb-2">
                                <strong>Verses:</strong> {viewPassage.startVerse}
                                {viewPassage.endVerse !== viewPassage.startVerse
                                    ? `–${viewPassage.endVerse}`
                                    : ''}
                            </div>
                            {viewPassage.passageRefAppendLetter && (
                                <div className="mb-2">
                                    <strong>Append Letter:</strong>{' '}
                                    {viewPassage.passageRefAppendLetter}
                                </div>
                            )}
                            <div className="mb-2">
                                <strong>Last Practiced:</strong>{' '}
                                {viewPassage.last_viewed_str || 'Never'}
                            </div>
                            {viewPassage.explanation && (
                                <>
                                    <hr className="border-secondary" />
                                    <div>
                                        <strong>Explanation:</strong>
                                        <p
                                            className="mb-0 mt-1"
                                            style={{ whiteSpace: 'pre-line' }}
                                        >
                                            {viewPassage.explanation}
                                        </p>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setViewPassage(null)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Explanation Editor Modal */}
            <Modal
                show={showExplanationEditor}
                onHide={() => setShowExplanationEditor(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>
                        {explanationPassage?.explanation
                            ? 'Update Explanation'
                            : 'Add Explanation'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {explanationPassage && (
                        <div className="mb-3">
                            <h5>{getPassageReference(explanationPassage)}</h5>
                            <p className="text-white-50" style={{ whiteSpace: 'pre-line' }}>
                                {passageTexts.get(explanationPassage.passageId) || ''}
                            </p>
                        </div>
                    )}
                    <Form.Group>
                        <Form.Label>Explanation</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={10}
                            value={explanationText}
                            onChange={(e) => setExplanationText(e.target.value)}
                            className="bg-dark text-white"
                            placeholder="Enter explanation..."
                            style={{
                                minHeight: '50vh',
                                whiteSpace: 'pre-line',
                                fontSize: '1.71rem',
                            }}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => setShowExplanationEditor(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveExplanation}
                        disabled={isUpdatingExplanation || !explanationText.trim()}
                    >
                        {isUpdatingExplanation ? (
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
                        ) : explanationPassage?.explanation ? (
                            'Update Explanation'
                        ) : (
                            'Add Explanation'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Passage Modal */}
            {editPassage && (
                <EditPassage
                    props={{
                        passage: editPassage,
                        overrides: overrides,
                        visible: showEditModal,
                        setVisibleFunction: (
                            updatedPassage: Passage,
                            newText: string,
                            closedNoChange: boolean
                        ) =>
                            closedNoChange
                                ? setShowEditModal(false)
                                : handleEditingComplete(updatedPassage, newText),
                    }}
                />
            )}

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default MemoryPassages;
