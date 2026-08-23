import {
    Button,
    Collapse,
    Container,
    Form,
    InputGroup,
    Modal,
    Spinner,
    Toast,
} from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Passage } from '../models/passage';
import { offlineCache } from '../services/offline-cache';
import { GUEST_USER } from '../models/constants';
import Toolbar from './Toolbar';
import BiblePassage from './BiblePassage';
import SwipeContainer from './SwipeContainer';
import { DateUtils } from '../models/date-utils';
import {
    BY_PSG_TXT,
    BY_REF,
    getPassageReference,
    getUnformattedPassageTextNoVerseNumbers,
    sortAccordingToPracticeConfig,
} from '../models/passage-utils';
import { useAppSelector } from '../store/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';

const PracticeOffline = () => {
    const { mode, order } = useParams();
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
    const [queuedCount, setQueuedCount] = useState(0);
    const { showToast, toastProps, toastMessage } = useToast();
    const [showGoToModal, setShowGoToModal] = useState(false);
    const [showExplanationModal, setShowExplanationModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const searchInputRef = useRef<HTMLInputElement>(null);

    const user = useAppSelector((state) => state.user.currentUser);
    const isGuestUser = user === GUEST_USER;

    useEffect(() => {
        if (showGoToModal && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showGoToModal]);

    useEffect(() => {
        const loadOfflinePassages = async () => {
            try {
                setIsInitializing(true);
                const initInterval = setInterval(() => {
                    setInitSeconds((s) => s + 1);
                }, 1000);

                const [cachedPassages, cachedOverrides, queued] = await Promise.all([
                    offlineCache.getPassages(),
                    offlineCache.getOverrides(),
                    offlineCache.getQueuedCount(),
                ]);

                setOverrides(cachedOverrides);
                setQueuedCount(queued);

                const sortedPassages = sortAccordingToPracticeConfig(
                    order || 'rand',
                    cachedPassages
                );
                setMemPsgList(sortedPassages);

                if (sortedPassages.length > 0) {
                    const firstPassage = sortedPassages[0];
                    setTranslation(firstPassage.translationName);

                    const override = cachedOverrides.find(
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

                    if (!isGuestUser) {
                        updateLastViewed(firstPassage.passageId);
                    }
                }

                clearInterval(initInterval);
                setIsInitializing(false);
                setInitSeconds(0);
            } catch (error) {
                console.error('Error loading offline passages:', error);
                setIsInitializing(false);
                setInitSeconds(0);
            }
        };
        loadOfflinePassages();
    }, [order, isGuestUser]);

    const updateLastViewed = (passageId: number) => {
        if (isGuestUser) return;

        const now = new Date();
        const lastViewedStr = DateUtils.formatDateTime(now, 'MM-dd-yy KK:mm:ss');
        const lastViewedNum = now.getTime();

        offlineCache.queueLastViewed(passageId, lastViewedNum, lastViewedStr);
        setQueuedCount((prev) => prev + 1);
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

    const handleToolbarClick = (direction: string) => {
        if (memPsgList.length === 0) return;

        if (direction === 'UP' || direction === 'DOWN') {
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

        if (!isGuestUser) {
            updateLastViewed(passage.passageId);
        }

        resetToInitialMode();
    };

    const handleTranslationChange = (_newTranslation: string) => {
        showToast({
            message: 'Translation switching is not available in offline mode',
            variant: 'warning',
        });
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

        if (!currentPassage.verses || currentPassage.verses.length === 0) {
            showToast({ message: 'Verse text not available for this passage', variant: 'warning' });
            return;
        }

        const passageRef = getPassageReference(currentPassage);
        const verseText = getUnformattedPassageTextNoVerseNumbers(currentPassage);
        const textToCopy = `${passageRef}\n\n${verseText}`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast({ message: 'Passage copied to clipboard!', variant: 'success' });
        } catch (e) {
            console.error('Failed to copy text:', e);
            showToast({
                message: `Error occurred copying text: ${
                    e?.message || e?.toString() || 'Unknown error'
                }`,
                variant: 'error',
            });
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
        const passage = memPsgList[index];
        setCurrentIndex(index);
        setTranslation(passage.translationName);

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

        if (!isGuestUser) {
            updateLastViewed(passage.passageId);
        }

        setShowGoToModal(false);
        setSearchTerm('');
        resetToInitialMode();
    };

    const handleSyncLastViewed = async () => {
        if (isGuestUser) return;
        try {
            const result = await offlineCache.syncLastViewedQueue(user);
            setQueuedCount(result.failed);
            showToast({
                message: `Synced ${result.synced} last-viewed update(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
                variant: result.failed > 0 ? 'warning' : 'success',
            });
        } catch (error) {
            console.error('Error syncing last-viewed:', error);
            showToast({ message: 'Error syncing last-viewed updates', variant: 'error' });
        }
    };

    const filteredPassages = memPsgList.filter((passage) => {
        if (!searchTerm) return true;
        const reference = getPassageReference(passage, false).toLowerCase();
        return reference.includes(searchTerm.toLowerCase());
    });

    const sortedPassages = [...filteredPassages].sort((a, b) => {
        if (a.bookId !== b.bookId) return a.bookId - b.bookId;
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.startVerse - b.startVerse;
    });

    const getAdditionalMenus = () => {
        const menus: { itemLabel: string; icon: any; callbackFunction: () => void }[] = [
            {
                itemLabel: 'Go to Passage...',
                icon: faSearch,
                callbackFunction: () => setShowGoToModal(true),
            },
        ];

        if (!isGuestUser && queuedCount > 0) {
            menus.push({
                itemLabel: `Sync Last-Viewed (${queuedCount})...`,
                icon: faSearch,
                callbackFunction: handleSyncLastViewed,
            });
        }

        return menus;
    };

    if (isInitializing) {
        return (
            <Container className="p-4 text-white text-center">
                <Spinner animation="border" role="status" className="me-2" />
                <span>Loading offline passages... ({initSeconds} seconds)</span>
            </Container>
        );
    }

    if (!currentPassage) {
        return (
            <Container className="p-4">
                <div className="text-white text-center">
                    No offline cache found. Please download passages first from the Practice Setup screen.
                </div>
            </Container>
        );
    }

    return (
        <SwipeContainer
            onSwipeLeft={() => handleToolbarClick('RIGHT')}
            onSwipeRight={() => handleToolbarClick('LEFT')}
        >
            <div className="text-center mb-1">
                <span className="badge bg-secondary">Offline Mode</span>
            </div>

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
                showUpIcon={false}
                showDownIcon={false}
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
                            Mode: {getModeDisplayText(mode)} | Order:{' '}
                            {getOrderDisplayText(order)}
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
                            {queuedCount > 0 && !isGuestUser && (
                                <span className="ms-2">
                  {' | '}
                                    <Button
                                        variant="link"
                                        className="text-warning p-0"
                                        onClick={handleSyncLastViewed}
                                    >
                    Sync ({queuedCount})
                  </Button>
                </span>
                            )}
                        </div>
                    </div>
                </Collapse>
            </div>

            <BiblePassage
                passage={currentPassage}
                translation={translation}
                showPassageRef={showPassageRef}
                showVerseNumbers={showVerseNumbers}
                showVerseText={showVerseText}
            />

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>

            <Modal
                show={showGoToModal}
                onHide={() => {
                    setShowGoToModal(false);
                    setSearchTerm('');
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
                            <FontAwesomeIcon icon={faSearch} />
                        </InputGroup.Text>
                        <Form.Control
                            ref={searchInputRef}
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
                                Clear
                            </Button>
                        )}
                    </InputGroup>

                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {sortedPassages.map((passage) => (
                            <div key={passage.passageId} className="mb-2">
                                <Button
                                    variant="link"
                                    className="text-white text-decoration-none text-start w-100"
                                    onClick={() =>
                                        handleGoToPassage(
                                            memPsgList.findIndex(
                                                (p) => p.passageId === passage.passageId
                                            )
                                        )
                                    }
                                >
                                    {getPassageReference(
                                        (() => {
                                            const override = overrides.find(
                                                (o) => o.passageId === passage.passageId
                                            );
                                            return override
                                                ? { ...passage, passageRefAppendLetter: override.passageRefAppendLetter }
                                                : passage;
                                        })(),
                                        false
                                    )}
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
                    <p style={{ whiteSpace: 'pre-line' }}>
                        {currentPassage?.explanation}
                    </p>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="primary"
                        onClick={() => setShowExplanationModal(false)}
                    >
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </SwipeContainer>
    );
};

export default PracticeOffline;
