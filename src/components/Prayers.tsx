import React, {useState, useEffect} from 'react';
import {Container, Card, Button, Modal, Form, Spinner, Toast} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlus, faPencilAlt, faTrash} from '@fortawesome/free-solid-svg-icons';
import {bibleService} from '../services/bible-service';
import {useAppSelector} from '../store/hooks';

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
    const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
    const [showToast, setShowToast] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastBg, setToastBg] = useState<string>('#28a745');
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
                                    <div>
                                        <Button
                                            variant="link"
                                            className="text-light me-2 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPrayer(prayer);
                                                setShowAddModal(true);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                        </Button>
                                        <Button
                                            variant="link"
                                            className="text-danger p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPrayer(prayer);
                                                setShowArchiveModal(true);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faTrash}/>
                                        </Button>
                                    </div>
                                </div>
                            </Card.Header>
                            {expandedPrayers.has(prayer.prayerId || 0) && (
                                <Card.Body>
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