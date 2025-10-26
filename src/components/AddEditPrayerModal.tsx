import React, {useState, useEffect} from 'react';
import {Modal, Form, Button, Spinner, Toast} from 'react-bootstrap';
import {bibleService} from '../services/bible-service';
import {useAppSelector} from '../store/hooks';
import {Prayer} from '../models/prayer.ts';
import {useToast} from '../hooks/useToast';

interface AddEditPrayerModalProps {
    show: boolean;
    onHide: () => void;
    prayer?: Prayer | null;
    onPrayerSaved?: (prayer: Prayer) => void;
}

const AddEditPrayerModal: React.FC<AddEditPrayerModalProps> = ({
                                                                   show,
                                                                   onHide,
                                                                   prayer = null,
                                                                   onPrayerSaved,
                                                               }) => {
    const [editingPrayer, setEditingPrayer] = useState<Prayer>({
        userId: '',
        prayerTitleTx: '',
        prayerDetailsTx: '',
        prayerSubjectPersonName: '',
        archiveFl: 'N',
        prayerPriorityCd: '',
        mostRecentPrayerDate: undefined,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {showToast, toastProps, toastMessage} = useToast();

    const user = useAppSelector((state) => state.user.currentUser);

    // Initialize form when modal opens or prayer prop changes
    useEffect(() => {
        if (show) {
            if (prayer) {
                // Editing existing prayer
                setEditingPrayer(prayer);
            } else {
                // Adding new prayer
                setEditingPrayer({
                    userId: user,
                    prayerTitleTx: '',
                    prayerDetailsTx: '',
                    prayerSubjectPersonName: '',
                    archiveFl: 'N',
                    prayerPriorityCd: '',
                    mostRecentPrayerDate: undefined,
                });
            }
        }
    }, [show, prayer, user]);

    const handleSubmit = async () => {
        if (!editingPrayer.prayerTitleTx.trim()) {
            showToast({message: 'Please enter a prayer title', variant: 'error'});
            return;
        }

        setIsSubmitting(true);
        try {
            let result: string;
            if (editingPrayer.prayerId) {
                result = await bibleService.updatePrayer(editingPrayer, user);
            } else {
                result = await bibleService.addPrayer(editingPrayer);
            }

            if (result !== 'error') {
                showToast({
                    message: editingPrayer.prayerId
                        ? 'Prayer updated successfully'
                        : 'Prayer added successfully',
                    variant: 'success'
                });

                // Call the callback if provided
                if (onPrayerSaved) {
                    onPrayerSaved(editingPrayer);
                }

                // Close modal after a short delay
                setTimeout(() => {
                    onHide();
                }, 1000);
            } else {
                showToast({message: 'Failed to save prayer', variant: 'error'});
            }
        } catch (error) {
            console.error('Error saving prayer:', error);
            showToast({message: 'Error saving prayer', variant: 'error'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onHide();
        }
    };

    return (
        <>
            <Modal show={show} onHide={handleClose} centered>
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
                                disabled={isSubmitting}
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
                                disabled={isSubmitting}
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
                                disabled={isSubmitting}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                id="daily-prayer-checkbox"
                                label="Pray for this daily"
                                checked={editingPrayer.prayerPriorityCd === 'daily'}
                                onChange={(e) =>
                                    setEditingPrayer({
                                        ...editingPrayer,
                                        prayerPriorityCd: e.target.checked ? 'daily' : '',
                                    })
                                }
                                disabled={isSubmitting}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!editingPrayer.prayerTitleTx.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Saving...
                            </>
                        ) : editingPrayer.prayerId ? (
                            'Save Changes'
                        ) : (
                            'Add Prayer'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast notification */}
            <Toast
                {...toastProps}
            >
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </>
    );
};

export default AddEditPrayerModal;
