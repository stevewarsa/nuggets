import React, {useState, useEffect, useMemo} from 'react';
import {Container, Spinner, Collapse, Button, Pagination, Modal, Badge} from 'react-bootstrap';
import {useAppSelector} from '../store/hooks';
import {bibleService} from '../services/bible-service';
import {Prayer, PrayerSession} from '../models/prayer';
import {format, parse} from 'date-fns';

const ITEMS_PER_PAGE = 5;
const MAX_VISIBLE_PAGES = 5;

const ViewPrayerHistory: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadingSeconds, setLoadingSeconds] = useState(0);
    const [sessions, setSessions] = useState<PrayerSession[]>([]);
    const [prayers, setPrayers] = useState<Prayer[]>([]);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [expandedPrayerIds, setExpandedPrayerIds] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [detailPrayer, setDetailPrayer] = useState<Prayer | null>(null);

    const user = useAppSelector(state => state.user.currentUser);

    const prayerMap = useMemo(() => {
        const map = new Map<number, Prayer>();
        prayers.forEach(p => {
            if (p.prayerId) map.set(p.prayerId, p);
        });
        return map;
    }, [prayers]);

    const groupedHistory = useMemo(() => {
        const groupedMap = new Map<string, PrayerSession[]>();
        sessions.forEach(session => {
            const date = new Date(session.dateTime);
            const dateKey = format(date, 'MM/dd/yyyy');
            if (!groupedMap.has(dateKey)) {
                groupedMap.set(dateKey, []);
            }
            groupedMap.get(dateKey)!.push(session);
        });
        return Array.from(groupedMap.entries())
            .map(([date, daySessions]) => ({
                date,
                count: daySessions.length,
                sessions: daySessions.sort((a, b) =>
                    new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
                ),
            }))
            .sort((a, b) => {
                const dateA = parse(a.date, 'MM/dd/yyyy', new Date());
                const dateB = parse(b.date, 'MM/dd/yyyy', new Date());
                return dateB.getTime() - dateA.getTime();
            });
    }, [sessions]);

    const totalPages = Math.ceil(groupedHistory.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPageData = groupedHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    useEffect(() => {
        let loadingInterval: NodeJS.Timeout;
        const fetchData = async () => {
            try {
                setIsLoading(true);
                loadingInterval = setInterval(() => {
                    setLoadingSeconds(s => s + 1);
                }, 1000);
                const [allPrayers, allSessions] = await Promise.all([
                    bibleService.getAllPrayers(user),
                    bibleService.getAllPrayerSessions(user),
                ]);
                setPrayers(allPrayers);
                setSessions(allSessions);
            } catch (error) {
                console.error('Error fetching prayer history:', error);
            } finally {
                clearInterval(loadingInterval);
                setIsLoading(false);
                setLoadingSeconds(0);
            }
        };
        if (user) fetchData();
        return () => {
            if (loadingInterval) clearInterval(loadingInterval);
        };
    }, [user]);

    const toggleDay = (date: string) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) newSet.delete(date);
            else newSet.add(date);
            return newSet;
        });
    };

    const togglePrayerExpansion = (prayerId: number) => {
        setExpandedPrayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(prayerId)) newSet.delete(prayerId);
            else newSet.add(prayerId);
            return newSet;
        });
    };

    const getDayOfWeek = (dateStr: string) => {
        const date = parse(dateStr, 'MM/dd/yyyy', new Date());
        return format(date, 'EEEE');
    };

    const getTimeFromDateTime = (dateTime: string) => {
        const date = new Date(dateTime);
        return format(date, 'hh:mm:ss aa');
    };

    const getPrayerTitle = (prayerId: number) => {
        const prayer = prayerMap.get(prayerId);
        return prayer?.prayerTitleTx || `Prayer #${prayerId}`;
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const items = [];
        items.push(
            <Pagination.First key="first" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}/>
        );
        items.push(
            <Pagination.Prev key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}/>
        );
        let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
        let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);
        if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
            startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
        }
        if (startPage > 1) items.push(<Pagination.Ellipsis key="ellipsis-start" disabled/>);
        for (let number = startPage; number <= endPage; number++) {
            items.push(
                <Pagination.Item key={number} active={number === currentPage} onClick={() => setCurrentPage(number)}>
                    {number}
                </Pagination.Item>
            );
        }
        if (endPage < totalPages) items.push(<Pagination.Ellipsis key="ellipsis-end" disabled/>);
        items.push(
            <Pagination.Next key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}/>
        );
        items.push(
            <Pagination.Last key="last" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}/>
        );
        return (
            <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 mb-4">
                <Pagination className="mb-0">{items}</Pagination>
                <span className="text-white">Page {currentPage} of {totalPages}</span>
            </div>
        );
    };

    const renderPrayerDetailModal = () => {
        if (!detailPrayer) return null;
        const prayer = detailPrayer;
        return (
            <Modal show={!!detailPrayer} onHide={() => setDetailPrayer(null)} centered size="lg">
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Prayer Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <div className="mb-2">
                        <span className="text-info" style={{fontSize: '0.8rem'}}>ID:</span>{' '}
                        <span className="text-white-50" style={{fontSize: '0.8rem'}}>{prayer.prayerId}</span>
                    </div>
                    <div className="mb-3">
                        <span className="text-info" style={{fontSize: '0.8rem'}}>Title:</span>
                        <div className="text-white">{prayer.prayerTitleTx}</div>
                    </div>
                    <div className="mb-3">
                        <span className="text-info" style={{fontSize: '0.8rem'}}>Details:</span>
                        <div className="text-white" style={{whiteSpace: 'pre-wrap'}}>{prayer.prayerDetailsTx}</div>
                    </div>
                    <div className="mb-2">
                        <span className="text-info" style={{fontSize: '0.8rem'}}>Pray for:</span>{' '}
                        <span className="text-white">{prayer.prayerSubjectPersonName}</span>
                    </div>
                    <div className="mb-2 d-flex align-items-center gap-2">
                        <span className="text-info" style={{fontSize: '0.8rem'}}>Priority:</span>
                        {prayer.prayerPriorityCd === 'daily' ? (
                            <Badge bg="primary">Daily</Badge>
                        ) : (
                            <span className="text-white">{prayer.prayerPriorityCd}</span>
                        )}
                    </div>
                    <div className="mb-2">
                        <span className="text-info" style={{fontSize: '0.8rem'}}>Archived:</span>{' '}
                        <span className="text-white">{prayer.archiveFl === 'Y' ? 'Yes' : 'No'}</span>
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-dark">
                    <Button variant="secondary" onClick={() => setDetailPrayer(null)}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status" className="me-2"/>
                <span>Loading prayer history... ({loadingSeconds} seconds)</span>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Prayer History</h1>
            {groupedHistory.length === 0 ? (
                <p className="text-white text-center">No prayer history available.</p>
            ) : (
                <>
                    <div className="mb-4">
                        {currentPageData.map(({date, count, sessions: daySessions}) => (
                            <div key={date} className="mb-3">
                                <Button
                                    variant="link"
                                    onClick={() => toggleDay(date)}
                                    className="text-white text-decoration-none w-100 text-start"
                                >
                                    <span className="me-2">{expandedDays.has(date) ? '▼' : '▶'}</span>
                                    Day: {getDayOfWeek(date)}, {date} ({count})
                                </Button>
                                <Collapse in={expandedDays.has(date)}>
                                    <div className="ms-4">
                                        <ul className="text-white list-unstyled mb-0">
                                            {daySessions.map((session, index) => {
                                                const prayer = prayerMap.get(session.prayerId);
                                                const isExpanded = prayer?.prayerId && expandedPrayerIds.has(prayer.prayerId);
                                                return (
                                                    <li key={index} className="mb-2">
                                                        <div className="d-flex align-items-start gap-2">
                                                            <span style={{fontSize: '0.75rem', color: '#888', minWidth: '80px'}}>
                                                                {getTimeFromDateTime(session.dateTime)}
                                                            </span>
                                                            <div className="flex-grow-1" style={{minWidth: 0}}>
                                                                <div
                                                                    style={{cursor: 'pointer'}}
                                                                    onClick={() => prayer?.prayerId && togglePrayerExpansion(prayer.prayerId)}
                                                                >
                                                                    <span className="me-1" style={{fontSize: '0.7rem'}}>
                                                                        {isExpanded ? '▼' : '▶'}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            display: 'inline-block',
                                                                            maxWidth: '250px',
                                                                            verticalAlign: 'bottom',
                                                                        }}
                                                                    >
                                                                        {getPrayerTitle(session.prayerId)}
                                                                    </span>
                                                                </div>
                                                                <Collapse in={!!isExpanded}>
                                                                    <div className="ms-3 mt-1" style={{fontSize: '0.85rem'}}>
                                                                        {prayer ? (
                                                                            <>
                                                                                <div className="mb-1">
                                                                                    <span className="text-info">Pray for: </span>
                                                                                    <span>{prayer.prayerSubjectPersonName}</span>
                                                                                </div>
                                                                                <div
                                                                                    className="mb-1 text-white-50"
                                                                                    style={{
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis',
                                                                                        display: '-webkit-box',
                                                                                        WebkitLineClamp: 2,
                                                                                        WebkitBoxOrient: 'vertical',
                                                                                    }}
                                                                                >
                                                                                    {prayer.prayerDetailsTx}
                                                                                </div>
                                                                                <div className="d-flex gap-2 flex-wrap">
                                                                                    {prayer.prayerPriorityCd === 'daily' && (
                                                                                        <Badge bg="primary" style={{fontSize: '0.65rem'}}>Daily</Badge>
                                                                                    )}
                                                                                    {prayer.archiveFl === 'Y' && (
                                                                                        <Badge bg="warning" text="dark" style={{fontSize: '0.65rem'}}>Archived</Badge>
                                                                                    )}
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline-light"
                                                                                        style={{fontSize: '0.7rem', padding: '1px 8px'}}
                                                                                        onClick={() => setDetailPrayer(prayer)}
                                                                                    >
                                                                                        View Full Details
                                                                                    </Button>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-muted">Prayer data not available</span>
                                                                        )}
                                                                        {session.prayerNoteTx && (
                                                                            <div className="mt-1 text-white-50" style={{fontSize: '0.8rem'}}>
                                                                                <span className="text-muted">Note: </span>{session.prayerNoteTx}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Collapse>
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </Collapse>
                            </div>
                        ))}
                    </div>
                    {renderPagination()}
                </>
            )}
            {renderPrayerDetailModal()}
        </Container>
    );
};

export default ViewPrayerHistory;
