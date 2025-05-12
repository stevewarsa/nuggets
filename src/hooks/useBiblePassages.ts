import {useState, useEffect} from 'react';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {
    getNextIndex,
    shuffleArray,
} from '../models/passage-utils';
import {USER} from '../models/constants';
import {useAppSelector} from '../store/hooks';

export const useBiblePassages = () => {
    const [allPassages, setAllPassages] = useState<Passage[]>([]);
    const [passages, setPassages] = useState<Passage[]>([]);
    const [currentPassage, setCurrentPassage] = useState<Passage | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [translation, setTranslation] = useState<string>('niv');

    const currentUser = useAppSelector(state => state.user.currentUser);
    const user = currentUser || USER;

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

        fetchData();
    }, [user]);

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
    };

    const clearTopicFilter = () => {
        setPassages(allPassages);
        setCurrentIndex(0);
        setCurrentPassage(allPassages[0]);
    };

    return {
        state: {
            currentPassage,
            currentIndex,
            totalCount: passages.length,
            translation,
        },
        functions: {
            handleNext,
            handlePrev,
            handleToolbarClick,
            handleTranslationChange,
            applyTopicFilter,
            clearTopicFilter,
        },
    };
};