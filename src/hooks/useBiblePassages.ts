import {useEffect, useMemo, useState} from 'react';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {getBookName, getNextIndex, shuffleArray,} from '../models/passage-utils';
import {useAppSelector} from '../store/hooks';
import {useTopics} from "./useTopics.ts";
import {useNavigate} from 'react-router-dom';

export const useBiblePassages = () => {
    const {topics} = useTopics();
    const navigate = useNavigate();
    const [allPassages, setAllPassages] = useState<Passage[]>([]);
    const [passages, setPassages] = useState<Passage[]>([]);
    const [currentPassage, setCurrentPassage] = useState<Passage | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [translation, setTranslation] = useState<string>('niv');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showManageTopicsModal, setShowManageTopicsModal] = useState(false);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [topicsToAdd, setTopicsToAdd] = useState<number[]>([]);
    const [topicSearchTerm, setTopicSearchTerm] = useState('');
    const [showTopics, setShowTopics] = useState(false);
    const [isAddingTopics, setIsAddingTopics] = useState(false);

    const user = useAppSelector(state => state.user.currentUser);

    // Calculate topic counts from all passages
    const topicCounts = useMemo(() => {
        const counts: { [key: number]: number } = {};
        if (allPassages) {
            allPassages.forEach(passage => {
                if (passage.topics) {
                    passage.topics.forEach(topic => {
                        counts[topic.id] = (counts[topic.id] || 0) + 1;
                    });
                }
            });
        }
        return counts;
    }, [allPassages]);

    // Filter and sort topics for the filter modal
    const sortedTopics = useMemo(() => {
        return topics
            .filter(topic =>
                !topicSearchTerm.trim() ||
                topic.name.toLowerCase().includes(topicSearchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const countA = topicCounts[a.id] || 0;
                const countB = topicCounts[b.id] || 0;

                if (countB !== countA) {
                    return countB - countA; // Sort by count descending
                }
                return a.name.localeCompare(b.name); // Then alphabetically
            });
    }, [topics, topicCounts, topicSearchTerm]);

    // Filter topics based on search term and current passage's topics
    const availableTopics = useMemo(() => {
        return topics.filter(topic => {
            // Filter out topics already associated with the current passage
            const isNotAssociated = !currentPassage?.topics?.some(t => t.id === topic.id);

            // Apply search filter if there's a search term
            const matchesSearch = !topicSearchTerm.trim() ||
                topic.name.toLowerCase().includes(topicSearchTerm.toLowerCase());

            return isNotAssociated && matchesSearch;
        });
    }, [topics, currentPassage, topicSearchTerm]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response: Passage[] = await bibleService.getNuggetIdList(user);
                shuffleArray(response);
                setAllPassages(response);
                setPassages(response);

                // now make sure the current passage is initialized to display on the screen
                setCurrentPassage(response[0]);
            } catch (error) {
                console.error('Error fetching passage:', error);
            }
        };
        if (user) {
            fetchData();
        }
    }, [user]);

    const handleTopicFilterChange = (topicId: number) => {
        setSelectedTopicIds(prev => {
            if (prev.includes(topicId)) {
                return prev.filter(id => id !== topicId);
            } else {
                return [...prev, topicId];
            }
        });
    };

    const handleToolbarClick = (indicator: string) => {
        switch (indicator) {
            case 'LEFT':
                handlePrev();
                break;
            case 'RIGHT':
                handleNext();
                break;
        }
    };

    const handleNext = () => {
        if (passages && passages.length > 0) {
            const nextIndex = getNextIndex(currentIndex, passages.length, true);
            setCurrentIndex(nextIndex);
            setCurrentPassage(passages[nextIndex]);
        }
    };

    const handlePrev = () => {
        if (passages && passages.length > 0) {
            const prevIndex = getNextIndex(currentIndex, passages.length, false);
            setCurrentIndex(prevIndex);
            setCurrentPassage(passages[prevIndex]);
        }
    };

    const handleTranslationChange = (newTranslation: string) => {
        setTranslation(newTranslation);
        if (currentPassage) {
            // Clear verses to force a refresh with new translation
            setCurrentPassage({...currentPassage, verses: []});
        }
    };

    const handleAddTopics = async () => {
        if (!currentPassage || topicsToAdd.length === 0) return;

        setIsAddingTopics(true);
        try {
            const result = await bibleService.addPassageTopics(
                user,
                topicsToAdd,
                currentPassage.passageId
            );

            if (result === 'success') {
                // Get the full topic objects for the newly added topics
                const newTopics = topics.filter(topic => topicsToAdd.includes(topic.id));

                // Update current passage
                const updatedCurrentPassage = {
                    ...currentPassage,
                    topics: [...(currentPassage.topics || []), ...newTopics]
                };
                setCurrentPassage(updatedCurrentPassage);

                // Update passages and allPassages arrays
                const updatePassagesArray = (passageArray: Passage[]) => {
                    return passageArray.map(passage =>
                        passage.passageId === currentPassage.passageId
                            ? updatedCurrentPassage
                            : passage
                    );
                };

                setPassages(updatePassagesArray(passages));
                setAllPassages(updatePassagesArray(allPassages));

                // Reset state
                setTopicsToAdd([]);
                setShowManageTopicsModal(false);
            }
        } catch (error) {
            console.error('Error adding topics:', error);
        } finally {
            setIsAddingTopics(false);
        }
    };

    const handleTopicToAddChange = (topicId: number) => {
        setTopicsToAdd(prev => {
            if (prev.includes(topicId)) {
                return prev.filter(id => id !== topicId);
            } else {
                return [...prev, topicId];
            }
        });
    };

    const applyTopicFilter = (selectedTopicIds: number[]) => {
        if (selectedTopicIds.length === 0) {
            setPassages(allPassages);
            setCurrentIndex(0);
            setCurrentPassage(allPassages[0]);
        } else {
            const filteredPassages = allPassages.filter(passage =>
                passage.topics?.some(topic => selectedTopicIds.includes(topic.id))
            );
            setPassages(filteredPassages);
            setCurrentIndex(0);
            setCurrentPassage(filteredPassages[0] || null);
        }
        setShowFilterModal(false);
    };

    const clearTopicFilter = () => {
        setPassages(allPassages);
        setCurrentIndex(0);
        setCurrentPassage(allPassages[0]);
        setSelectedTopicIds([]);
        setShowFilterModal(false);
    };

    const viewInContext = () => {
        const readChapRoute = `/readBibleChapter/${translation}/${getBookName(currentPassage.bookId)}/${currentPassage.chapter}/${currentPassage.startVerse}`;
        console.log("useBiblePassages.viewInContext - navigating to route:", readChapRoute);
        navigate(readChapRoute);
    };

    return {
        state: {
            currentPassage,
            currentIndex,
            totalCount: passages.length,
            translation,
            allPassages,
            selectedTopicIds,
            showTopics,
            showFilterModal,
            showManageTopicsModal,
            topicSearchTerm,
            topics,
            sortedTopics,
            availableTopics,
            topicCounts,
            topicsToAdd,
            isAddingTopics
        },
        functions: {
            handleNext,
            handlePrev,
            handleToolbarClick,
            handleTranslationChange,
            applyTopicFilter,
            clearTopicFilter,
            setShowFilterModal,
            setShowManageTopicsModal,
            setShowTopics,
            setTopicSearchTerm,
            handleTopicFilterChange,
            handleTopicToAddChange,
            handleAddTopics,
            viewInContext
        },
    };
};