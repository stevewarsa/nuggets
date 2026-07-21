import {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {setTopics, setTopicsLoading, setTopicsError} from '../store/topicSlice';
import {bibleService} from '../services/bible-service';
import {Topic} from '../models/topic';

export const useTopics = () => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.user.currentUser);
    const {topics, loading, error} = useAppSelector(state => state.topic);


    useEffect(() => {
        // If no user is logged in, or we are already actively loading or have an error, stop immediately
        if (!user || loading || error) {
            return;
        }

        // CRITICAL FIX: Only fetch if topics are empty AND we haven't checked yet.
        // To prevent the 0-length trap, we use a local session flag or look at the loading lifecycle state.
        // If topics.length is 0 but we want to fetch, we make sure it only triggers ONCE when the user switches.
        const fetchTopics = async () => {
            try {
                dispatch(setTopicsLoading());
                const tagList = await bibleService.getTagList(user);
                dispatch(setTopics(tagList ?? []));
            } catch (error) {
                console.error('Error fetching topics:', error);
                dispatch(setTopicsError('Failed to load topics'));
            }
        };

        // Check an internal state trace or enforce single loading invocation per user session
        if (topics.length === 0) {
            fetchTopics();
        }
    }, [user, dispatch]); // <-- REMOVED topics.length from dependencies!


    const addNewTopicAndAssociate = async (topicName: string, quoteId: number): Promise<{
        success: boolean,
        error?: string,
        newTopic?: Topic
    }> => {
        try {
            // First, create the new topic
            const createResult = await bibleService.addNewTopic(user, topicName);

            if (createResult.topicId === -1 || createResult.message !== 'success') {
                return {success: false, error: 'Failed to create new topic'};
            }

            // Create the new topic object
            const newTopic: Topic = {
                id: createResult.topicId,
                name: topicName
            };

            // Add the new topic to the Redux store
            dispatch(setTopics([...topics, newTopic]));

            // Associate the new topic with the quote
            const associateResult = await bibleService.addQuoteTopic(user, quoteId, [newTopic]);

            if (associateResult.message !== 'success') {
                return {success: false, error: 'Failed to associate topic with quote', newTopic};
            }

            return {success: true, newTopic};
        } catch (error) {
            console.error('Error adding new topic and associating with quote:', error);
            return {success: false, error: 'An error occurred while creating the topic'};
        }
    };

    return {topics, loading, error, addNewTopicAndAssociate};
};