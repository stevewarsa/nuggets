import React, { useState, useEffect } from 'react';
import {
    Modal,
    Form,
    Button,
    Spinner,
    Toast,
    InputGroup,
    Badge,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { bibleService } from '../services/bible-service';
import { useAppSelector } from '../store/hooks';
import { useToast } from '../hooks/useToast';
import {
    Objection,
    ObjectionCategory,
    ObjectionAnswer,
    ANSWER_TYPE_LABELS,
} from '../models/objection';

interface AddEditObjectionModalProps {
    show: boolean;
    onHide: () => void;
    objection?: Objection | null;
    categories: ObjectionCategory[];
    currentCategoryId: number | null;
    onSaved: () => void;
}

const emptyAnswer = (sortOrder: number): ObjectionAnswer => ({
    answerTypeCd: 'short',
    answerText: '',
    sourceText: null,
    sourceUrl: null,
    sortOrder,
});

const AddEditObjectionModal: React.FC<AddEditObjectionModalProps> = ({
                                                                         show,
                                                                         onHide,
                                                                         objection = null,
                                                                         categories,
                                                                         currentCategoryId,
                                                                         onSaved,
                                                                     }) => {
    const { showToast, toastProps, toastMessage } = useToast();
    const user = useAppSelector((state) => state.user.currentUser);

    const [categoryId, setCategoryId] = useState<number>(
        currentCategoryId ?? categories[0]?.categoryId ?? 0
    );
    const [objectionText, setObjectionText] = useState('');
    const [answers, setAnswers] = useState<ObjectionAnswer[]>([emptyAnswer(0)]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form when modal opens
    useEffect(() => {
        if (show) {
            if (objection) {
                setCategoryId(objection.categoryId);
                setObjectionText(objection.objectionText);
                setAnswers(
                    objection.answers && objection.answers.length > 0
                        ? objection.answers.map((a, i) => ({ ...a, sortOrder: i }))
                        : [emptyAnswer(0)]
                );
            } else {
                setCategoryId(currentCategoryId ?? categories[0]?.categoryId ?? 0);
                setObjectionText('');
                setAnswers([emptyAnswer(0)]);
            }
        }
    }, [show, objection, currentCategoryId, categories]);

    // Build a flat list of categories with indentation for the dropdown
    const buildCategoryOptions = (): { id: number; label: string; depth: number }[] => {
        const result: { id: number; label: string; depth: number }[] = [];
        const buildOptions = (parentId: number | null, depth: number) => {
            const children = categories
                .filter((c) => c.parentId === parentId)
                .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
            for (const child of children) {
                result.push({
                    id: child.categoryId,
                    label: child.categoryName,
                    depth,
                });
                buildOptions(child.categoryId, depth + 1);
            }
        };
        buildOptions(null, 0);
        return result;
    };

    const categoryOptions = buildCategoryOptions();

    const handleAddAnswer = () => {
        setAnswers((prev) => [...prev, emptyAnswer(prev.length)]);
    };

    const handleRemoveAnswer = (index: number) => {
        setAnswers((prev) =>
            prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, sortOrder: i }))
        );
    };

    const handleAnswerChange = (
        index: number,
        field: keyof ObjectionAnswer,
        value: string
    ) => {
        setAnswers((prev) =>
            prev.map((a, i) =>
                i === index
                    ? {
                        ...a,
                        [field]:
                            field === 'sourceText' || field === 'sourceUrl'
                                ? value || null
                                : value,
                    }
                    : a
            )
        );
    };

    const handleSubmit = async () => {
        if (!objectionText.trim()) {
            showToast({ message: 'Please enter the objection text', variant: 'error' });
            return;
        }
        if (categoryId <= 0) {
            showToast({ message: 'Please select a category', variant: 'error' });
            return;
        }

        // Filter out empty answers
        const validAnswers = answers.filter((a) => a.answerText.trim() !== '');

        setIsSubmitting(true);
        try {
            if (objection?.objectionId) {
                const result = await bibleService.updateObjection(user, {
                    ...objection,
                    categoryId,
                    objectionText: objectionText.trim(),
                    answers: validAnswers,
                });
                if (result === 'success') {
                    showToast({ message: 'Objection updated', variant: 'success' });
                    onSaved();
                    setTimeout(() => onHide(), 800);
                } else {
                    showToast({ message: 'Failed to update objection', variant: 'error' });
                }
            } else {
                const result = await bibleService.addObjection(
                    user,
                    categoryId,
                    objectionText.trim(),
                    validAnswers
                );
                if (result !== -1) {
                    showToast({ message: 'Objection added', variant: 'success' });
                    onSaved();
                    setTimeout(() => onHide(), 800);
                } else {
                    showToast({ message: 'Failed to add objection', variant: 'error' });
                }
            }
        } catch (error) {
            console.error('Error saving objection:', error);
            showToast({ message: 'Error saving objection', variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Modal
                show={show}
                onHide={() => !isSubmitting && onHide()}
                centered
                size="lg"
                scrollable
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>
                        {objection?.objectionId ? 'Edit Objection' : 'Add Objection'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        {/* Category selector */}
                        <Form.Group className="mb-3">
                            <Form.Label>Category</Form.Label>
                            <Form.Select
                                value={categoryId}
                                onChange={(e) => setCategoryId(parseInt(e.target.value))}
                                className="bg-dark text-white"
                                disabled={isSubmitting}
                            >
                                {categoryOptions.length === 0 && (
                                    <option value={0}>No categories yet</option>
                                )}
                                {categoryOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {'\u00A0\u00A0'.repeat(opt.depth)}
                                        {opt.depth > 0 ? '\u2514 ' : ''}
                                        {opt.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        {/* Objection text */}
                        <Form.Group className="mb-3">
                            <Form.Label>Objection</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={objectionText}
                                onChange={(e) => setObjectionText(e.target.value)}
                                placeholder="Enter the objection to the Christian faith..."
                                className="bg-dark text-white"
                                disabled={isSubmitting}
                            />
                        </Form.Group>

                        {/* Answers section */}
                        <div className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <Form.Label className="mb-0">Answers</Form.Label>
                                <Button
                                    variant="outline-info"
                                    size="sm"
                                    onClick={handleAddAnswer}
                                    disabled={isSubmitting}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add Answer
                                </Button>
                            </div>

                            {answers.map((ans, index) => (
                                <div
                                    key={index}
                                    className="border border-secondary rounded p-3 mb-3"
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Badge bg="secondary">
                                            Answer {index + 1}
                                        </Badge>
                                        {answers.length > 1 && (
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleRemoveAnswer(index)}
                                                disabled={isSubmitting}
                                            >
                                                <FontAwesomeIcon icon={faTrashAlt} />
                                            </Button>
                                        )}
                                    </div>

                                    <Form.Group className="mb-2">
                                        <Form.Label className="small text-white-50">
                                            Type
                                        </Form.Label>
                                        <Form.Select
                                            value={ans.answerTypeCd}
                                            onChange={(e) =>
                                                handleAnswerChange(
                                                    index,
                                                    'answerTypeCd',
                                                    e.target.value
                                                )
                                            }
                                            className="bg-dark text-white"
                                            disabled={isSubmitting}
                                        >
                                            {ANSWER_TYPE_LABELS.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>

                                    <Form.Group className="mb-2">
                                        <Form.Label className="small text-white-50">
                                            {ans.answerTypeCd === 'counter_question'
                                                ? 'Question to ask the objector'
                                                : 'Answer text'}
                                        </Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={ans.answerText}
                                            onChange={(e) =>
                                                handleAnswerChange(
                                                    index,
                                                    'answerText',
                                                    e.target.value
                                                )
                                            }
                                            className="bg-dark text-white"
                                            disabled={isSubmitting}
                                        />
                                    </Form.Group>

                                    {/* Source fields */}
                                    <Form.Group className="mb-2">
                                        <Form.Label className="small text-white-50">
                                            Source (book, author, etc.) — optional
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={ans.sourceText ?? ''}
                                            onChange={(e) =>
                                                handleAnswerChange(
                                                    index,
                                                    'sourceText',
                                                    e.target.value
                                                )
                                            }
                                            placeholder="e.g. Reasonable Faith by William Lane Craig, p. 42"
                                            className="bg-dark text-white"
                                            disabled={isSubmitting}
                                        />
                                    </Form.Group>

                                    <Form.Group>
                                        <Form.Label className="small text-white-50">
                                            Source URL — optional
                                        </Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type="url"
                                                value={ans.sourceUrl ?? ''}
                                                onChange={(e) =>
                                                    handleAnswerChange(
                                                        index,
                                                        'sourceUrl',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="https://..."
                                                className="bg-dark text-white"
                                                disabled={isSubmitting}
                                            />
                                        </InputGroup>
                                    </Form.Group>
                                </div>
                            ))}
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => onHide()}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!objectionText.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    className="me-2"
                                />
                                Saving...
                            </>
                        ) : objection?.objectionId ? (
                            'Save Changes'
                        ) : (
                            'Add Objection'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </>
    );
};

export default AddEditObjectionModal;
