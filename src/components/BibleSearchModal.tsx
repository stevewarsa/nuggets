import React from 'react';
import { Modal } from 'react-bootstrap';
import BibleSearchForm from './BibleSearchForm';

interface BibleSearchModalProps {
    show: boolean;
    onHide: () => void;
}

const BibleSearchModal: React.FC<BibleSearchModalProps> = ({ show, onHide }) => {
    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="lg"
            fullscreen="lg-down"
            scrollable
        >
            <Modal.Header closeButton className="bg-dark text-white">
                <Modal.Title>Bible Search</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-dark">
                <BibleSearchForm onNavigateAway={onHide} />
            </Modal.Body>
        </Modal>
    );
};

export default BibleSearchModal;
