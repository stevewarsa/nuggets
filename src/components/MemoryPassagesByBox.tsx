import React, { useState, useEffect } from 'react';
import {
    Container,
    Spinner,
    Collapse,
    Button,
    Toast,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown,
    faChevronRight,
    faCopy,
} from '@fortawesome/free-solid-svg-icons';
import { useAppSelector } from '../store/hooks';
import { bibleService } from '../services/bible-service';
import { Passage } from '../models/passage';
import {
    getPassageReference,
    handleCopyPassage,
} from '../models/passage-utils';
import { useToast } from '../hooks/useToast';

interface BoxData {
    box: number;
    passages: Passage[];
    expanded: boolean;
}

const MemoryPassagesByBox: React.FC = () => {
    const [boxes, setBoxes] = useState<BoxData[]>([]);
    const [expandedPassages, setExpandedPassages] = useState<Set<number>>(
        new Set()
    );
    const [passageTexts, setPassageTexts] = useState<Map<number, string>>(
        new Map()
    );
    const [overrides, setOverrides] = useState<Passage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingPassageIds, setLoadingPassageIds] = useState<Set<number>>(
        new Set()
    );
    const { showToast, toastProps, toastMessage } = useToast();

    const user = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [memoryPassages, textOverrides] = await Promise.all([
                    bibleService.getMemoryPassageList(user),
                    bibleService.getMemoryPassageTextOverrides(user),
                ]);

                setOverrides(textOverrides);

                // Group passages by frequencyDays (box)
                const boxMap = new Map<number, Passage[]>();

                // Initialize boxes 1, 2, 3
                [1, 2, 3].forEach(box => {
                    boxMap.set(box, []);
                });

                // Group passages by box
                memoryPassages.forEach(passage => {
                    const box = passage.frequencyDays;
                    if (box >= 1 && box <= 3) {
                        boxMap.get(box)!.push(passage);
                    }
                });

                // Sort passages within each box by book ID, chapter, and verse
                const sortedBoxes: BoxData[] = Array.from(boxMap.entries()).map(([box, passages]) => ({
                    box,
                    passages: passages.sort((a, b) => {
                        if (a.bookId !== b.bookId) return a.bookId - b.bookId;
                        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                        return a.startVerse - b.startVerse;
                    }),
                    expanded: false,
                }));

                setBoxes(sortedBoxes);

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
                showToast({ message: 'Error loading memory passages', variant: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const toggleBox = (boxNumber: number) => {
        setBoxes(prev =>
            prev.map(box =>
                box.box === boxNumber
                    ? { ...box, expanded: !box.expanded }
                    : box
            )
        );
    };

    const togglePassage = async (passageId: number) => {
        const newExpandedPassages = new Set(expandedPassages);

        if (expandedPassages.has(passageId)) {
            newExpandedPassages.delete(passageId);
            setExpandedPassages(newExpandedPassages);
            return;
        }

        // If we don't have the text yet, fetch it
        if (!passageTexts.has(passageId)) {
            const passage = boxes
                .flatMap(box => box.passages)
                .find(p => p.passageId === passageId);

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
                showToast({ message: 'Error loading passage text', variant: 'error' });
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

    const getPassageReferenceWithOverride = (passage: Passage): string => {
        // Check if there's an override for this passage
        const override = overrides.find(o => o.passageId === passage.passageId);
        if (override && override.passageRefAppendLetter) {
            return getPassageReference({
                ...passage,
                passageRefAppendLetter: override.passageRefAppendLetter
            }, false); // false = use long book name
        }
        return getPassageReference(passage, false); // false = use long book name
    };

    const handleCopyPassageText = async (passage: Passage) => {
        const text = passageTexts.get(passage.passageId);
        if (text) {
            const success = await handleCopyPassage(passage, text);
            if (success) {
                showToast({ message: 'Passage copied to clipboard!', variant: 'success' });
            } else {
                showToast({ message: 'Failed to copy passage', variant: 'error' });
            }
        }
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
            <h1 className="text-white mb-4">Memory Passages by Box</h1>

            {boxes.map((boxData) => (
                <div key={boxData.box} className="mb-4">
                    <Button
                        variant="link"
                        className="text-white text-decoration-none p-0 mb-2"
                        onClick={() => toggleBox(boxData.box)}
                    >
                        <h2 className="d-flex align-items-center">
                            <FontAwesomeIcon
                                icon={boxData.expanded ? faChevronDown : faChevronRight}
                                className="me-2"
                            />
                            Box {boxData.box} ({boxData.passages.length} passages)
                        </h2>
                    </Button>

                    <Collapse in={boxData.expanded}>
                        <div className="ms-4">
                            {boxData.passages.length === 0 ? (
                                <p className="text-white-50">No passages in this box</p>
                            ) : (
                                <ol className="list-group list-group-numbered">
                                    {boxData.passages.map((passage) => (
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
                                                <span className="flex-grow-1">
                          {getPassageReferenceWithOverride(passage)}
                        </span>
                                                {loadingPassageIds.has(passage.passageId) && (
                                                    <Spinner animation="border" size="sm" className="ms-2" />
                                                )}
                                            </div>

                                            <Collapse in={expandedPassages.has(passage.passageId)}>
                                                <div className="mt-3">
                                                    <div className="mb-2">
                                                        <strong>{getPassageReferenceWithOverride(passage)}</strong>
                                                    </div>
                                                    <p className="mb-2 quote-text">
                                                        {passageTexts.get(passage.passageId)}
                                                    </p>
                                                    <Button
                                                        variant="outline-light"
                                                        size="sm"
                                                        onClick={() => handleCopyPassageText(passage)}
                                                        className="d-flex align-items-center"
                                                    >
                                                        <FontAwesomeIcon icon={faCopy} className="me-2" />
                                                        Copy
                                                    </Button>
                                                </div>
                                            </Collapse>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </Collapse>
                </div>
            ))}

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default MemoryPassagesByBox;