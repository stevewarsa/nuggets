import {Container, Toast} from 'react-bootstrap';
import {useParams, useNavigate} from 'react-router-dom';
import {useEffect, useState} from 'react';
import BiblePassage from './BiblePassage';
import Toolbar from './Toolbar';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {booksByNum, USER, GUEST_USER} from '../models/constants';
import {
    getUnformattedPassageTextNoVerseNumbers,
    getNextBook,
    openBibleHubLink,
    COPY_VERSE_RANGE,
    OPEN_IN_BIBLEHUB,
    ADD_TO_MEMORY_VERSES,
    OPEN_INTERLINEAR,
    openInterlinearLink,
    handleCopyVerseRange,
    ADD_TO_NUGGETS
} from '../models/passage-utils';
import SwipeContainer from './SwipeContainer';
import {useAppSelector} from '../store/hooks';
import {useBiblePassages} from '../hooks/useBiblePassages';
import {faHighlighter, faEraser} from '@fortawesome/free-solid-svg-icons';

const ReadBibleChapter = () => {
    const {translation, book, chapter, scrollToVerse} = useParams();
    const navigate = useNavigate();
    const [passage, setPassage] = useState<Passage | null>(null);
    const [currentTranslation, setCurrentTranslation] = useState(translation || 'niv');
    const [maxChapters, setMaxChapters] = useState<{ [key: string]: number }>({});
    const [showVerseModal, setShowVerseModal] = useState(false);
    const [addToMemoryMode, setAddToMemoryMode] = useState(false);
    const [addToNuggetsMode, setAddToNuggetsMode] = useState(false);
    const [copyMode, setCopyMode] = useState(false);
    const [bibleHubMode, setBibleHubMode] = useState(false);
    const [interLinearMode, setInterLinearMode] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');
    const [highlightedVerses, setHighlightedVerses] = useState<number[]>([]);
    const [isHighlightMode, setIsHighlightMode] = useState(false);

    const currentUser = useAppSelector(state => state.user.currentUser);
    const user = currentUser || USER;
    const isGuestUser = currentUser === GUEST_USER;

    // Use the useBiblePassages hook to get access to nuggets
    const {state: {allPassages}} = useBiblePassages();

    useEffect(() => {
        console.log("ReadBibleChapter.useEffect[] - scrollToVerse=" + scrollToVerse);
        const fetchMaxChapters = async () => {
            try {
                const chapters = await bibleService.getMaxChaptersByBook();
                const maxChaptersMap = chapters.reduce((acc, {bookName, maxChapter}) => {
                    acc[bookName] = maxChapter;
                    return acc;
                }, {} as { [key: string]: number });
                setMaxChapters(maxChaptersMap);
            } catch (error) {
                console.error('Error fetching max chapters:', error);
            }
        };
        fetchMaxChapters();
    }, []);

    useEffect(() => {
        const fetchMaxVerse = async () => {
            if (!translation || !book || !chapter) return;

            try {
                const response = await bibleService.getMaxVersesByBookChapter(translation);
                const bookData = response[book];
                if (bookData) {
                    const chapterData = bookData.find(([chapterNum]) => chapterNum === parseInt(chapter));
                    if (chapterData) {
                        const bookId = Object.entries(booksByNum).find(([_, name]) => name === book)?.[0];

                        if (!bookId) {
                            console.error('Could not find bookId for book:', book);
                            return;
                        }

                        const newPassage: Passage = {
                            passageId: 0,
                            bookId: parseInt(bookId),
                            bookName: book,
                            translationId: translation,
                            translationName: '',
                            chapter: parseInt(chapter),
                            startVerse: 1,
                            endVerse: chapterData[1],
                            verseText: '',
                            frequencyDays: 0,
                            last_viewed_str: '',
                            last_viewed_num: 0,
                            passageRefAppendLetter: '',
                            verses: [],
                            topics: [],
                            explanation: ''
                        };
                        setPassage(newPassage);
                    }
                }
            } catch (error) {
                console.error('Error fetching max verse:', error);
            }
        };

        fetchMaxVerse();
    }, [translation, book, chapter]);

    // Effect to highlight nugget verses when highlight mode is enabled
    useEffect(() => {
        if (isHighlightMode && passage) {
            // Find all nuggets that match current book and chapter
            const matchingNuggets = allPassages.filter(
                nugget => nugget.bookId === passage.bookId && nugget.chapter === passage.chapter
            );

            // Get all verses that are part of nuggets
            const versesToHighlight = new Set<number>();
            matchingNuggets.forEach(nugget => {
                for (let verse = nugget.startVerse; verse <= nugget.endVerse; verse++) {
                    versesToHighlight.add(verse);
                }
            });

            setHighlightedVerses(Array.from(versesToHighlight));
        } else {
            setHighlightedVerses([]);
        }
    }, [isHighlightMode, passage, allPassages]);

    const handleToolbarClick = (direction: string) => {
        if (!book || !chapter || !maxChapters[book]) return;

        const currentChapter = parseInt(chapter);
        const maxChapter = maxChapters[book];

        if (direction === 'RIGHT') {
            if (currentChapter < maxChapter) {
                // Move to next chapter in current book
                navigate(`/readBibleChapter/${currentTranslation}/${book}/${currentChapter + 1}`);
            } else {
                // Move to first chapter of next book
                const nextBook = getNextBook(book, 'next');
                if (nextBook) {
                    navigate(`/readBibleChapter/${currentTranslation}/${nextBook}/1`);
                }
            }
        } else if (direction === 'LEFT') {
            if (currentChapter > 1) {
                // Move to previous chapter in current book
                navigate(`/readBibleChapter/${currentTranslation}/${book}/${currentChapter - 1}`);
            } else {
                // Move to last chapter of previous book
                const previousBook = getNextBook(book, 'previous');
                if (previousBook && maxChapters[previousBook]) {
                    navigate(`/readBibleChapter/${currentTranslation}/${previousBook}/${maxChapters[previousBook]}`);
                }
            }
        }
    };

    const handleTranslationChange = (newTranslation: string) => {
        setCurrentTranslation(newTranslation);
        if (passage) {
            setPassage({...passage, verses: [], translationId: newTranslation});
        }
    };

    const handleVerseSelection = async (startVerse: number, endVerse: number) => {
        if (!passage || !book) return;

        if (copyMode) {
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
            setCopyMode(false);
        } else if (bibleHubMode) {
            const bibleHubPassage = {
                ...passage,
                startVerse,
                endVerse
            };
            openBibleHubLink(bibleHubPassage);
            setBibleHubMode(false);
        } else if (interLinearMode) {
            const interlinearPassage = {
                ...passage,
                startVerse,
                endVerse
            };
            openInterlinearLink(interlinearPassage);
            setInterLinearMode(false);
        } else if (addToMemoryMode) {
            setAddToMemoryMode(false);
            // Don't allow guest users to add memory passages
            if (isGuestUser) {
                setToastMessage('Guest users cannot add memory passages');
                setToastBg('#dc3545');
                setShowToast(true);
                return;
            }

            try {
                const passageId = await bibleService.addMemoryPassage(
                    user,
                    currentTranslation,
                    book,
                    passage.chapter,
                    startVerse,
                    endVerse
                );

                console.log('Added memory passage with ID:', passageId);

                if (passageId > 0) {
                    navigate('/practiceSetup');
                }
            } catch (error) {
                console.error('Error adding memory passage:', error);
            }
        } else if (addToNuggetsMode) {
            setAddToNuggetsMode(false);
            // Don't allow guest users to add nuggets
            if (isGuestUser) {
                setToastMessage('Guest users cannot add nuggets');
                setToastBg('#dc3545');
                setShowToast(true);
                return;
            }

            try {
                const passageId = await bibleService.addNonMemoryPassage(
                    user,
                    currentTranslation,
                    book,
                    passage.chapter,
                    startVerse,
                    endVerse
                );

                console.log('Added non-memory passage with ID:', passageId);

                if (passageId > 0) {
                    navigate('/browseBible');
                }
            } catch (error) {
                console.error('Error adding non-memory passage:', error);
            }
        }
    };

    // Create additional menus based on user status
    const getAdditionalMenus = () => {
        const menus = [
            {
                ...COPY_VERSE_RANGE, callbackFunction: () => {
                    setCopyMode(true);
                    setShowVerseModal(true);
                }
            },
            {
                ...OPEN_IN_BIBLEHUB, callbackFunction: () => {
                    setCopyMode(false);
                    setBibleHubMode(true);
                    setShowVerseModal(true);
                }
            },
            {
                ...OPEN_INTERLINEAR, callbackFunction: () => {
                    setCopyMode(false);
                    setInterLinearMode(true);
                    setShowVerseModal(true);
                }
            },
        ];

        // Only add "Add to Memory Verses" and "Add to Nuggets" for non-guest users
        if (!isGuestUser) {
            menus.push(
                {
                    ...ADD_TO_MEMORY_VERSES,
                    callbackFunction: () => {
                        setAddToMemoryMode(true);
                        setCopyMode(false);
                        setShowVerseModal(true);
                    }
                },
                {
                    ...ADD_TO_NUGGETS,
                    callbackFunction: () => {
                        setAddToNuggetsMode(true);
                        setCopyMode(false);
                        setShowVerseModal(true);
                    }
                }
            );
        }

        // Add highlight nuggets menu
        if (!isHighlightMode) {
            menus.push({
                itemLabel: 'Highlight Nuggets',
                icon: faHighlighter,
                callbackFunction: () => setIsHighlightMode(true)
            });
        } else {
            menus.push({
                itemLabel: 'Clear Highlight',
                icon: faEraser,
                callbackFunction: () => setIsHighlightMode(false)
            });
        }

        return menus;
    };

    if (!passage || !translation || !book || !chapter || !maxChapters[book]) {
        return (
            <Container>
                <div className="text-white text-center">Loading chapter information...</div>
            </Container>
        );
    }

    return (
        <SwipeContainer
            onSwipeLeft={() => handleToolbarClick('RIGHT')}
            onSwipeRight={() => handleToolbarClick('LEFT')}
        >
            <Toolbar
                currentIndex={parseInt(chapter) - 1}
                totalCount={maxChapters[book]}
                clickFunction={handleToolbarClick}
                translation={currentTranslation}
                onTranslationChange={handleTranslationChange}
                currentPassage={passage}
                getUnformattedText={getUnformattedPassageTextNoVerseNumbers}
                additionalMenus={getAdditionalMenus()}
            />
            <BiblePassage
                passage={passage}
                translation={currentTranslation}
                onVerseSelection={handleVerseSelection}
                showVerseModal={showVerseModal}
                scrollToVerse={scrollToVerse ? parseInt(scrollToVerse) : -1}
                highlightedVerses={highlightedVerses}
                onVerseModalClose={() => {
                    setAddToMemoryMode(false);
                    setAddToNuggetsMode(false);
                    setCopyMode(false);
                    setBibleHubMode(false);
                    setInterLinearMode(false);
                    setShowVerseModal(false);
                }}
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
        </SwipeContainer>
    );
};

export default ReadBibleChapter;