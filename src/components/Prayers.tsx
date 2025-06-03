import React, {useState, useEffect} from 'react';
import {Container, Card, Button, Modal, Form, Spinner, Toast} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlus, faPencilAlt, faTrash, faPray, faHistory} from '@fortawesome/free-solid-svg-icons';
import {bibleService} from '../services/bible-service';
import {useAppSelector} from '../store/hooks';
import {PrayerSession} from "../models/prayer.ts";
import {format} from 'date-fns';

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
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPrayModal, setShowPrayModal] = useState(false);
    const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
    const [prayerHistory, setPrayerHistory] = useState<PrayerSession[]>([]);
    const [prayerNote, setPrayerNote] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');
    const [expandedPrayers, setExpandedPrayers] = useState<Set<number>>(new Set());
    const [editingPrayer, setEditingPrayer] = useState<Prayer>({
        userId: '',
        prayerTitleTx: '',
        prayerDetailsTx: '',
        prayerSubjectPersonName: '',
        archiveFl: 'N'
    });

    const user = useAppSelector(state => state.user.currentUser);

    useEffect(() => {
        fetchPrayers();
    }, [user]);

    const fetchPrayers = async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const prayerList = await bibleService.getAllPrayers(user);
            // Filter out archived prayers and sort by prayerId descending
            setPrayers(prayerList
                .filter(prayer => prayer.archiveFl === 'N')
                .sort((a, b) => (b.prayerId || 0) - (a.prayerId || 0))
            );
        } catch (error) {
            console.error('Error fetching prayers:', error);
            showToastMessage('Error fetching prayers', true);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePrayerExpansion = (prayerId: number) => {
        setExpandedPrayers(prev => {
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

    const handleAddEditPrayer = async () => {
        try {
            let result: string;
            if (editingPrayer.prayerId) {
                result = await bibleService.updatePrayer(editingPrayer, user);
            } else {
                result = await bibleService.addPrayer(editingPrayer);
            }
            if (result !== 'error') {
                showToastMessage(
                    editingPrayer.prayerId
                        ? 'Prayer updated successfully'
                        : 'Prayer added successfully'
                );
                setShowAddModal(false);
                fetchPrayers();
            } else {
                showToastMessage('Failed to save prayer', true);
            }
        } catch (error) {
            console.error('Error saving prayer:', error);
            showToastMessage('Error saving prayer', true);
        }
    };

    const handleViewHistory = async (prayer: Prayer) => {
        try {
            const history = await bibleService.getAllPrayerSessions(user);
            setPrayerHistory(history.filter((h) => h.prayerId === prayer.prayerId));
            setSelectedPrayer(prayer);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error fetching prayer history:', error);
            showToastMessage('Error fetching prayer history', true);
        }
    };

    const handleArchive = async () => {
        if (!selectedPrayer?.prayerId || !user) return;
        try {
            const result = await bibleService.archivePrayer(user, selectedPrayer.prayerId);
            if (result === 'success') {
                showToastMessage('Prayer archived successfully');
                fetchPrayers(); // Refresh the prayer list
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
                setShowPrayModal(false);
                setPrayerNote('');
            }
        } catch (error) {
            console.error('Error recording prayer session:', error);
            showToastMessage('Error recording prayer session', true);
        }
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status"/>
                <p className="mt-2">Loading prayers...</p>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="text-white">Prayers</h1>
                <Button
                    variant="primary"
                    onClick={() => {
                        setEditingPrayer({
                            prayerTitleTx: '',
                            userId: user,
                            prayerDetailsTx: '',
                            prayerSubjectPersonName: '',
                            archiveFl: 'N'
                        });
                        setShowAddModal(true);
                    }}
                >
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
                                    onClick={() => prayer.prayerId && togglePrayerExpansion(prayer.prayerId)}
                                    style={{cursor: 'pointer'}}
                                >
                                    <h5 className="mb-0">
                                        {expandedPrayers.has(prayer.prayerId || 0) ? '▼' : '▶'} {prayer.prayerTitleTx}
                                    </h5>
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
                                                setEditingPrayer(prayer);
                                                setShowAddModal(true);
                                            }}
                                            title="Edit"
                                        >
                                            <FontAwesomeIcon icon={faPencilAlt}/>
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
                                            <FontAwesomeIcon icon={faTrash}/>
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
                                            <FontAwesomeIcon icon={faPray}/>
                                        </Button>
                                        <Button
                                            variant="link"
                                            className="text-info me-3 p-2"
                                            onClick={() => handleViewHistory(prayer)}
                                            title="View History"
                                        >
                                            <FontAwesomeIcon icon={faHistory}/>
                                        </Button>
                                    </div>
                                    <Card.Subtitle className="mb-2 text-muted">
                                        Pray for: {prayer.prayerSubjectPersonName}
                                    </Card.Subtitle>
                                    <Card.Text style={{whiteSpace: 'pre-line'}}>
                                        {prayer.prayerDetailsTx}
                                    </Card.Text>
                                </Card.Body>
                            )}
                        </Card>
                    </div>
                ))}
            </div>

            {/* Add/Edit Prayer Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>
                        {editingPrayer.prayerId ? 'Edit Prayer' : 'Add Prayer'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingPrayer.prayerTitleTx}
                                onChange={(e) =>
                                    setEditingPrayer({
                                        ...editingPrayer,
                                        prayerTitleTx: e.target.value,
                                    })
                                }
                                className="bg-dark text-white"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Who to pray for</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingPrayer.prayerSubjectPersonName}
                                onChange={(e) =>
                                    setEditingPrayer({
                                        ...editingPrayer,
                                        prayerSubjectPersonName: e.target.value,
                                    })
                                }
                                className="bg-dark text-white"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Details</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={editingPrayer.prayerDetailsTx}
                                onChange={(e) =>
                                    setEditingPrayer({
                                        ...editingPrayer,
                                        prayerDetailsTx: e.target.value,
                                    })
                                }
                                className="bg-dark text-white"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddEditPrayer}
                        disabled={!editingPrayer.prayerTitleTx.trim()}
                    >
                        {editingPrayer.prayerId ? 'Save Changes' : 'Add Prayer'}
                    </Button>
                </Modal.Footer>
            </Modal>
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
                                                {format(new Date(session.dateTime), 'PPpp')}
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
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button variant="secondary" onClick={() => setShowPrayModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handlePray}>
                        Record Prayer
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
                    <Button variant="secondary" onClick={() => setShowArchiveModal(false)}>
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