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
        // Fetch topics if they're not already in the store
        if (topics.length === 0 && !loading && !error) {
            const fetchTopics = async () => {
                try {
                    dispatch(setTopicsLoading());
                    const tagList = await bibleService.getTagList(user);
                    dispatch(setTopics(tagList));
                } catch (error) {
                    console.error('Error fetching topics:', error);
                    dispatch(setTopicsError('Failed to load topics'));
                }
            };
            if (user) {
                fetchTopics();
            }
        }
    }, [user, topics.length, loading, error, dispatch]);

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