import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    Container,
    Spinner,
    Badge,
    Toast,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faArrowRight,
    faEye,
    faCheck,
    faGraduationCap,
    faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { bibleService } from '../services/bible-service';
import { useAppSelector } from '../store/hooks';
import { useToast } from '../hooks/useToast';
import {
    Objection,
    ObjectionAnswer,
    AnswerType,
    ANSWER_TYPE_LABELS,
    ANSWER_TYPE_ORDER,
} from '../models/objection';

const PracticeObjections: React.FC = () => {
    const navigate = useNavigate();
    const { showToast, toastProps, toastMessage } = useToast();
    const user = useAppSelector((state) => state.user.currentUser);

    const [objections, setObjections] = useState<Objection[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [revealedAnswerIndices, setRevealedAnswerIndices] = useState<Set<number>>(
        new Set()
    );
    const [isRecording, setIsRecording] = useState(false);

    const fetchObjections = async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const objs = await bibleService.getObjections(user, undefined, true, false);
            // Sort: least-recently-practiced first, never-practiced at top
            objs.sort((a, b) => {
                const aDate = a.lastPracticedDt || '';
                const bDate = b.lastPracticedDt || '';
                if (aDate < bDate) return -1;
                if (aDate > bDate) return 1;
                return 0;
            });
            setObjections(objs);
            if (objs.length > 0) setCurrentIndex(0);
        } catch (error) {
            console.error('Error fetching objections for practice:', error);
            showToast({ message: 'Error loading objections', variant: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchObjections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Reset revealed answers when navigating
    useEffect(() => {
        setRevealedAnswerIndices(new Set());
    }, [currentIndex]);

    const currentObjection = objections[currentIndex];

    const handleNext = () => {
        if (objections.length === 0) return;
        const newIndex = currentIndex + 1 >= objections.length ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const handlePrev = () => {
        if (objections.length === 0) return;
        const newIndex = currentIndex - 1 < 0 ? objections.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const handleRevealAnswer = (answerIndex: number) => {
        setRevealedAnswerIndices((prev) => new Set(prev).add(answerIndex));
    };

    const handleRevealAll = () => {
        if (!currentObjection?.answers) return;
        setRevealedAnswerIndices(
            new Set(currentObjection.answers.map((_, i) => i))
        );
    };

    const handleMarkPracticed = async () => {
        if (!currentObjection?.objectionId || !user) return;
        setIsRecording(true);
        try {
            const result = await bibleService.addObjectionPractice(
                user,
                currentObjection.objectionId
            );
            if (result !== -1) {
                // Update local state
                setObjections((prev) =>
                    prev.map((o, i) =>
                        i === currentIndex
                            ? { ...o, lastPracticedDt: new Date().toISOString() }
                            : o
                    )
                );
                showToast({ message: 'Practice recorded', variant: 'success' });
            } else {
                showToast({ message: 'Failed to record practice', variant: 'error' });
            }
        } catch (error) {
            console.error('Error recording practice:', error);
            showToast({ message: 'Error recording practice', variant: 'error' });
        } finally {
            setIsRecording(false);
        }
    };

    const getAnswerTypeLabel = (cd: AnswerType): string => {
        const found = ANSWER_TYPE_LABELS.find((t) => t.value === cd);
        return found ? found.label : cd;
    };

    // Sort answers by type order (short, detailed, counter_question)
    const getSortedAnswers = (answers?: ObjectionAnswer[]): ObjectionAnswer[] => {
        if (!answers) return [];
        return [...answers].sort((a, b) => {
            const aIdx = ANSWER_TYPE_ORDER.indexOf(a.answerTypeCd);
            const bIdx = ANSWER_TYPE_ORDER.indexOf(b.answerTypeCd);
            if (aIdx !== bIdx) return aIdx - bIdx;
            return a.sortOrder - b.sortOrder;
        });
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status" />
                <p className="mt-2">Loading practice session...</p>
            </Container>
        );
    }

    if (objections.length === 0) {
        return (
            <Container className="py-4 text-center text-white">
                <FontAwesomeIcon
                    icon={faGraduationCap}
                    size="3x"
                    className="text-white-50 mb-3"
                />
                <h4>No objections to practice</h4>
                <p className="text-white-50">
                    Add some objections first, then come back to practice.
                </p>
                <Button variant="primary" onClick={() => navigate('/objections')}>
                    Go to Objections
                </Button>
            </Container>
        );
    }

    const sortedAnswers = getSortedAnswers(currentObjection?.answers);
    const allRevealed =
        sortedAnswers.length > 0 && revealedAnswerIndices.size === sortedAnswers.length;

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                    <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => navigate('/objections')}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                        Back
                    </Button>
                    <h4 className="text-white mb-0">Practice Objections</h4>
                </div>
                <Badge bg="dark" className="border border-secondary">
                    {currentIndex + 1} / {objections.length}
                </Badge>
            </div>

            {/* Objection card */}
            <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                    <Badge bg="info" className="me-2">
                        {currentObjection?.categoryName}
                    </Badge>
                    <span className="text-white-50 small">Objection</span>
                </Card.Header>
                <Card.Body>
                    <div className="mb-2">
                        <blockquote className="blockquote">
                            <p className="text-white mb-0" style={{ fontSize: '1.15rem' }}>
                                "{currentObjection?.objectionText}"
                            </p>
                        </blockquote>
                    </div>
                </Card.Body>
            </Card>

            {/* Answers reveal section */}
            <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="text-white-50 mb-0">
                        Answers ({sortedAnswers.length})
                    </h5>
                    {!allRevealed && sortedAnswers.length > 0 && (
                        <Button
                            variant="outline-info"
                            size="sm"
                            onClick={handleRevealAll}
                        >
                            <FontAwesomeIcon icon={faEye} className="me-1" />
                            Reveal All
                        </Button>
                    )}
                </div>

                {sortedAnswers.length === 0 ? (
                    <p className="text-white-50">
                        No answers have been added for this objection yet.
                    </p>
                ) : (
                    sortedAnswers.map((ans, i) => {
                        const isRevealed = revealedAnswerIndices.has(i);
                        return (
                            <Card
                                key={i}
                                bg="dark"
                                text="white"
                                className="mb-2 border-secondary"
                            >
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <Badge bg="secondary">
                                        {getAnswerTypeLabel(ans.answerTypeCd)}
                                    </Badge>
                                    {!isRevealed && (
                                        <Button
                                            variant="outline-light"
                                            size="sm"
                                            onClick={() => handleRevealAnswer(i)}
                                        >
                                            <FontAwesomeIcon icon={faEye} className="me-1" />
                                            Reveal
                                        </Button>
                                    )}
                                </Card.Header>
                                {isRevealed && (
                                    <Card.Body>
                                        <p className="text-white mb-2">
                                            {ans.answerText}
                                        </p>
                                        {(ans.sourceText || ans.sourceUrl) && (
                                            <div className="text-white-50 fst-italic small border-top border-secondary pt-2">
                                                {ans.sourceText && (
                                                    <span>Source: {ans.sourceText}</span>
                                                )}
                                                {ans.sourceUrl && (
                                                    <a
                                                        href={ans.sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ms-2 text-info"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faExternalLinkAlt}
                                                            className="me-1"
                                                            size="sm"
                                                        />
                                                        Open link
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </Card.Body>
                                )}
                                {!isRevealed && (
                                    <Card.Body>
                                        <div
                                            className="text-white-50"
                                            style={{
                                                filter: 'blur(4px)',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {ans.answerText.slice(0, 80)}
                                            {ans.answerText.length > 80 ? '...' : ''}
                                        </div>
                                    </Card.Body>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Navigation controls */}
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <div className="d-flex gap-2">
                    <Button variant="outline-light" onClick={handlePrev}>
                        <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                        Prev
                    </Button>
                    <Button variant="outline-light" onClick={handleNext}>
                        Next
                        <FontAwesomeIcon icon={faArrowRight} className="ms-1" />
                    </Button>
                </div>
                <Button
                    variant="success"
                    onClick={handleMarkPracticed}
                    disabled={isRecording}
                >
                    {isRecording ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                className="me-2"
                            />
                            Recording...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faCheck} className="me-2" />
                            Mark as Practiced
                        </>
                    )}
                </Button>
            </div>

            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default PracticeObjections;
