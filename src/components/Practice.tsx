import {Button, Collapse, Container, Form, InputGroup, Modal, Spinner, Toast,} from 'react-bootstrap';
import {useNavigate, useParams} from 'react-router-dom';
import {useEffect, useRef, useState} from 'react';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {GUEST_USER} from '../models/constants';
import Toolbar from './Toolbar';
import BiblePassage from './BiblePassage';
import SwipeContainer from './SwipeContainer';
import {DateUtils} from '../models/date-utils';
import {
    BY_PSG_TXT,
    BY_REF,
    EDIT_MEM_PASSAGE,
    getBookName,
    getPassageReference,
    getUnformattedPassageTextNoVerseNumbers,
    OPEN_IN_BIBLEHUB,
    OPEN_INTERLINEAR,
    openBibleHubLink,
    openInterlinearLink,
    sortAccordingToPracticeConfig,
} from '../models/passage-utils';
import {useAppSelector} from '../store/hooks';
import EditPassage from './EditPassage.tsx';
import copy from 'clipboard-copy';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBookOpen, faCommentDots, faSearch} from '@fortawesome/free-solid-svg-icons';

const Practice = () => {
    const {mode, order} = useParams();
    const navigate = useNavigate();
    const [memPsgList, setMemPsgList] = useState<Passage[]>([]);
    const [currentPassage, setCurrentPassage] = useState<Passage | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [translation, setTranslation] = useState('niv');
    const [isInitializing, setIsInitializing] = useState(true);
    const [initSeconds, setInitSeconds] = useState(0);
    const [showPassageRef, setShowPassageRef] = useState(mode !== BY_PSG_TXT);
    const [showVerseNumbers, setShowVerseNumbers] = useState(mode !== BY_PSG_TXT);
    const [showVerseText, setShowVerseText] = useState(mode === BY_PSG_TXT);
    const [currentMode, setCurrentMode] = useState(mode);
    const [showInfo, setShowInfo] = useState(false);
    const [overrides, setOverrides] = useState<Passage[]>([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingFrequencyChange, setPendingFrequencyChange] = useState<{
        direction: string;
        newFrequency: number;
    } | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showGoToModal, setShowGoToModal] = useState(false);
    const [showExplanationModal, setShowExplanationModal] = useState(false);
    const [showExplanationEditor, setShowExplanationEditor] = useState(false);
    const [explanationText, setExplanationText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdatingExplanation, setIsUpdatingExplanation] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);

    const user = useAppSelector(state => state.user.currentUser);
    const isGuestUser = user === GUEST_USER;

    // Focus search input when modal opens
    useEffect(() => {
        if (showGoToModal && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showGoToModal]);

    // Initialize explanation text when editor opens
    useEffect(() => {
        if (showExplanationEditor && currentPassage) {
            setExplanationText(currentPassage.explanation || '');
        }
    }, [showExplanationEditor, currentPassage]);

    useEffect(() => {
        const fetchMemoryPassages = async () => {
            try {
                setIsInitializing(true);
                const initInterval = setInterval(() => {
                    setInitSeconds((s) => s + 1);
                }, 1000);

                // Fetch both memory passages and overrides in parallel
                const [passages, textOverrides] = await Promise.all([
                    bibleService.getMemoryPassageList(user),
                    bibleService.getMemoryPassageTextOverrides(user),
                ]);

                // Set overrides first to ensure they're available
                setOverrides(textOverrides);

                // Sort the passages according to the practice configuration
                const sortedPassages = sortAccordingToPracticeConfig(
                    order || 'rand',
                    passages
                );
                setMemPsgList(sortedPassages);

                if (sortedPassages.length > 0) {
                    const firstPassage = sortedPassages[0];
                    setTranslation(firstPassage.translationName);

                    // Check for override and apply if exists
                    const override = textOverrides.find(
                        (o) => o.passageId === firstPassage.passageId
                    );
                    if (override) {
                        setCurrentPassage({
                            ...firstPassage,
                            verses: override.verses,
                            passageRefAppendLetter: override.passageRefAppendLetter,
                        });
                    } else {
                        setCurrentPassage(firstPassage);
                    }

                    // Update last viewed for the first passage (except for guest users)
                    if (!isGuestUser) {
                        updateLastViewed(firstPassage.passageId);
                    }
                }

                clearInterval(initInterval);
                setIsInitializing(false);
                setInitSeconds(0);
            } catch (error) {
                console.error('Error fetching memory passages:', error);
                setIsInitializing(false);
                setInitSeconds(0);
            }
        };
        if (user) {
            fetchMemoryPassages();
        }
    }, [order, user, isGuestUser]);

    const updateLastViewed = (passageId: number) => {
        // Skip for guest users
        if (isGuestUser) return;

        const now = new Date();
        const lastViewedStr = DateUtils.formatDateTime(now, 'MM-dd-yy KK:mm:ss');
        const lastViewedNum = now.getTime();

        bibleService.updateLastViewed(user, passageId, lastViewedNum, lastViewedStr);
    };

    const handleEditingComplete = (
        updatedPassage: Passage | null,
        overrideText: string | null
    ) => {
        console.log(
            'Practice.handleEditingComplete - overrideText=' +
            overrideText +
            ' - updated passage:',
            updatedPassage
        );
        setShowEditModal(false);

        if (updatedPassage) {
            // Update the passage in memPsgList
            const updatedList = memPsgList.map((passage) =>
                passage.passageId === updatedPassage.passageId ? updatedPassage : passage
            );
            setMemPsgList(updatedList);

            // Update translation if it changed
            if (updatedPassage.translationName !== translation) {
                setTranslation(updatedPassage.translationName);
            }

            // Update overrides if needed
            if (overrideText !== null) {
                const newOverride = {
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

                // Update the current passage
                setCurrentPassage({...updatedPassage, verses: newOverride.verses});
            } else {
                setCurrentPassage(updatedPassage);
            }

            // Show success message
            setToastMessage('Passage updated successfully');
            setToastBg('#28a745');
            setShowToast(true);
        }
    };

    const resetToInitialMode = () => {
        if (mode === BY_PSG_TXT) {
            setShowPassageRef(false);
            setShowVerseNumbers(false);
            setShowVerseText(true);
        } else {
            setShowPassageRef(true);
            setShowVerseNumbers(true);
            setShowVerseText(false);
        }
        setCurrentMode(mode);
    };

    const handleToolbarClick = async (direction: string) => {
        if (memPsgList.length === 0) return;

        if (direction === 'UP' || direction === 'DOWN') {
            handleFrequencyChangeRequest(direction);
            return;
        }

        let newIndex = currentIndex;
        if (direction === 'RIGHT') {
            newIndex = currentIndex + 1 >= memPsgList.length ? 0 : currentIndex + 1;
        } else if (direction === 'LEFT') {
            newIndex =
                currentIndex - 1 < 0 ? memPsgList.length - 1 : currentIndex - 1;
        }

        setCurrentIndex(newIndex);
        const passage = memPsgList[newIndex];
        setTranslation(passage.translationName);

        // Check for override before setting the current passage
        const override = overrides.find((o) => o.passageId === passage.passageId);
        if (override) {
            setCurrentPassage({
                ...passage,
                verses: override.verses,
                passageRefAppendLetter: override.passageRefAppendLetter,
            });
        } else {
            setCurrentPassage(passage);
        }

        // Update last viewed for the new passage (except for guest users)
        if (!isGuestUser) {
            updateLastViewed(passage.passageId);
        }

        resetToInitialMode();
    };

    const handleFrequencyChangeRequest = (direction: string) => {
        if (!currentPassage || isGuestUser) return;

        let newFrequency = currentPassage.frequencyDays;

        if (direction === 'UP' && currentPassage.frequencyDays > 1) {
            newFrequency = currentPassage.frequencyDays - 1;
        } else if (direction === 'DOWN' && currentPassage.frequencyDays < 3) {
            newFrequency = currentPassage.frequencyDays + 1;
        } else {
            return; // No change needed
        }

        // Store the pending change and show confirmation modal
        setPendingFrequencyChange({direction, newFrequency});
        setShowConfirmModal(true);
    };

    const handleConfirmFrequencyChange = async () => {
        if (!pendingFrequencyChange || !currentPassage || isGuestUser) return;

        setShowConfirmModal(false);
        setIsUpdating(true);

        const {newFrequency} = pendingFrequencyChange;

        // Create a copy of the current passage with updated frequency
        const updatedPassage = {
            ...currentPassage,
            frequencyDays: newFrequency,
        };

        try {
            // Call the API to update the passage
            const result = await bibleService.updatePassage(user, updatedPassage);

            if (result === 'success') {
                // Update the current passage in state
                setCurrentPassage(updatedPassage);

                // Update the passage in the memPsgList
                const updatedList = memPsgList.map((passage) =>
                    passage.passageId === currentPassage.passageId
                        ? {...passage, frequencyDays: newFrequency}
                        : passage
                );

                setMemPsgList(updatedList);

                // Show success message
                setToastMessage(`Frequency updated to Box ${newFrequency}`);
                setToastBg('#28a745');
                setShowToast(true);
            } else {
                // Show error message
                setToastMessage('Failed to update frequency');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        } catch (error) {
            console.error('Error updating passage frequency:', error);
            setToastMessage('Error updating frequency');
            setToastBg('#dc3545');
            setShowToast(true);
        } finally {
            setIsUpdating(false);
            setPendingFrequencyChange(null);
        }
    };

    const handleCancelFrequencyChange = () => {
        setShowConfirmModal(false);
        setPendingFrequencyChange(null);
    };

    const handleTranslationChange = async (newTranslation: string) => {
        setTranslation(newTranslation);
        if (currentPassage) {
            // Only update the translation, let BiblePassage handle fetching new verses
            setCurrentPassage({
                ...currentPassage,
                translationName: newTranslation,
                verses: [], // Clear verses to force BiblePassage to fetch them if needed
            });
        }
    };

    const handleQuestionClick = () => {
        setShowPassageRef(true);
        setShowVerseNumbers(false);
        setShowVerseText(false);
        setCurrentMode(BY_REF);
    };

    const handleLightbulbClick = () => {
        setShowPassageRef(false);
        setShowVerseNumbers(true);
        setShowVerseText(true);
        setCurrentMode(BY_PSG_TXT);
    };

    const handleCopy = async () => {
        if (!currentPassage) return;

        // If verses aren't loaded, load them first
        if (!currentPassage.verses || currentPassage.verses.length === 0) {
            try {
                const passageWithVerses = await bibleService.getPassageText(
                    user,
                    translation,
                    currentPassage.bookName,
                    currentPassage.chapter,
                    currentPassage.startVerse,
                    currentPassage.endVerse
                );

                // Update the current passage with the loaded verses
                setCurrentPassage({
                    ...currentPassage,
                    verses: passageWithVerses.verses,
                });

                // Now copy the text with the newly loaded verses
                const passageRef = getPassageReference(currentPassage);
                const verseText = getUnformattedPassageTextNoVerseNumbers(
                    passageWithVerses
                );
                const textToCopy = `${passageRef}\n\n${verseText}`;

                try {
                    await copy(textToCopy);
                    setToastMessage('Passage copied to clipboard!');
                    setToastBg('#28a745');
                    setShowToast(true);
                } catch (err) {
                    console.error('Failed to copy text:', err);
                    setToastMessage('Failed to copy text');
                    setToastBg('#dc3545');
                    setShowToast(true);
                }
            } catch (error) {
                console.error('Error loading verses:', error);
                setToastMessage('Error loading verses');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        } else {
            // Verses are already loaded, just copy the text
            const passageRef = getPassageReference(currentPassage);
            const verseText = getUnformattedPassageTextNoVerseNumbers(currentPassage);
            const textToCopy = `${passageRef}\n\n${verseText}`;

            try {
                await copy(textToCopy);
                setToastMessage('Passage copied to clipboard!');
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

    const getModeDisplayText = (mode: string | undefined) => {
        switch (mode) {
            case BY_PSG_TXT:
                return 'By Passage Text';
            case BY_REF:
                return 'By Reference';
            default:
                return 'Unknown Mode';
        }
    };

    const getOrderDisplayText = (order: string | undefined) => {
        switch (order) {
            case 'rand':
                return 'Random';
            case 'by_freq':
                return 'By Frequency';
            case 'interleave':
                return 'Interleaved';
            case 'by_last_practiced_time':
                return 'By Last Practiced';
            default:
                return 'Unknown Order';
        }
    };

    const handleGoToPassage = (index: number) => {
        setCurrentIndex(index);
        setCurrentPassage(memPsgList[index]);
        setShowGoToModal(false);
        setSearchTerm(''); // Clear search term when modal is closed
        setTranslation(memPsgList[index].translationName);
    };

    const handleSaveExplanation = async () => {
        if (!currentPassage || !explanationText.trim()) return;

        setIsUpdatingExplanation(true);
        try {
            const updatedPassage = {
                ...currentPassage,
                explanation: explanationText.trim()
            };

            const result = await bibleService.updatePassage(user, updatedPassage);

            if (result === 'success') {
                // Update current passage
                setCurrentPassage(updatedPassage);

                // Update passage in lists
                const updatePassageInList = (list: Passage[]) =>
                    list.map(p => p.passageId === currentPassage.passageId ? updatedPassage : p);

                setMemPsgList(prev => updatePassageInList(prev));

                setToastMessage('Explanation saved successfully');
                setToastBg('#28a745');
                setShowToast(true);
                setShowExplanationEditor(false);
            } else {
                setToastMessage('Failed to save explanation');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        } catch (error) {
            console.error('Error saving explanation:', error);
            setToastMessage('Error saving explanation');
            setToastBg('#dc3545');
            setShowToast(true);
        } finally {
            setIsUpdatingExplanation(false);
        }
    };

    // Filter passages based on search term
    const filteredPassages = memPsgList.filter((passage) => {
        if (!searchTerm) return true;
        const reference = getPassageReference(passage, false).toLowerCase();
        return reference.includes(searchTerm.toLowerCase());
    });

    // Sort passages by book, chapter, and start verse
    const sortedPassages = [...filteredPassages].sort((a, b) => {
        if (a.bookId !== b.bookId) {
            return a.bookId - b.bookId;
        }
        if (a.chapter !== b.chapter) {
            return a.chapter - b.chapter;
        }
        return a.startVerse - b.startVerse;
    });

    if (isInitializing) {
        return (
            <Container className="p-4 text-white text-center">
                <Spinner animation="border" role="status" className="me-2"/>
                <span>Loading passages... ({initSeconds} seconds)</span>
            </Container>
        );
    }

    if (!currentPassage) {
        return (
            <Container className="p-4">
                <div className="text-white text-center">Loading passages...</div>
            </Container>
        );
    }

    // For guest users, disable up/down buttons regardless of frequency
    const upEnabled = !isGuestUser && currentPassage.frequencyDays > 1;
    const downEnabled = !isGuestUser && currentPassage.frequencyDays < 3;

    // Create additional menus for the toolbar
    const getAdditionalMenus = () => {
        return [
            {
                itemLabel: "Explanation...",
                icon: faCommentDots,
                callbackFunction: () => setShowExplanationEditor(true)
            },
            {
                itemLabel: "Go to Passage...",
                icon: faSearch,
                callbackFunction: () => setShowGoToModal(true),
            },
            {...OPEN_IN_BIBLEHUB, callbackFunction: () => openBibleHubLink(currentPassage)},
            {...OPEN_INTERLINEAR, callbackFunction: () => openInterlinearLink(currentPassage)},
            {...EDIT_MEM_PASSAGE, callbackFunction: () => setShowEditModal(true)},
            {
                itemLabel: "View In Context...",
                icon: faBookOpen,
                callbackFunction: () => {
                    const readChapRoute = `/readBibleChapter/${translation}/${getBookName(currentPassage.bookId)}/${currentPassage.chapter}/${currentPassage.startVerse}`;
                    console.log("Practice.additionalMenus - navigating to chapter:", readChapRoute);
                    navigate(readChapRoute);
                }
            }
        ];
    };

    return (
        <SwipeContainer
            onSwipeLeft={() => handleToolbarClick('RIGHT')}
            onSwipeRight={() => handleToolbarClick('LEFT')}
        >
            <Toolbar
                currentIndex={currentIndex}
                totalCount={memPsgList.length}
                clickFunction={handleToolbarClick}
                translation={translation}
                onTranslationChange={handleTranslationChange}
                currentPassage={currentPassage}
                getUnformattedText={getUnformattedPassageTextNoVerseNumbers}
                showQuestionIcon={currentMode === BY_PSG_TXT}
                showLightbulbIcon={currentMode === BY_REF}
                showUpIcon={true}
                showDownIcon={true}
                upEnabled={upEnabled}
                downEnabled={downEnabled}
                onQuestionClick={handleQuestionClick}
                onLightbulbClick={handleLightbulbClick}
                onCopy={handleCopy}
                additionalMenus={getAdditionalMenus()}
            />

            <div className="text-center mb-3">
                <Button
                    variant="link"
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-white-50 text-decoration-none"
                    aria-controls="info-collapse"
                    aria-expanded={showInfo}
                >
                    {showInfo
                        ? '▼ Hide Info'
                        : '▶ Info (Box: ' + currentPassage.frequencyDays + ')'}
                </Button>
                <Collapse in={showInfo}>
                    <div id="info-collapse">
                        <div className="text-white-50 mb-2">
                            Mode: {getModeDisplayText(mode)} | Order: {getOrderDisplayText(order)}
                        </div>
                        <div className="text-white-50">
                            Box: {currentPassage.frequencyDays} | Last Practiced:{' '}
                            {currentPassage.last_viewed_str} | Psg ID:{' '}
                            {currentPassage.passageId}
                            {currentPassage.explanation && (
                                <>
                                    {' | '}
                                    <Button
                                        variant="link"
                                        className="text-white-50 p-0"
                                        onClick={() => setShowExplanationModal(true)}
                                    >
                                        Explanation
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Collapse>
            </div>

            {isUpdating ? (
                <div className="text-center text-white mb-3">
                    <Spinner animation="border" size="sm" className="me-2"/>
                    <span>Updating frequency...</span>
                </div>
            ) : null}

            <BiblePassage
                passage={currentPassage}
                translation={translation}
                showPassageRef={showPassageRef}
                showVerseNumbers={showVerseNumbers}
                showVerseText={showVerseText}
            />

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

            {/* Confirmation Modal */}
            <Modal show={showConfirmModal} onHide={handleCancelFrequencyChange} centered>
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Confirm Frequency Change</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {pendingFrequencyChange && (
                        <p>Change frequency to Box {pendingFrequencyChange.newFrequency}?</p>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={handleCancelFrequencyChange}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirmFrequencyChange}>
                        Confirm
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Passage Modal */}
            {currentPassage && (
                <EditPassage
                    props={{
                        passage: currentPassage,
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

            {/* Go to Passage Modal */}
            <Modal
                show={showGoToModal}
                onHide={() => {
                    setShowGoToModal(false);
                    setSearchTerm(''); // Clear search term when modal is closed
                }}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Go to Passage</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <InputGroup className="mb-3">
                        <InputGroup.Text className="bg-dark text-white border-secondary">
                            <FontAwesomeIcon icon={faSearch}/>
                        </InputGroup.Text>
                        <Form.Control
                            ref={searchInputRef}
                            placeholder="Search passages..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-dark text-white border-secondary"
                        />
                        {searchTerm && (
                            <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                                Clear
                            </Button>
                        )}
                    </InputGroup>

                    <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
                        {sortedPassages.map((passage) => (
                            <div key={passage.passageId} className="mb-2">
                                <Button
                                    variant="link"
                                    className="text-white text-decoration-none text-start w-100"
                                    onClick={() =>
                                        handleGoToPassage(
                                            memPsgList.findIndex((p) => p.passageId === passage.passageId)
                                        )
                                    }
                                >
                                    {getPassageReference(passage, false)}
                                </Button>
                            </div>
                        ))}
                    </div>

                    {sortedPassages.length === 0 && (
                        <p className="text-center text-muted">
                            No passages match your search.
                        </p>
                    )}
                </Modal.Body>
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
                        {currentPassage?.explanation ? 'Update Explanation' : 'Add Explanation'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <div className="mb-3">
                        <h5>{getPassageReference(currentPassage)}</h5>
                        <p className="text-white-50" style={{whiteSpace: 'pre-line'}}>
                            {getUnformattedPassageTextNoVerseNumbers(currentPassage)}
                        </p>
                    </div>
                    <Form.Group>
                        <Form.Label>Explanation</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={6}
                            value={explanationText}
                            onChange={(e) => setExplanationText(e.target.value)}
                            className="bg-dark text-white"
                            placeholder="Enter explanation..."
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
                        ) : currentPassage?.explanation ? (
                            'Update Explanation'
                        ) : (
                            'Add Explanation'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* View Explanation Modal */}
            <Modal
                show={showExplanationModal}
                onHide={() => setShowExplanationModal(false)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Passage Explanation</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <p style={{whiteSpace: 'pre-line'}}>{currentPassage?.explanation}</p>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="primary" onClick={() => setShowExplanationModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </SwipeContainer>
    );
};

export default Practice;