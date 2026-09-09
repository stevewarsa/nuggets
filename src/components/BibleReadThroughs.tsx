import { Container, Card, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { bibleService } from '../services/bible-service';
import { DateUtils } from '../models/date-utils';
import { bookAbbrev, booksByDay } from '../models/constants';
import { ReadingHistoryEntry } from '../models/reading-history-entry';
import { computeReadThroughSummary, ReadThroughSummary, BookCycleDetail } from '../models/read-through-analytics';

const BibleReadThroughs: React.FC = () => {
    const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedReadThrough, setExpandedReadThrough] = useState<number | null>(null);
    const user = useAppSelector(state => state.user.currentUser);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const data = await bibleService.getAllReadingPlanProgress(user);
                setHistory(data);
            } catch (error) {
                console.error('Error fetching reading plan data:', error);
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    const summary: ReadThroughSummary | null = useMemo(() => {
        if (history.length === 0) return null;
        return computeReadThroughSummary(history);
    }, [history]);

    const getBookDisplayName = (bookName: string): string => {
        return bookAbbrev[bookName]?.[1] || bookName;
    };

    const daySectionNames: { [day: string]: string } = {
        'Sunday': 'Epistles',
        'Monday': 'Torah (Law)',
        'Tuesday': 'History',
        'Wednesday': 'Psalms',
        'Thursday': 'Wisdom',
        'Friday': 'Prophets & Revelation',
        'Saturday': 'Gospels & Acts',
    };

    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const renderBookDetails = (bookDetails: BookCycleDetail[]) => {
        return dayOrder.map(day => {
            const booksInDay = booksByDay[day];
            const sectionName = daySectionNames[day] || day;
            const sectionDetails = bookDetails.filter(bd => booksInDay.includes(bd.bookName));

            return (
                <div key={day} className="mb-2">
                    <div className="text-white-50 mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {sectionName}
                    </div>
                    <Row xs={1} sm={2} md={3} lg={4} className="g-1">
                        {sectionDetails.map(bd => (
                            <Col key={bd.bookName}>
                                <div className="border rounded p-1" style={{ borderColor: bd.completedDate ? '#198754' : '#444' }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span style={{ fontSize: '0.8rem' }}>{getBookDisplayName(bd.bookName)}</span>
                                        {bd.completedDate && (
                                            <Badge bg="success" pill style={{ fontSize: '0.6rem' }}>Done</Badge>
                                        )}
                                    </div>
                                    <div className="text-white-50" style={{ fontSize: '0.7rem' }}>
                                        {bd.startDate ? DateUtils.formatISODate(bd.startDate) : '—'}
                                        {bd.completedDate
                                            ? ` → ${DateUtils.formatISODate(bd.completedDate)}`
                                            : ' → in progress'}
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            );
        });
    };

    if (isLoading) {
        return (
            <Container className="py-4">
                <div className="text-white text-center">Loading read-through data...</div>
            </Container>
        );
    }

    if (!summary) {
        return (
            <Container className="py-4">
                <div className="text-white text-center">
                    <h2>Bible Read-Throughs</h2>
                    <p className="mt-3">No reading history yet. Start reading from the Reading Plan to track your progress!</p>
                </div>
            </Container>
        );
    }

    const inProgress = summary.inProgressReadThrough;
    const inProgressPercent = inProgress
        ? Math.round((inProgress.booksCompleted / inProgress.totalBooks) * 100)
        : 0;

    return (
        <Container className="py-4">
            <h2 className="text-white mb-4 text-center">Bible Read-Throughs</h2>

            {summary.completedReadThroughs.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-white mb-3">Completed Read-Throughs</h4>
                    {summary.completedReadThroughs.map(rt => {
                        const isExpanded = expandedReadThrough === rt.readThroughNumber;
                        return (
                            <Card bg="dark" text="white" className="mb-2" key={rt.readThroughNumber}>
                                <Card.Body>
                                    <div
                                        className="d-flex justify-content-between align-items-center"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setExpandedReadThrough(isExpanded ? null : rt.readThroughNumber)}
                                    >
                                        <div className="d-flex align-items-center">
                      <span className="me-2" style={{ fontSize: '0.8rem', color: '#888' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                                            <Badge bg="success" className="me-2">#{rt.readThroughNumber}</Badge>
                                            <span>{DateUtils.formatISODate(rt.startDate)} — {DateUtils.formatISODate(rt.endDate!)}</span>
                                        </div>
                                        <Badge bg="success">All 66 books complete</Badge>
                                    </div>
                                    {isExpanded && (
                                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #333' }}>
                                            {renderBookDetails(rt.bookDetails)}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        );
                    })}
                </div>
            )}

            {inProgress && (
                <Card bg="dark" text="white" className="mb-4 border-warning">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0 text-warning">
                                Read-Through #{inProgress.readThroughNumber} — In Progress
                            </h5>
                            <Badge bg="warning" text="dark">
                                {inProgress.booksCompleted} / {inProgress.totalBooks} books
                            </Badge>
                        </div>
                        <div className="text-white-50 mb-2">
                            Started {DateUtils.formatISODate(inProgress.startDate)}
                        </div>
                        <ProgressBar
                            now={inProgressPercent}
                            label={`${inProgressPercent}%`}
                            variant="warning"
                            style={{ height: '24px' }}
                        />
                        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #333' }}>
                            {renderBookDetails(inProgress.bookDetails)}
                        </div>
                    </Card.Body>
                </Card>
            )}

            {summary.completedReadThroughs.length === 0 && !inProgress && (
                <Card bg="dark" text="white" className="mb-4">
                    <Card.Body className="text-center">
                        No read-through data yet. Your progress will appear here once you start reading.
                    </Card.Body>
                </Card>
            )}

            <h4 className="text-white mb-3">Per-Book Progress</h4>
            {Object.keys(booksByDay).map(day => {
                const booksInDay = booksByDay[day];
                const sectionName = daySectionNames[day] || day;
                const sectionBooks = summary.perBookProgress.filter(bp =>
                    booksInDay.includes(bp.bookName)
                );
                const booksWithProgress = sectionBooks.filter(bp => bp.currentChapter > 0).length;

                return (
                    <Card bg="dark" text="white" className="mb-3" key={day}>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>{sectionName}</span>
                            <Badge bg="secondary">{booksWithProgress} / {booksInDay.length} started</Badge>
                        </Card.Header>
                        <Card.Body>
                            <Row xs={1} sm={2} md={3} lg={4} className="g-2">
                                {sectionBooks.map(bp => {
                                    const chapterPercent = bp.totalChapters > 0
                                        ? Math.round((bp.currentChapter / bp.totalChapters) * 100)
                                        : 0;
                                    const cycleCount = bp.cyclesCompleted;
                                    return (
                                        <Col key={bp.bookName}>
                                            <div className="border rounded p-2 h-100" style={{ borderColor: bp.completedInCurrentCycle ? '#198754' : '#444' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span style={{ fontSize: '0.85rem' }}>{getBookDisplayName(bp.bookName)}</span>
                                                    {bp.completedInCurrentCycle && (
                                                        <Badge bg="success" pill style={{ fontSize: '0.65rem' }}>Done</Badge>
                                                    )}
                                                    {cycleCount > 0 && (
                                                        <Badge bg="info" pill style={{ fontSize: '0.7rem' }}>
                                                            {cycleCount}x
                                                        </Badge>
                                                    )}
                                                </div>
                                                {bp.currentChapter > 0 ? (
                                                    <>
                                                        <div className="text-white-50 mb-1" style={{ fontSize: '0.75rem' }}>
                                                            Ch {bp.currentChapter} / {bp.totalChapters}
                                                        </div>
                                                        <ProgressBar
                                                            now={chapterPercent}
                                                            variant="primary"
                                                            style={{ height: '6px' }}
                                                        />
                                                    </>
                                                ) : (
                                                    <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                                                        Not yet started
                                                    </div>
                                                )}
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Card.Body>
                    </Card>
                );
            })}
        </Container>
    );
};

export default BibleReadThroughs;
