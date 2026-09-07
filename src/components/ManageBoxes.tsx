// MEMORY PASSAGES flow — manage box assignments with select-all/deselect and bulk move between boxes.
import React, { useState, useEffect } from 'react';
import {
    Container,
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
    faArrowUp,
    faArrowDown,
    faCheckSquare,
    faSquare,
} from '@fortawesome/free-solid-svg-icons';
import { useAppSelector } from '../store/hooks';
import { bibleService } from '../services/bible-service';
import { Passage } from '../models/passage';
import { getPassageReference } from '../models/passage-utils';
import { GUEST_USER } from '../models/constants';
import { useToast } from '../hooks/useToast';

const BOXES = [1, 2, 3];

const ManageBoxes: React.FC = () => {
    const [boxes, setBoxes] = useState<Map<number, Passage[]>>(new Map());
    const [overrides, setOverrides] = useState<Passage[]>([]);
    const [expandedBoxes, setExpandedBoxes] = useState<Set<number>>(new Set());
    const [selectedByBox, setSelectedByBox] = useState<Map<number, Set<number>>>(
        new Map()
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isMoving, setIsMoving] = useState(false);
    const [pendingMove, setPendingMove] = useState<{
        fromBox: number;
        toBox: number;
        passageIds: number[];
    } | null>(null);
    const { showToast, toastProps, toastMessage } = useToast();

    const user = useAppSelector((state) => state.user.currentUser);
    const isGuestUser = user === GUEST_USER;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [memoryPassages, textOverrides] = await Promise.all([
                    bibleService.getMemoryPassageList(user),
                    bibleService.getMemoryPassageTextOverrides(user),
                ]);

                setOverrides(textOverrides);

                const boxMap = new Map<number, Passage[]>();
                BOXES.forEach((b) => boxMap.set(b, []));
                memoryPassages.forEach((passage) => {
                    if (passage.frequencyDays >= 1 && passage.frequencyDays <= 3) {
                        boxMap.get(passage.frequencyDays)!.push(passage);
                    }
                });
                boxMap.forEach((passages) => {
                    passages.sort((a, b) => {
                        if (a.bookId !== b.bookId) return a.bookId - b.bookId;
                        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                        return a.startVerse - b.startVerse;
                    });
                });
                setBoxes(boxMap);
            } catch (error) {
                console.error('Error fetching memory passages:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (user) fetchData();
    }, [user]);

    const getPassageWithAppendLetter = (passage: Passage): Passage => {
        const override = overrides.find((o) => o.passageId === passage.passageId);
        return override
            ? { ...passage, passageRefAppendLetter: override.passageRefAppendLetter }
            : passage;
    };

    const selectedInBox = (box: number): Set<number> =>
        selectedByBox.get(box) ?? new Set();

    const toggleBoxExpansion = (box: number) => {
        setExpandedBoxes((prev) => {
            const next = new Set(prev);
            if (next.has(box)) next.delete(box);
            else next.add(box);
            return next;
        });
    };

    const togglePassageSelection = (box: number, passageId: number) => {
        setSelectedByBox((prev) => {
            const next = new Map(prev);
            const current = new Set<number>(next.get(box) ?? new Set<number>());
            if (current.has(passageId)) current.delete(passageId);
            else current.add(passageId);
            next.set(box, current);
            return next;
        });
    };

    const selectAllInBox = (box: number) => {
        const passages = boxes.get(box) ?? [];
        setSelectedByBox((prev) => {
            const next = new Map(prev);
            next.set(box, new Set(passages.map((p) => p.passageId)));
            return next;
        });
    };

    const deselectAllInBox = (box: number) => {
        setSelectedByBox((prev) => {
            const next = new Map(prev);
            next.set(box, new Set());
            return next;
        });
    };

    const allSelectedInBox = (box: number): boolean => {
        const passages = boxes.get(box) ?? [];
        if (passages.length === 0) return false;
        return selectedInBox(box).size === passages.length;
    };

    const confirmMove = async () => {
        if (!pendingMove) return;
        const { fromBox, toBox, passageIds } = pendingMove;
        setShowConfirmModal(false);
        setIsMoving(true);

        try {
            const result = await bibleService.batchUpdateFrequency(
                user,
                passageIds,
                toBox
            );

            if (result === 'success') {
                const newBoxes = new Map(boxes);
                const fromPassages = newBoxes.get(fromBox) ?? [];
                const movedPassages = fromPassages.filter((p) =>
                    passageIds.includes(p.passageId)
                );
                const remainingFrom = fromPassages.filter(
                    (p) => !passageIds.includes(p.passageId)
                );
                const toPassages = newBoxes.get(toBox) ?? [];

                const updatedMoved = movedPassages.map((p) => ({
                    ...p,
                    frequencyDays: toBox,
                }));
                toPassages.push(...updatedMoved);
                toPassages.sort((a, b) => {
                    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
                    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                    return a.startVerse - b.startVerse;
                });

                newBoxes.set(fromBox, remainingFrom);
                newBoxes.set(toBox, toPassages);
                setBoxes(newBoxes);

                setSelectedByBox((prev) => {
                    const next = new Map(prev);
                    next.set(fromBox, new Set());
                    return next;
                });

                showToast({
                    message: `Moved ${passageIds.length} passage${
                        passageIds.length > 1 ? 's' : ''
                    } from Box ${fromBox} to Box ${toBox}`,
                    variant: 'success',
                });
            } else {
                showToast({ message: 'Failed to move passages', variant: 'error' });
            }
        } catch (error) {
            console.error('Error moving passages:', error);
            showToast({ message: 'Error moving passages', variant: 'error' });
        } finally {
            setIsMoving(false);
            setPendingMove(null);
        }
    };

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const requestMove = (fromBox: number, direction: 'UP' | 'DOWN') => {
        const selectedIds = Array.from(selectedInBox(fromBox));
        if (selectedIds.length === 0) return;
        const toBox = direction === 'UP' ? fromBox - 1 : fromBox + 1;
        if (toBox < 1 || toBox > 3) return;
        setPendingMove({ fromBox, toBox, passageIds: selectedIds });
        setShowConfirmModal(true);
    };

    const boxLabel = (box: number) => {
        if (box === -1) return 'Every Time';
        return `Box ${box}`;
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
            <h1 className="text-white mb-4">Manage Boxes</h1>
            <p className="text-white-50 mb-4">
                Select passages in a box, then use the arrows to move them to an
                adjacent box. Use "Select All" to grab everything, then deselect the
                ones you want to keep.
            </p>

            {BOXES.map((box) => {
                const passages = boxes.get(box) ?? [];
                const selected = selectedInBox(box);
                const selectedCount = selected.size;
                const allSelected = allSelectedInBox(box);
                const upEnabled = !isGuestUser && selectedCount > 0 && box > 1;
                const downEnabled = !isGuestUser && selectedCount > 0 && box < 3;

                return (
                    <div key={box} className="mb-4">
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <Button
                                variant="link"
                                className="text-white text-decoration-none p-0"
                                onClick={() => toggleBoxExpansion(box)}
                            >
                                <h2 className="d-flex align-items-center m-0">
                                    <FontAwesomeIcon
                                        icon={expandedBoxes.has(box) ? faChevronDown : faChevronRight}
                                        className="me-2"
                                    />
                                    {boxLabel(box)} ({passages.length} passages
                                    {selectedCount > 0 && ` · ${selectedCount} selected`})
                                </h2>
                            </Button>

                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip id={`up-tooltip-${box}`}>
                                        Move selected to Box {box - 1}
                                    </Tooltip>
                                }
                            >
                <span>
                  <Button
                      variant="outline-light"
                      size="sm"
                      disabled={!upEnabled}
                      onClick={() => requestMove(box, 'UP')}
                  >
                    <FontAwesomeIcon icon={faArrowUp} />
                  </Button>
                </span>
                            </OverlayTrigger>

                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    <Tooltip id={`down-tooltip-${box}`}>
                                        Move selected to Box {box + 1}
                                    </Tooltip>
                                }
                            >
                <span>
                  <Button
                      variant="outline-light"
                      size="sm"
                      disabled={!downEnabled}
                      onClick={() => requestMove(box, 'DOWN')}
                  >
                    <FontAwesomeIcon icon={faArrowDown} />
                  </Button>
                </span>
                            </OverlayTrigger>

                            {passages.length > 0 && (
                                <Button
                                    variant="link"
                                    className="text-white-50 text-decoration-none p-0"
                                    size="sm"
                                    onClick={() =>
                                        allSelected
                                            ? deselectAllInBox(box)
                                            : selectAllInBox(box)
                                    }
                                >
                                    <FontAwesomeIcon
                                        icon={allSelected ? faCheckSquare : faSquare}
                                        className="me-1"
                                    />
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                </Button>
                            )}
                        </div>

                        <Collapse in={expandedBoxes.has(box)}>
                            <div className="ms-4">
                                {passages.length === 0 ? (
                                    <p className="text-white-50">No passages in this box</p>
                                ) : (
                                    <div className="list-group">
                                        {passages.map((passage) => {
                                            const isSelected = selected.has(passage.passageId);
                                            return (
                                                <div
                                                    key={passage.passageId}
                                                    className={`list-group-item d-flex align-items-center mb-2 ${
                                                        isSelected
                                                            ? 'bg-primary bg-opacity-25 text-white border-primary'
                                                            : 'bg-dark text-white border-secondary'
                                                    }`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() =>
                                                        togglePassageSelection(box, passage.passageId)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={isSelected ? faCheckSquare : faSquare}
                                                        className="me-3"
                                                    />
                                                    <span>
                            {getPassageReference(
                                getPassageWithAppendLetter(passage),
                                false
                            )}
                          </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Collapse>
                    </div>
                );
            })}

            {/* Confirmation Modal */}
            <Modal
                show={showConfirmModal}
                onHide={() => {
                    setShowConfirmModal(false);
                    setPendingMove(null);
                }}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Confirm Move</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {pendingMove && (
                        <p>
                            Move {pendingMove.passageIds.length} passage
                            {pendingMove.passageIds.length > 1 ? 's' : ''} from{' '}
                            {boxLabel(pendingMove.fromBox)} to {boxLabel(pendingMove.toBox)}?
                        </p>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowConfirmModal(false);
                            setPendingMove(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={confirmMove}>
                        {isMoving ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Moving...
                            </>
                        ) : (
                            'Move'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default ManageBoxes;
