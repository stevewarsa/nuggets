// MEMORY PASSAGES flow — import memory passages from another user's list into your own.
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Container,
    Form,
    InputGroup,
    Spinner,
    Button,
    Badge,
    Toast,
} from 'react-bootstrap';
import {
    faSearch,
    faCheckSquare,
    faSquare,
    faFileImport,
    faTimes,
    faChevronDown,
    faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAppSelector } from '../store/hooks';
import { bibleService } from '../services/bible-service';
import { Passage } from '../models/passage';
import { getPassageReference, getBookName } from '../models/passage-utils';
import { TRANSLATION } from '../models/constants';
import { useToast } from '../hooks/useToast';

interface AppUser {
    userName: string;
    fileName: string;
    numLastMod: number;
    lastModified: string;
}

interface OverrideEntry {
    passageId: number;
    passageRefAppendLetter: string;
    verseNum: number;
    overrideText: string;
    wordsOfChrist: boolean;
}

const ImportMemoryPassages: React.FC = () => {
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [sourcePassages, setSourcePassages] = useState<Passage[]>([]);
    const [overrides, setOverrides] = useState<Map<number, OverrideEntry[]>>(new Map());
    const [selectedPassageIds, setSelectedPassageIds] = useState<Set<number>>(new Set());
    const [expandedPassageIds, setExpandedPassageIds] = useState<Set<number>>(new Set());
    const [passageTextCache, setPassageTextCache] = useState<Map<number, Passage>>(new Map());
    const [loadingTextIds, setLoadingTextIds] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingPassages, setIsLoadingPassages] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fetchedUserRef = useRef<string | null>(null);
    const { showToast, toastProps, toastMessage } = useToast();

    const currentUser = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoadingUsers(true);
                const users = await bibleService.getAllUsers();
                const filtered = users.filter((u: AppUser) => u.userName !== currentUser);
                setAllUsers(filtered);
            } catch (error) {
                console.error('Error fetching users:', error);
                showToast({ message: 'Failed to load user list', variant: 'error' });
            } finally {
                setIsLoadingUsers(false);
            }
        };

        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUserSelect = async (userName: string) => {
        setSelectedUserId(userName);
        setSelectedPassageIds(new Set());
        setExpandedPassageIds(new Set());
        setSearchTerm('');
        setPassageTextCache(new Map());
        setOverrides(new Map());

        if (!userName) {
            setSourcePassages([]);
            return;
        }

        if (fetchedUserRef.current === userName) return;
        fetchedUserRef.current = userName;

        try {
            setIsLoadingPassages(true);
            const [passages, overridePassages] = await Promise.all([
                bibleService.getMemoryPassageList(userName),
                bibleService.getMemoryPassageTextOverrides(userName),
            ]);

            // Build override map: passageId -> array of override entries
            const overrideMap = new Map<number, OverrideEntry[]>();
            const letterMap = new Map<number, string>();
            for (const op of overridePassages) {
                if (op.passageRefAppendLetter) {
                    letterMap.set(op.passageId, op.passageRefAppendLetter);
                }
                if (op.verses && op.verses.length > 0 && op.verses[0].verseParts.length > 0) {
                    const vp = op.verses[0].verseParts[0];
                    const entry: OverrideEntry = {
                        passageId: op.passageId,
                        passageRefAppendLetter: op.passageRefAppendLetter,
                        verseNum: vp.verseNumber,
                        overrideText: vp.verseText,
                        wordsOfChrist: vp.wordsOfChrist,
                    };
                    const existing = overrideMap.get(op.passageId) || [];
                    existing.push(entry);
                    overrideMap.set(op.passageId, existing);
                }
            }

            // Apply append letters to the passages so getPassageReference picks them up
            const enriched = passages.map((p) => {
                const letter = letterMap.get(p.passageId);
                return letter ? { ...p, passageRefAppendLetter: letter } : p;
            });

            const sorted = [...enriched].sort((a, b) => {
                if (a.bookId !== b.bookId) return a.bookId - b.bookId;
                if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                return a.startVerse - b.startVerse;
            });

            setSourcePassages(sorted);
            setOverrides(overrideMap);
        } catch (error) {
            console.error('Error fetching source passages:', error);
            showToast({ message: 'Failed to load passages for selected user', variant: 'error' });
            setSourcePassages([]);
        } finally {
            setIsLoadingPassages(false);
        }
    };

    const filteredPassages = useMemo(() => {
        if (!searchTerm.trim()) return sourcePassages;
        return sourcePassages.filter((p) =>
            getPassageReference(p, false).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sourcePassages, searchTerm]);

    const togglePassage = (passageId: number) => {
        setSelectedPassageIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(passageId)) {
                newSet.delete(passageId);
            } else {
                newSet.add(passageId);
            }
            return newSet;
        });
    };

    const toggleExpand = useCallback(
        async (passage: Passage) => {
            const pid = passage.passageId;
            const newExpanded = new Set(expandedPassageIds);
            if (newExpanded.has(pid)) {
                newExpanded.delete(pid);
                setExpandedPassageIds(newExpanded);
                return;
            }
            newExpanded.add(pid);
            setExpandedPassageIds(newExpanded);

            // Lazy-load verse text if not already cached
            if (!passageTextCache.has(pid) && !loadingTextIds.has(pid)) {
                setLoadingTextIds((prev) => new Set(prev).add(pid));
                try {
                    const bookName = getBookName(passage.bookId);
                    const textPassage = await bibleService.getPassageText(
                        selectedUserId,
                        passage.translationName || TRANSLATION,
                        bookName,
                        passage.chapter,
                        passage.startVerse,
                        passage.endVerse
                    );

                    // Apply overrides on top of the fetched verse text
                    const passageOverrides = overrides.get(pid);
                    if (textPassage && passageOverrides) {
                        for (const ov of passageOverrides) {
                            for (const verse of textPassage.verses) {
                                for (const vp of verse.verseParts) {
                                    if (vp.verseNumber === ov.verseNum) {
                                        vp.verseText = ov.overrideText;
                                        vp.wordsOfChrist = ov.wordsOfChrist;
                                    }
                                }
                            }
                        }
                    }

                    setPassageTextCache((prev) => {
                        const newCache = new Map(prev);
                        if (textPassage) {
                            newCache.set(pid, textPassage);
                        }
                        return newCache;
                    });
                } catch (error) {
                    console.error('Error fetching passage text:', error);
                } finally {
                    setLoadingTextIds((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(pid);
                        return newSet;
                    });
                }
            }
        },
        [expandedPassageIds, passageTextCache, loadingTextIds, overrides, selectedUserId]
    );

    const selectAll = () => {
        setSelectedPassageIds(new Set(filteredPassages.map((p) => p.passageId)));
    };

    const selectNone = () => {
        setSelectedPassageIds(new Set());
    };

    const handleImport = async () => {
        if (selectedPassageIds.size === 0) return;

        setIsImporting(true);
        try {
            const ids = Array.from(selectedPassageIds);
            const result = await bibleService.importMemoryPassages(currentUser, ids);

            if (result.imported > 0) {
                showToast({
                    message: `Imported ${result.imported} passage${result.imported !== 1 ? 's' : ''}${
                        result.skipped > 0 ? `, ${result.skipped} already in your list` : ''
                    }`,
                    variant: 'success',
                });
            } else {
                showToast({
                    message: `All ${result.skipped} passage${result.skipped !== 1 ? 's' : ''} already in your list`,
                    variant: 'warning',
                });
            }

            setSelectedPassageIds(new Set());
        } catch (error) {
            console.error('Error importing passages:', error);
            showToast({ message: 'Failed to import passages', variant: 'error' });
        } finally {
            setIsImporting(false);
        }
    };

    const renderVerseText = (passageId: number) => {
        const textPassage = passageTextCache.get(passageId);
        if (!textPassage) return null;

        const originalPassage = sourcePassages.find((p) => p.passageId === passageId);

        return (
            <div className="mt-2 ps-5 pe-3 pb-2">
                <h6 className="text-white-50 mb-2">
                    {originalPassage &&
                        getPassageReference(originalPassage, false, true)}
                </h6>
                {textPassage.verses.map((verse, vi) => (
                    <React.Fragment key={vi}>
                        {textPassage.verses.length > 1 && (
                            <sup className="text-warning me-1">{verse.verseParts[0].verseNumber}</sup>
                        )}
                        {verse.verseParts.map((vp, vpi) => (
                            <span
                                key={vpi}
                                className={vp.wordsOfChrist ? 'text-danger' : 'text-white-50'}
                            >
                {vp.verseText}{' '}
              </span>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    if (isLoadingUsers) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status" />
                <p className="mt-2">Loading users...</p>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Import Memory Passages</h1>
            <p className="text-white-50 mb-4">
                Select another user to browse their memory passages, then choose which ones to add to your own list.
                Click the chevron next to any passage to preview its text.
            </p>

            <Form.Group className="mb-4">
                <Form.Label className="text-white">Source User</Form.Label>
                <Form.Select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    className="bg-dark text-white border-secondary"
                    style={{ maxWidth: '400px' }}
                >
                    <option value="">-- Select a user --</option>
                    {allUsers.map((u) => (
                        <option key={u.userName} value={u.userName}>
                            {u.userName} (Last active: {u.lastModified})
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>

            {selectedUserId && (
                <>
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-3">
                            <Badge bg="info" pill>
                                {sourcePassages.length} total
                            </Badge>
                            {selectedPassageIds.size > 0 && (
                                <Badge bg="success" pill>
                                    {selectedPassageIds.size} selected
                                </Badge>
                            )}
                        </div>
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-light"
                                size="sm"
                                onClick={selectAll}
                                disabled={filteredPassages.length === 0}
                            >
                                <FontAwesomeIcon icon={faCheckSquare} className="me-1" />
                                Select All
                            </Button>
                            <Button
                                variant="outline-light"
                                size="sm"
                                onClick={selectNone}
                                disabled={selectedPassageIds.size === 0}
                            >
                                <FontAwesomeIcon icon={faSquare} className="me-1" />
                                Select None
                            </Button>
                        </div>
                    </div>

                    <Form className="mb-3">
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

                    {isLoadingPassages ? (
                        <div className="text-center text-white py-4">
                            <Spinner animation="border" role="status" />
                            <p className="mt-2">Loading passages...</p>
                        </div>
                    ) : filteredPassages.length === 0 ? (
                        <p className="text-center text-white">
                            {searchTerm
                                ? 'No passages match your search.'
                                : 'This user has no memory passages.'}
                        </p>
                    ) : (
                        <>
                            <div className="list-group mb-4">
                                {filteredPassages.map((passage) => {
                                    const isSelected = selectedPassageIds.has(passage.passageId);
                                    const isExpanded = expandedPassageIds.has(passage.passageId);
                                    const isLoadingText = loadingTextIds.has(passage.passageId);
                                    const hasOverrides = overrides.has(passage.passageId);

                                    return (
                                        <div
                                            key={passage.passageId}
                                            className={`list-group-item ${
                                                isSelected
                                                    ? 'bg-success bg-opacity-25 text-white border-success'
                                                    : 'bg-dark text-white border-secondary'
                                            }`}
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                {/* Checkbox toggle */}
                                                <button
                                                    type="button"
                                                    className="btn btn-sm p-0 border-0 bg-transparent"
                                                    onClick={() => togglePassage(passage.passageId)}
                                                    aria-label={isSelected ? 'Deselect passage' : 'Select passage'}
                                                >
                                                    <FontAwesomeIcon
                                                        icon={isSelected ? faCheckSquare : faSquare}
                                                        className={isSelected ? 'text-success' : 'text-white-50'}
                                                        size="lg"
                                                    />
                                                </button>

                                                {/* Expand chevron */}
                                                <button
                                                    type="button"
                                                    className="btn btn-sm p-0 border-0 bg-transparent text-white-50"
                                                    onClick={() => toggleExpand(passage)}
                                                    aria-label={isExpanded ? 'Collapse passage' : 'Expand passage'}
                                                >
                                                    <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                                                </button>

                                                {/* Reference */}
                                                <span className="flex-grow-1">
                          {getPassageReference(passage, false)}
                                                    {hasOverrides && (
                                                        <Badge
                                                            bg="secondary"
                                                            pill
                                                            className="ms-2"
                                                            style={{ fontSize: '0.65em' }}
                                                            title="This passage has custom text edits"
                                                        >
                                                            edited
                                                        </Badge>
                                                    )}
                        </span>
                                            </div>

                                            {/* Expanded verse text */}
                                            {isExpanded && (
                                                <>
                                                    {isLoadingText ? (
                                                        <div className="ps-5 py-2">
                                                            <Spinner animation="border" size="sm" className="text-white-50" />
                                                            <span className="text-white-50 ms-2">Loading text...</span>
                                                        </div>
                                                    ) : (
                                                        renderVerseText(passage.passageId)
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="d-flex justify-content-end">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleImport}
                                    disabled={selectedPassageIds.size === 0 || isImporting}
                                >
                                    {isImporting ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                                className="me-2"
                                            />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faFileImport} className="me-2" />
                                            Import {selectedPassageIds.size} Passage{selectedPassageIds.size !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </>
            )}

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default ImportMemoryPassages;
