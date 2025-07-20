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
} from '@fortawesome/free-solid-svg-icons';
import {bibleService} from '../services/bible-service';
import {useAppSelector} from '../store/hooks';
import {PrayerSession} from '../models/prayer.ts';
import {format, parseISO, subDays} from 'date-fns';
import AddEditPrayerModal from './AddEditPrayerModal';
import {shuffleArray} from '../models/passage-utils';

interface Prayer {
    prayerId?: number;
    userId: string;
    prayerTitleTx: string;
    prayerDetailsTx: string;
    prayerSubjectPersonName: string;
    archiveFl: string;
}

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
    const [prayerNote, setPrayerNote] = useState('');
    const [isRecordingPrayer, setIsRecordingPrayer] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');
    const [expandedPrayers, setExpandedPrayers] = useState<Set<number>>(new Set());
    const [prayedYesterdaySet, setPrayedYesterdaySet] = useState<Set<number>>(new Set());
    const [prayedTodaySet, setPrayedTodaySet] = useState<Set<number>>(new Set());

    const user = useAppSelector((state) => state.user.currentUser);

    // Calculate which prayers have been prayed for today based on prayerHistory
    const findPrayedTodaySet = (prayerHistory: PrayerSession[]) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const prayedTodayIds = new Set<number>();

        prayerHistory.forEach(session => {
            const sessionDate = format(parseISO(session.dateTime), 'yyyy-MM-dd');
            if (sessionDate === today) {
                prayedTodayIds.add(session.prayerId);
            }
        });

        return prayedTodayIds;
    };

    // Calculate which prayers were prayed yesterday
    const findPrayedYesterday = (prayerHistory: PrayerSession[]) => {
        const yesterday = subDays(new Date(), 1);
        const formattedYesterday = format(yesterday, 'yyyy-MM-dd');
        const prayedYesterdayIds = new Set<number>();

        prayerHistory.forEach(session => {
            const sessionDate = format(parseISO(session.dateTime), 'yyyy-MM-dd');
            if (sessionDate === formattedYesterday) {
                prayedYesterdayIds.add(session.prayerId);
            }
        });

        return prayedYesterdayIds;
    };

    useEffect(() => {
        if (!user) {
            return;
        }
        try {
            setIsLoading(true);
            Promise.all([
                bibleService.getAllPrayers(user),
                bibleService.getAllPrayerSessions(user)
            ]).then(results => {
                setPrayerHistory(results[1]);
                setPrayedYesterdaySet(findPrayedYesterday(results[1]));
                setPrayedTodaySet(findPrayedTodaySet(results[1]));
                processPrayers(results[0]);
            });
        } catch (error) {
            console.error('Error fetching prayers:', error);
            showToastMessage('Error fetching prayers', true);
        } finally {
            setIsLoading(false);
        }

    }, [user]);

    const processPrayers = (prayerList: Prayer[]) => {
        // Filter out archived prayers and sort by prayerId descending
        const filteredPrayers = prayerList
            .filter((prayer) => prayer.archiveFl === 'N')
            .sort((a, b) => (b.prayerId || 0) - (a.prayerId || 0));

        // Separate prayers into two groups: not prayed yesterday and others
        const notPrayedYesterday = filteredPrayers.filter(p => !prayedYesterdaySet.has(p.prayerId));
        const prayedYesterday = filteredPrayers.filter(p => prayedYesterdaySet.has(p.prayerId));

        // Shuffle each group randomly
        shuffleArray(notPrayedYesterday);
        shuffleArray(prayedYesterday);

        // Combine with not-prayed-yesterday prayers at the top
        const sortedPrayers = [...notPrayedYesterday, ...prayedYesterday];

        setPrayers(sortedPrayers);
    };

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

    const showToastMessage = (message: string, isError: boolean = false) => {
        setToastMessage(message);
        setToastBg(isError ? '#dc3545' : '#28a745');
        setShowToast(true);
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
        const existingPrayerIndex = prayers.findIndex(p => p.prayerId === prayer.prayerId);
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
            const filteredHistory = prayerHistory.filter((h) => h.prayerId === prayer.prayerId);
            setPrayerHistory(filteredHistory);
            setSelectedPrayer(prayer);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error filtering prayer history:', error);
            showToastMessage('Error fetching prayer history', true);
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
                showToastMessage('Prayer archived successfully');
                setPrayers(prev => prev.filter(p => p.prayerId !== selectedPrayer.prayerId));
            } else {
                showToastMessage('Failed to archive prayer', true);
            }
            setShowArchiveModal(false);
        } catch (error) {
            console.error('Error archiving prayer:', error);
            showToastMessage('Error archiving prayer', true);
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
                showToastMessage('Failed to record prayer session', true);
            } else {
                showToastMessage('Prayer session recorded successfully');

                // Create new prayer session entry and add it to prayerHistory
                const newSession: PrayerSession = {
                    dateTime: new Date().toISOString(),
                    userId: user,
                    prayerId: selectedPrayer.prayerId,
                    prayerNoteTx: prayerNote.trim() || null
                };

                // Update prayerHistory state with the new session
                setPrayerHistory(prev => [newSession, ...prev]);

                // Collapse the prayer card after recording
                if (selectedPrayer.prayerId) {
                    setExpandedPrayers(prev => {
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
            showToastMessage('Error recording prayer session', true);
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
                        <h1 className="text-white">Prayers</h1>
                        <Button variant="primary" onClick={handleAddPrayer}>
                            <FontAwesomeIcon icon={faPlus} className="me-2"/>
                            Add Prayer
                        </Button>
                    </div>

                    <div className="row g-4">
                        {prayers.map((prayer) => (
                            <div key={prayer.prayerId} className="col-12">
                                <Card bg="dark" text="white">
                                    <Card.Header>
                                        <div
                                            className="d-flex justify-content-between align-items-center cursor-pointer"
                                            onClick={() =>
                                                prayer.prayerId && togglePrayerExpansion(prayer.prayerId)
                                            }
                                            style={{cursor: 'pointer'}}
                                        >
                                            <h3 className="mb-0 d-flex align-items-center">
                                                <span
                                                    className="me-2 px-2 py-1 rounded"
                                                    style={{
                                                        backgroundColor: prayer.prayerId && prayedTodaySet.has(prayer.prayerId)
                                                            ? '#28a745'
                                                            : 'transparent',
                                                        color: prayer.prayerId && prayedTodaySet.has(prayer.prayerId)
                                                            ? 'white'
                                                            : 'inherit'
                                                    }}
                                                >
                                                    {expandedPrayers.has(prayer.prayerId || 0) ? '▼' : '▶'}
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
                                            <Card.Text className="lead" style={{whiteSpace: 'pre-line'}}>
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
                onHide={() => setShowHistoryModal(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Prayer History</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    {prayerHistory.length === 0 ? (
                        <p className="text-center">No prayer history available.</p>
                    ) : (
                        <div className="list-group">
                            {prayerHistory.map((session, index) => (
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
        </Container>
    );
};

export default Prayers;