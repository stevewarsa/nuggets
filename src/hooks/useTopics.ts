import {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {setTopics, setTopicsLoading, setTopicsError} from '../store/topicSlice';
import {bibleService} from '../services/bible-service';

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

    return {topics, loading, error};
};