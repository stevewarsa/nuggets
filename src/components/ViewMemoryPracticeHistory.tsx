import React, {useState, useEffect} from 'react';
import {Container, Spinner, Collapse, Button, Pagination} from 'react-bootstrap';
import {useAppSelector, useAppDispatch} from '../store/hooks';
import {bibleService} from '../services/bible-service';
import {setMemoryPassages, setMemoryPassagesLoading} from '../store/memoryPassageSlice';
import {MemoryPracticeHistoryEntry, GroupedHistoryEntry} from '../models/memory-practice-history';
import {getDisplayBookName} from '../models/passage-utils';
import {format, parse} from 'date-fns';

const ITEMS_PER_PAGE = 5;
const MAX_VISIBLE_PAGES = 5; // Number of page numbers to show at once

const ViewMemoryPracticeHistory: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadingSeconds, setLoadingSeconds] = useState(0);
    const [groupedHistory, setGroupedHistory] = useState<GroupedHistoryEntry[]>([]);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);

    const user = useAppSelector(state => state.user.currentUser);
    const {passages, loading: passagesLoading} = useAppSelector(state => state.memoryPassage);
    const dispatch = useAppDispatch();

    // Calculate pagination values
    const totalPages = Math.ceil(groupedHistory.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPageData = groupedHistory.slice(startIndex, endIndex);

    useEffect(() => {
        let loadingInterval: NodeJS.Timeout;

        const fetchData = async () => {
            try {
                setIsLoading(true);
                loadingInterval = setInterval(() => {
                    setLoadingSeconds(s => s + 1);
                }, 1000);

                // Fetch memory passages if not already in Redux store
                if (passages.length === 0 && !passagesLoading) {
                    dispatch(setMemoryPassagesLoading());
                    const memoryPassages = await bibleService.getMemoryPassageList(user);
                    dispatch(setMemoryPassages(memoryPassages));
                }

                // Fetch practice history
                const historyEntries = await bibleService.getMemoryPracticeHistory(user);

                // Group entries by date
                const grouped = groupHistoryByDate(historyEntries);
                setGroupedHistory(grouped);
            } catch (error) {
                console.error('Error fetching memory practice history:', error);
            } finally {
                clearInterval(loadingInterval);
                setIsLoading(false);
                setLoadingSeconds(0);
            }
        };

        if (user) {
            fetchData();
        }

        return () => {
            if (loadingInterval) {
                clearInterval(loadingInterval);
            }
        };
    }, [user, passages.length, passagesLoading, dispatch]);

    const groupHistoryByDate = (entries: MemoryPracticeHistoryEntry[]): GroupedHistoryEntry[] => {
        const groupedMap = new Map<string, MemoryPracticeHistoryEntry[]>();

        entries.forEach(entry => {
            // Use dateViewedLong (timestamp) to create a local date object
            const date = new Date(+entry.dateViewedLong);
            const dateKey = format(date, 'MM/dd/yyyy');

            if (!groupedMap.has(dateKey)) {
                groupedMap.set(dateKey, []);
            }
            groupedMap.get(dateKey)!.push(entry);
        });

        // Convert map to array and sort by date descending
        return Array.from(groupedMap.entries())
            .map(([date, entries]) => ({
                date,
                count: entries.length,
                entries: entries.sort((a, b) => b.dateViewedLong - a.dateViewedLong)
            }))
            .sort((a, b) => {
                const dateA = parse(a.date, 'MM/dd/yyyy', new Date());
                const dateB = parse(b.date, 'MM/dd/yyyy', new Date());
                return dateB.getTime() - dateA.getTime();
            });
    };

    const toggleDay = (date: string) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) {
                newSet.delete(date);
            } else {
                newSet.add(date);
            }
            return newSet;
        });
    };

    const getPassageReference = (passageId: number) => {
        const passage = passages.find(p => p.passageId === passageId);
        if (!passage) return 'Unknown Passage';

        const bookName = getDisplayBookName(passage.bookId);
        const baseRef = `${bookName} ${passage.chapter}:${passage.startVerse}`;

        if (passage.endVerse !== passage.startVerse) {
            return `${baseRef}-${passage.endVerse}${passage.passageRefAppendLetter || ''}`;
        }
        return `${baseRef}${passage.passageRefAppendLetter || ''}`;
    };

    const getTimeFromDateLong = (dateLong: number) => {
        const date = new Date(+dateLong);
        return format(date, 'hh:mm:ss aa');
    };

    const getDayOfWeek = (dateStr: string) => {
        const date = parse(dateStr, 'MM/dd/yyyy', new Date());
        return format(date, 'EEEE');
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const items = [];

        // First page
        items.push(
            <Pagination.First
                key="first"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
            />
        );

        // Previous page
        items.push(
            <Pagination.Prev
                key="prev"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            />
        );

        // Calculate visible page range
        let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
        let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
            startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
        }

        // Add ellipsis at start if needed
        if (startPage > 1) {
            items.push(<Pagination.Ellipsis key="ellipsis-start" disabled/>);
        }

        // Add page numbers
        for (let number = startPage; number <= endPage; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === currentPage}
                    onClick={() => setCurrentPage(number)}
                >
                    {number}
                </Pagination.Item>
            );
        }

        // Add ellipsis at end if needed
        if (endPage < totalPages) {
            items.push(<Pagination.Ellipsis key="ellipsis-end" disabled/>);
        }

        // Next page
        items.push(
            <Pagination.Next
                key="next"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            />
        );

        // Last page
        items.push(
            <Pagination.Last
                key="last"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
            />
        );

        return (
            <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 mb-4">
                <Pagination className="mb-0">{items}</Pagination>
                <span className="text-white">
          Page {currentPage} of {totalPages}
        </span>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status" className="me-2"/>
                <span>Loading memory practice history... ({loadingSeconds} seconds)</span>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Memory Practice History</h1>

            {groupedHistory.length === 0 ? (
                <p className="text-white text-center">No practice history available.</p>
            ) : (
                <>
                    <div className="mb-4">
                        {currentPageData.map(({date, count, entries}) => (
                            <div key={date} className="mb-3">
                                <Button
                                    variant="link"
                                    onClick={() => toggleDay(date)}
                                    className="text-white text-decoration-none w-100 text-start"
                                >
                  <span className="me-2">
                    {expandedDays.has(date) ? '▼' : '▶'}
                  </span>
                                    Day: {getDayOfWeek(date)}, {date} ({count})
                                </Button>

                                <Collapse in={expandedDays.has(date)}>
                                    <div className="ms-4">
                                        <ol className="text-white">
                                            {entries.map((entry, index) => (
                                                <li key={`${entry.passageId}-${index}`} className="mb-2">
                                                    {getPassageReference(entry.passageId)} ({getTimeFromDateLong(entry.dateViewedLong)})
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </Collapse>
                            </div>
                        ))}
                    </div>

                    {renderPagination()}
                </>
            )}
        </Container>
    );
};

export default ViewMemoryPracticeHistory;