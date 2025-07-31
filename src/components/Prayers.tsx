import React, {useState, useEffect} from 'react';
import {
    Container,
    Card,
    Button,
    Modal,
    Form,
    Spinner,
    Toast,
} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faPencilAlt,
    faTrash,
    faPray,
    faHistory,
    faArchive,
    faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import {bibleService} from '../services/bible-service';
import {useAppSelector} from '../store/hooks';
import {Prayer, PrayerSession} from '../models/prayer.ts';
import {format, parseISO} from 'date-fns';
import AddEditPrayerModal from './AddEditPrayerModal';
import {updateLastPracticedDate} from '../models/passage-utils';
import {useToast} from '../hooks/useToast';

const Prayers: React.FC = () => {
    const [prayers, setPrayers] = useState<Prayer[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
    const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPrayModal, setShowPrayModal] = useState(false);
    const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
    const [editingPrayer, setEditingPrayer] = useState<Prayer | null>(null);
    const [prayerHistory, setPrayerHistory] = useState<PrayerSession[]>([]);
    const [filteredPrayerHistory, setFilteredPrayerHistory] = useState<
        PrayerSession[]
    >([]);
    const [prayerNote, setPrayerNote] = useState('');
    const [isRecordingPrayer, setIsRecordingPrayer] = useState(false);
    const [expandedPrayers, setExpandedPrayers] = useState<Set<number>>(
        new Set()
    );
    const [prayedTodaySet, setPrayedTodaySet] = useState<Set<number>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const {showToast, toastProps, toastMessage} = useToast();

    const user = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        if (!user) {
            return;
        }
        try {
            setIsLoading(true);
            Promise.all([
                bibleService.getAllPrayers(user),
                bibleService.getAllPrayerSessions(user),
            ]).then((results) => {
                setPrayerHistory(results[1]);
                processPrayers(results[0], results[1]);
            });
        } catch (error) {
            console.error('Error fetching prayers:', error);
            showToast({message: 'Error fetching prayers', variant: 'error'});
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const processPrayers = (
        prayerList: Prayer[],
        prayerSessions: PrayerSession[]
    ) => {
        // Filter based on showArchived state
        prayerList = showArchived
            ? prayerList.filter((p) => p.archiveFl === 'Y')
            : prayerList.filter((p) => p.archiveFl === 'N');
        updateLastPracticedDate(prayerSessions, prayerList);
        const prayedTodayIds = new Set<number>();
        const today = format(new Date(), 'yyyy-MM-dd');
        console.log("Prayers.processPrayers - Here is today's date: " + today);
        prayerList.forEach((p) => {
            if (p.mostRecentPrayerDate === today) {
                prayedTodayIds.add(p.prayerId);
            }
        });
        console.log(
            'Prayers.processPrayers - Here is the Set of prayedTodayIds:',
            prayedTodayIds
        );
        setPrayedTodaySet(prayedTodayIds);
        setPrayers(prayerList);
    };

    // Re-process prayers when showArchived changes
    useEffect(() => {
        if (prayerHistory.length > 0) {
            // Get all prayers again from the API when toggling
            bibleService.getAllPrayers(user).then((allPrayersList) => {
                processPrayers(allPrayersList, prayerHistory);
            });
        }
    }, [showArchived]);

    const togglePrayerExpansion = (prayerId: number) => {
        setExpandedPrayers((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(prayerId)) {
                newSet.delete(prayerId);
            } else {
                newSet.add(prayerId);
            }
            return newSet;
        });
    };

    const handleAddPrayer = () => {
        setEditingPrayer(null);
        setShowAddEditModal(true);
    };

    const handleEditPrayer = (prayer: Prayer) => {
        setEditingPrayer(prayer);
        setShowAddEditModal(true);
    };

    const handlePrayerSaved = (prayer: Prayer) => {
        let localPrayers = [...prayers];
        const existingPrayerIndex = prayers.findIndex(
            (p) => p.prayerId === prayer.prayerId
        );
        if (existingPrayerIndex >= 0) {
            localPrayers[existingPrayerIndex] = prayer;
        } else {
            localPrayers.push(prayer);
        }
        setPrayers(localPrayers);
    };

    const handleViewHistory = async (prayer: Prayer) => {
        try {
            // Filter existing prayerHistory for this specific prayer
            const filteredHistory = prayerHistory.filter(
                (h) => h.prayerId === prayer.prayerId
            );
            setFilteredPrayerHistory(filteredHistory);
            setSelectedPrayer(prayer);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error filtering prayer history:', error);
            showToast({message: 'Error fetching prayer history', variant: 'error'});
        }
    };

    const handleArchive = async () => {
        if (!selectedPrayer?.prayerId || !user) return;
        try {
            const result = await bibleService.archivePrayer(
                user,
                selectedPrayer.prayerId
            );
            if (result === 'success') {
                showToast({message: 'Prayer archived successfully', variant: 'success'});
                setPrayers((prev) =>
                    prev.filter((p) => p.prayerId !== selectedPrayer.prayerId)
                );
            } else {
                showToast({message: 'Failed to archive prayer', variant: 'error'});
            }
            setShowArchiveModal(false);
        } catch (error) {
            console.error('Error archiving prayer:', error);
            showToast({message: 'Error archiving prayer', variant: 'error'});
        }
    };

    const handlePray = async () => {
        if (!selectedPrayer?.prayerId || !user) return;

        setIsRecordingPrayer(true);
        try {
            const result = await bibleService.addPrayerSession(
                selectedPrayer.prayerId,
                user,
                prayerNote.trim() || null
            );
            if (result === 'error') {
                showToast({message: 'Failed to record prayer session', variant: 'error'});
            } else {
                showToast({message: 'Prayer session recorded successfully', variant: 'success'});

                // Create new prayer session entry and add it to prayerHistory
                const newSession: PrayerSession = {
                    dateTime: new Date().toISOString(),
                    userId: user,
                    prayerId: selectedPrayer.prayerId,
                    prayerNoteTx: prayerNote.trim() || null,
                };

                // Update prayerHistory state with the new session
                setPrayerHistory((prev) => [newSession, ...prev]);
                const locPrayedToday = new Set(prayedTodaySet);
                locPrayedToday.add(newSession.prayerId);
                setPrayedTodaySet(locPrayedToday);

                // Collapse the prayer card after recording
                if (selectedPrayer.prayerId) {
                    setExpandedPrayers((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(selectedPrayer.prayerId!);
                        return newSet;
                    });
                }

                setShowPrayModal(false);
                setPrayerNote('');
            }
        } catch (error) {
            console.error('Error recording prayer session:', error);
            showToast({message: 'Error recording prayer session', variant: 'error'});
        } finally {
            setIsRecordingPrayer(false);
        }
    };

    return (
        <Container className="py-4">
            {isLoading ? (
                <div className="text-center text-white">
                    <Spinner animation="border" role="status"/>
                    <p className="mt-2">Loading prayers...</p>
                </div>
            ) : (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1 className="text-white">
                            {showArchived ? 'Archived Prayers' : 'Prayers'}
                        </h1>
                        <div className="d-flex gap-2">
                            <Button
                                variant={showArchived ? "warning" : "outline-secondary"}
                                onClick={() => setShowArchived(!showArchived)}
                                title={showArchived ? "Show Active Prayers" : "Show Archived Prayers"}
                            >
                                <FontAwesomeIcon icon={showArchived ? faEyeSlash : faArchive}/>
                            </Button>
                            <Button variant="primary" onClick={handleAddPrayer}>
                                <FontAwesomeIcon icon={faPlus} className="me-2"/>
                                Add Prayer
                            </Button>
                        </div>
                    </div>

                    <div className="row g-4">
                        {prayers.map((prayer) => (
                            <div key={prayer.prayerId} className="col-12">
                                <Card bg="dark" text="white">
                                    <Card.Header>
                                        <div
                                            className="d-flex justify-content-between align-items-center cursor-pointer"
                                            onClick={() =>
                                                prayer.prayerId &&
                                                togglePrayerExpansion(prayer.prayerId)
                                            }
                                            style={{cursor: 'pointer'}}
                                        >
                                            <h3 className="mb-0 d-flex align-items-center">
                        <span
                            className="me-2 px-2 py-1 rounded"
                            style={{
                                backgroundColor:
                                    prayer.prayerId &&
                                    prayedTodaySet.has(prayer.prayerId)
                                        ? '#28a745'
                                        : 'transparent',
                                color:
                                    prayer.prayerId &&
                                    prayedTodaySet.has(prayer.prayerId)
                                        ? 'white'
                                        : 'inherit',
                            }}
                        >
                          {expandedPrayers.has(prayer.prayerId || 0)
                              ? '▼'
                              : '▶'}
                        </span>
                                                {prayer.prayerTitleTx}
                                            </h3>
                                        </div>
                                    </Card.Header>
                                    {expandedPrayers.has(prayer.prayerId || 0) && (
                                        <Card.Body>
                                            <div className="d-flex justify-content-end mb-3">
                                                <Button
                                                    variant="link"
                                                    className="text-light me-3 p-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditPrayer(prayer);
                                                    }}
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon size="2x" icon={faPencilAlt}/>
                                                </Button>
                                                <Button
                                                    variant="link"
                                                    className="text-danger me-3 p-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPrayer(prayer);
                                                        setShowArchiveModal(true);
                                                    }}
                                                    title="Archive"
                                                >
                                                    <FontAwesomeIcon size="2x" icon={faTrash}/>
                                                </Button>
                                                <Button
                                                    variant="link"
                                                    className="text-success me-3 p-2"
                                                    onClick={() => {
                                                        setSelectedPrayer(prayer);
                                                        setShowPrayModal(true);
                                                    }}
                                                    title="Record Prayer"
                                                >
                                                    <FontAwesomeIcon size="2x" icon={faPray}/>
                                                </Button>
                                                <Button
                                                    variant="link"
                                                    className="text-info me-3 p-2"
                                                    onClick={() => handleViewHistory(prayer)}
                                                    title="View History"
                                                >
                                                    <FontAwesomeIcon size="2x" icon={faHistory}/>
                                                </Button>
                                            </div>
                                            <Card.Subtitle className="mb-2 text-muted">
                                                Pray for: {prayer.prayerSubjectPersonName}
                                            </Card.Subtitle>
                                            <Card.Text
                                                className="lead"
                                                title={showArchived ? "Unarchive" : "Archive"}
                                            >
                                                {prayer.prayerDetailsTx}
                                            </Card.Text>
                                        </Card.Body>
                                    )}
                                </Card>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Add/Edit Prayer Modal */}
            <AddEditPrayerModal
                show={showAddEditModal}
                onHide={() => setShowAddEditModal(false)}
                prayer={editingPrayer}
                onPrayerSaved={handlePrayerSaved}
            />

            {/* Prayer History Modal */}
            <Modal
                show={showHistoryModal}
                onHide={() => {
                    setShowHistoryModal(false);
                    setFilteredPrayerHistory([]);
                }}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Prayer History</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {filteredPrayerHistory.length === 0 ? (
                        <p className="text-center">No prayer history available.</p>
                    ) : (
                        <div className="list-group">
                            {filteredPrayerHistory.map((session, index) => (
                                <div
                                    key={index}
                                    className="list-group-item bg-dark text-white border-secondary"
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <div className="fw-bold">
                                                {format(parseISO(session.dateTime), 'PPpp')}
                                            </div>
                                            <div className="text-muted">
                                                Prayed by: {session.userId}
                                            </div>
                                        </div>
                                    </div>
                                    {session.prayerNoteTx && (
                                        <div className="mt-2">
                                            <small className="text-muted">Note:</small>
                                            <p className="mb-0">{session.prayerNoteTx}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Record Prayer Modal */}
            <Modal
                show={showPrayModal}
                onHide={() => setShowPrayModal(false)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Record Prayer</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        <Form.Group>
                            <Form.Label>Prayer Note (optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={prayerNote}
                                onChange={(e) => setPrayerNote(e.target.value)}
                                placeholder="Add any notes about this prayer session..."
                                className="bg-dark text-white"
                                disabled={isRecordingPrayer}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => setShowPrayModal(false)}
                        disabled={isRecordingPrayer}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handlePray}
                        disabled={isRecordingPrayer}
                    >
                        {isRecordingPrayer ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Recording...
                            </>
                        ) : (
                            'Record Prayer'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Archive Confirmation Modal */}
            <Modal
                show={showArchiveModal}
                onHide={() => setShowArchiveModal(false)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Archive Prayer</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    Are you sure you want to archive this prayer?
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => setShowArchiveModal(false)}
                    >
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleArchive}>
                        Archive Prayer
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast notification */}
            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default Prayers;