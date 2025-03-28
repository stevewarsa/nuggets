import {Container, Spinner, Button, Collapse, Toast, Modal} from 'react-bootstrap';
import {useParams} from 'react-router-dom';
import {useState, useEffect} from 'react';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {USER, GUEST_USER} from '../models/constants';
import Toolbar from './Toolbar';
import BiblePassage from './BiblePassage';
import SwipeContainer from './SwipeContainer';
import {DateUtils} from '../models/date-utils';
import {
    getUnformattedPassageTextNoVerseNumbers,
    BY_PSG_TXT,
    BY_REF,
    sortAccordingToPracticeConfig,
    OPEN_IN_BIBLEHUB,
    openBibleHubLink,
    OPEN_INTERLINEAR,
    openInterlinearLink,
    EDIT_MEM_PASSAGE,
} from '../models/passage-utils';
import {useAppSelector} from '../store/hooks';
import EditPassage from "./EditPassage.tsx";

const Practice = () => {
    const {mode, order} = useParams();
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
        direction: string,
        newFrequency: number
    } | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const currentUser = useAppSelector(state => state.user.currentUser);
    const user = currentUser || USER;
    const isGuestUser = currentUser === GUEST_USER;

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

        fetchMemoryPassages();
    }, [order, user, isGuestUser]);

    const updateLastViewed = (passageId: number) => {
        // Skip for guest users
        if (isGuestUser) return;

        const now = new Date();
        const lastViewedStr = DateUtils.formatDateTime(now, "MM-dd-yy KK:mm:ss");
        const lastViewedNum = now.getTime();

        bibleService.updateLastViewed(user, passageId, lastViewedNum, lastViewedStr);
    };
    
    const handleEditingComplete = (updatedPassage: Passage | null, overrideText: string | null) => {
        console.log("Practice.handleEditingComplete - overrideText=" + overrideText + " - updated passage:", updatedPassage);
        setShowEditModal(false);

        if (updatedPassage) {
            // Update the passage in memPsgList
            const updatedList = memPsgList.map(passage =>
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
                    verses: [{
                        passageId: updatedPassage.passageId,
                        verseParts: [{
                            verseNumber: updatedPassage.startVerse,
                            versePartId: 1,
                            verseText: overrideText,
                            wordsOfChrist: false
                        }]
                    }]
                };

                const updatedOverrides = overrides.filter(o => o.passageId !== updatedPassage.passageId);
                updatedOverrides.push(newOverride);
                setOverrides(updatedOverrides);

                // Update the current passage
                setCurrentPassage({...updatedPassage, verses: newOverride.verses});
            } else {
                setCurrentPassage(updatedPassage)
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
            frequencyDays: newFrequency
        };

        try {
            // Call the API to update the passage
            const result = await bibleService.updatePassage(
                user,
                updatedPassage
            );

            if (result === "success") {
                // Update the current passage in state
                setCurrentPassage(updatedPassage);

                // Update the passage in the memPsgList
                const updatedList = memPsgList.map(passage =>
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
                additionalMenus={[
                    {...OPEN_IN_BIBLEHUB, callbackFunction: () => openBibleHubLink(currentPassage)},
                    {...OPEN_INTERLINEAR, callbackFunction: () => openInterlinearLink(currentPassage)},
                    {...EDIT_MEM_PASSAGE, callbackFunction: () => setShowEditModal(true)},
                ]}
            />

            <div className="text-center mb-3">
                <Button
                    variant="link"
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-white-50 text-decoration-none"
                    aria-controls="info-collapse"
                    aria-expanded={showInfo}
                >
                    {showInfo ? '▼ Hide Info' : '▶ Info (Box: ' + currentPassage.frequencyDays + ')'}
                </Button>
                <Collapse in={showInfo}>
                    <div id="info-collapse">
                        <div className="text-white-50 mb-2">
                            Mode: {getModeDisplayText(mode)} | Order:{' '}
                            {getOrderDisplayText(order)}
                        </div>
                        <div className="text-white-50">
                            Box: {currentPassage.frequencyDays} | Last Practiced:{' '}
                            {currentPassage.last_viewed_str} | Psg ID:{' '}
                            {currentPassage.passageId}
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
                        <p>
                            Change frequency to Box {pendingFrequencyChange.newFrequency}?
                        </p>
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
                    props={
                    {
                        passage: currentPassage,
                        overrides: overrides,
                        visible: showEditModal,
                        setVisibleFunction: (updatedPassage: Passage, newText: string, closedNoChange: boolean) =>
                            closedNoChange ?
                                setShowEditModal(false) :
                                handleEditingComplete(updatedPassage, newText)
                    }
                }
                />
            )}
        </SwipeContainer>
    );
};

export default Practice;