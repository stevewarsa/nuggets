import React, {useEffect, useState} from 'react';
import {Button, Container, Form, Modal, Spinner, Toast} from 'react-bootstrap';
import {Passage} from '../models/passage';
import {translationsShortNms} from '../models/constants';
import {bibleService} from '../services/bible-service';
import {getBookName, getDisplayBookName, handleCopyVerseRange} from '../models/passage-utils';
import {useAppSelector} from '../store/hooks';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowUp, faCopy} from '@fortawesome/free-solid-svg-icons';

interface BiblePassageProps {
    passage: Passage;
    translation: string;
    showPassageRef?: boolean;
    showVerseNumbers?: boolean;
    showVerseText?: boolean;
    showVerseModal?: boolean;
    scrollToVerse?: number;
    highlightedVerses?: number[];
    onVerseSelection?: (startVerse: number, endVerse: number) => void;
    onVerseModalClose?: () => void;
}

const BiblePassage: React.FC<BiblePassageProps> = ({
                                                       passage,
                                                       translation,
                                                       showPassageRef = true,
                                                       showVerseNumbers = true,
                                                       showVerseText = true,
                                                       showVerseModal = false,
                                                       scrollToVerse = -1,
                                                       highlightedVerses = [],
                                                       onVerseSelection,
                                                       onVerseModalClose,
                                                   }) => {
    const [localPassage, setLocalPassage] = useState<Passage>(passage);
    const [displayBookName, setDisplayBookName] = useState<string>('');
    const [displayChapter, setDisplayChapter] = useState<number>(-1);
    const [displayStartVerse, setDisplayStartVerse] = useState<number>(-1);
    const [displayEndVerse, setDisplayEndVerse] = useState<number>(-1);
    const [busy, setBusy] = useState<boolean>(false);
    const [seconds, setSeconds] = useState<number>(0);
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    const [showFloatingButtons, setShowFloatingButtons] = useState<boolean>(false);
    const [showToast, setShowToast] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastBg, setToastBg] = useState<string>('');
    const [internalVerseModal, setInternalVerseModal] = useState<boolean>(false);
    const [lastScrollPosition, setLastScrollPosition] = useState<number>(0);

    const user = useAppSelector(state => state.user.currentUser);

    useEffect(() => {
        const handleScroll = () => {
            setShowFloatingButtons(window.scrollY > 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        console.log('BiblePassage.tsx -showVerseText = ' + showVerseText + ', passage passed in changed:', passage);

        // Scroll to top when passage changes
        if (scrollToVerse === -1) {
            window.scrollTo(0, 0);
        }

        setDisplayBookName(getDisplayBookName(passage.bookId));
        setDisplayChapter(passage.chapter);
        setDisplayStartVerse(passage.startVerse);
        setDisplayEndVerse(passage.endVerse);

        // Only fetch verses if showVerseText is true
        if (showVerseText && (!passage.verses || passage.verses.length === 0)) {
            const fetchVerses = async () => {
                try {
                    setBusy(true);
                    setSeconds(0);
                    const intervalId = setInterval(() => {
                        setSeconds(s => s + 1);
                    }, 1000);

                    const fullPassage = await bibleService.getPassageText(
                        user,
                        translation,
                        getBookName(passage.bookId),
                        passage.chapter,
                        passage.startVerse,
                        passage.endVerse
                    );

                    clearInterval(intervalId);
                    setBusy(false);

                    // Update the local passage with the new verses
                    const updatedPassage = {
                        ...passage,
                        verses: fullPassage.verses,
                    };

                    setLocalPassage(updatedPassage);

                    // If the passage has verses, update it in the parent component
                    if (fullPassage.verses && fullPassage.verses.length > 0) {
                        // Update the passage in the parent's state to include verses
                        passage.verses = fullPassage.verses;
                    }
                } catch (error) {
                    console.error('Error fetching passage verses:', error);
                    setBusy(false);
                }
            };

            fetchVerses();
        } else {
            setLocalPassage(passage);
        }
    }, [passage, translation, showVerseText, user]);

    useEffect(() => {
        if (scrollToVerse !== -1 && localPassage?.verses?.length) {
            const element = document.getElementById("" + scrollToVerse);
            if (element) {
                const topPos = element.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                    top: topPos, // scroll so that the element is at the top of the view
                    behavior: 'smooth' // smooth scroll
                });
            }
        }
    }, [localPassage.verses]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const translationName = translationsShortNms.find(t => t.code === translation)?.translationName || '';

    const handleVerseSelect = (verseNumber: number) => {
        setSelectedVerses(prev => {
            if (prev.includes(verseNumber)) {
                return prev.filter(v => v !== verseNumber);
            }
            if (prev.length < 2) {
                return [...prev, verseNumber].sort((a, b) => a - b);
            }
            return [verseNumber];
        });
    };

    const handleSubmitVerseSelection = () => {
        if (selectedVerses.length === 0) {
            return;
        }
        const startVerse = selectedVerses[0];
        const endVerse = selectedVerses.length > 1 ? selectedVerses[1] : startVerse;
        if (internalVerseModal) {
            // this was triggered by clicking on the floating icon to copy verses
            const success = handleCopyVerseRange(startVerse, endVerse, passage);
            if (success) {
                setToastMessage('Passage copied to clipboard!');
                setToastBg('#28a745');
                setShowToast(true);
            } else {
                setToastMessage('Failed to copy text');
                setToastBg('#dc3545');
                setShowToast(true);
            }
            setInternalVerseModal(false);
            // Restore scroll position
            window.scrollTo({
                top: lastScrollPosition,
                behavior: 'smooth'
            });
        } else {
            if (onVerseSelection) {
                onVerseSelection(startVerse, endVerse);
            }
            onVerseModalClose?.();
        }
        setSelectedVerses([]);
    };

    const handleCloseModal = () => {
        setSelectedVerses([]);
        if (internalVerseModal) {
            setInternalVerseModal(false);
            // Restore scroll position
            window.scrollTo({
                top: lastScrollPosition,
                behavior: 'smooth'
            });
        } else {
            onVerseModalClose?.();
        }
    };

    const getVerseText = (verse: any) => {
        return verse.verseParts.map(part => part.verseText).join(' ');
    };

    const handleCopyClick = () => {
        // Store current scroll position
        setLastScrollPosition(window.scrollY);

        // If there's only one verse, copy it directly
        if (passage.startVerse === passage.endVerse) {
            const success = handleCopyVerseRange(passage.startVerse, passage.endVerse, passage);
            if (success) {
                setToastMessage('Passage copied to clipboard!');
                setToastBg('#28a745');
                setShowToast(true);
            } else {
                setToastMessage('Failed to copy text');
                setToastBg('#dc3545');
                setShowToast(true);
            }
        } else {
            setInternalVerseModal(true);
            // After modal is shown, scroll to match the current viewport position
            setTimeout(() => {
                const modalBody = document.querySelector('.modal-body');
                if (modalBody) {
                    const verses = document.querySelectorAll('.verse-number');
                    let targetVerse = null;

                    // Find the first verse that's currently visible in the viewport
                    verses.forEach(verse => {
                        const rect = verse.getBoundingClientRect();
                        if (rect.top >= 0 && rect.bottom <= window.innerHeight && !targetVerse) {
                            targetVerse = verse;
                        }
                    });

                    if (targetVerse) {
                        const verseId = targetVerse.id;
                        const modalVerse = modalBody.querySelector(`#verse-${verseId}`);
                        if (modalVerse) {
                            modalVerse.scrollIntoView({behavior: 'auto', block: 'center'});
                        }
                    }
                }
            }, 100);
        }
    };

    if (busy) {
        return (
            <Container className="text-white text-center">
                <Spinner animation="border" role="status" className="me-2"/>
                <span>Loading passage... ({seconds} seconds)</span>
            </Container>
        );
    }

    if (showVerseText && !localPassage.verses) {
        return <Container className="text-white text-center">Loading passage...</Container>;
    }

    const getPassageReference = () => {
        const baseRef = `${displayBookName} ${displayChapter}:${displayStartVerse}`;
        if (displayEndVerse !== displayStartVerse) {
            return `${baseRef}-${displayEndVerse}${localPassage.passageRefAppendLetter || ''}`;
        }
        return `${baseRef}${localPassage.passageRefAppendLetter || ''}`;
    };

    return (
        <>
            <Container className="text-center">
                {showPassageRef && (
                    <h2 className="passage-title mb-4 fw-bolder">
                        {getPassageReference()} (<span style={{color: '#B0E0E6'}}>{translationName}</span>)
                    </h2>
                )}
                {showVerseText && localPassage.verses && (
                    <p>
                        {localPassage.verses.map((verse) => (
                            <React.Fragment key={verse.verseParts[0].verseNumber}>
                                {showVerseNumbers && localPassage.verses.length > 1 && (
                                    <span id={"" + verse.verseParts[0].verseNumber} className="verse-number me-2">
                                        {verse.verseParts[0].verseNumber}
                                    </span>
                                )}
                                {verse.verseParts.map((part, index) => (
                                    <span
                                        key={`${verse.verseParts[0].verseNumber}-${index}`}
                                        className={`${
                                            part.wordsOfChrist ? 'words-of-christ' : 'verse-text'
                                        } fw-bold`}
                                        style={{
                                            backgroundColor: highlightedVerses.includes(verse.verseParts[0].verseNumber)
                                                ? '#ff8c00'
                                                : 'transparent'
                                        }}
                                    >
                                        {part.verseText}{' '}
                                    </span>
                                ))}
                            </React.Fragment>
                        ))}
                    </p>
                )}
            </Container>
            {showFloatingButtons && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        display: 'flex',
                        gap: '10px',
                        zIndex: 1000
                    }}
                >
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleCopyClick}
                        style={{borderRadius: '50%', width: '50px', height: '50px'}}
                    >
                        <FontAwesomeIcon icon={faCopy}/>
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={scrollToTop}
                        style={{borderRadius: '50%', width: '50px', height: '50px'}}
                    >
                        <FontAwesomeIcon icon={faArrowUp}/>
                    </Button>
                </div>
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
            <Modal show={showVerseModal || internalVerseModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Select Verses</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted mb-3">
                        Select one verse for a single verse, or two verses to define a range.
                    </p>
                    <div className="d-flex flex-column gap-2">
                        {localPassage.verses?.map((verse) => (
                            <Form.Check
                                key={verse.verseParts[0].verseNumber}
                                type="checkbox"
                                id={`verse-${verse.verseParts[0].verseNumber}`}
                                checked={selectedVerses.includes(verse.verseParts[0].verseNumber)}
                                onChange={() => handleVerseSelect(verse.verseParts[0].verseNumber)}
                                label={
                                    <div>
                                        <strong>{verse.verseParts[0].verseNumber}</strong>
                                        <span className="ms-2">{getVerseText(verse)}</span>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmitVerseSelection}
                        disabled={selectedVerses.length === 0}
                    >
                        Submit
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default BiblePassage;