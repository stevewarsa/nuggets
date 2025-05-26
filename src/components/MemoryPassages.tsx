import React, {useState, useEffect, useMemo} from 'react';
import {Container, Form, InputGroup, Spinner, Collapse, Button} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faChevronDown, faChevronRight, faSearch, faTimes} from '@fortawesome/free-solid-svg-icons';
import {useAppSelector} from '../store/hooks';
import {bibleService} from '../services/bible-service';
import {Passage} from '../models/passage';
import {getPassageReference} from '../models/passage-utils';

const MemoryPassages: React.FC = () => {
    const [passages, setPassages] = useState<Passage[]>([]);
    const [expandedPassages, setExpandedPassages] = useState<Set<number>>(new Set());
    const [passageTexts, setPassageTexts] = useState<Map<number, string>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingPassageIds, setLoadingPassageIds] = useState<Set<number>>(new Set());

    const user = useAppSelector(state => state.user.currentUser);

    useEffect(() => {
        const fetchPassages = async () => {
            try {
                setIsLoading(true);
                const [memoryPassages, overrides] = await Promise.all([
                    bibleService.getMemoryPassageList(user),
                    bibleService.getMemoryPassageTextOverrides(user)
                ]);

                // Sort passages by book ID, chapter, and verse
                const sortedPassages = [...memoryPassages].sort((a, b) => {
                    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
                    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                    return a.startVerse - b.startVerse;
                });

                setPassages(sortedPassages);

                // Initialize passage texts with overrides
                const initialTexts = new Map<number, string>();
                overrides.forEach(override => {
                    if (override.verses && override.verses.length > 0) {
                        const text = override.verses
                            .map(verse =>
                                verse.verseParts
                                    ?.map(part => part.verseText)
                                    .join(' ') ?? ''
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

    const filteredPassages = useMemo(() => {
        if (!searchTerm.trim()) return passages;

        return passages.filter(passage => {
            const reference = getPassageReference(passage, false).toLowerCase();
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
            const passage = passages.find(p => p.passageId === passageId);
            if (!passage) return;

            setLoadingPassageIds(prev => new Set(prev).add(passageId));

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
                const text = passageWithText?.verses
                    ?.map(verse =>
                        verse?.verseParts
                            ?.map(part => part?.verseText ?? '')
                            .join(' ') ?? ''
                    )
                    .join(' ') ?? '';

                setPassageTexts(prev => new Map(prev).set(passageId, text));
            } catch (error) {
                console.error('Error fetching passage text:', error);
            } finally {
                setLoadingPassageIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(passageId);
                    return newSet;
                });
            }
        }

        newExpandedPassages.add(passageId);
        setExpandedPassages(newExpandedPassages);
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status"/>
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
                        <FontAwesomeIcon icon={faSearch}/>
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
                            <FontAwesomeIcon icon={faTimes}/>
                        </Button>
                    )}
                </InputGroup>
            </Form>

            <ol className="list-group">
                {filteredPassages.map((passage) => (
                    <li key={passage.passageId} className="list-group-item bg-dark text-white border-secondary mb-2">
                        <div className="d-flex align-items-center">
                            <Button
                                variant="link"
                                className="text-white p-0 me-2"
                                onClick={() => togglePassage(passage.passageId)}
                            >
                                <FontAwesomeIcon
                                    icon={expandedPassages.has(passage.passageId) ? faChevronDown : faChevronRight}
                                />
                            </Button>
                            <span>{getPassageReference(passage, false)}</span>
                            {loadingPassageIds.has(passage.passageId) && (
                                <Spinner
                                    animation="border"
                                    size="sm"
                                    className="ms-2"
                                />
                            )}
                        </div>
                        <Collapse in={expandedPassages.has(passage.passageId)}>
                            <div className="mt-3">
                                <p className="mb-0 quote-text">
                                    {passageTexts.get(passage.passageId)}
                                </p>
                            </div>
                        </Collapse>
                    </li>
                ))}
            </ol>

            {filteredPassages.length === 0 && (
                <p className="text-center text-white">
                    {searchTerm ? 'No passages match your search.' : 'No memory passages found.'}
                </p>
            )}
        </Container>
    );
};

export default MemoryPassages;