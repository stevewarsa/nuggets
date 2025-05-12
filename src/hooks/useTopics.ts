import {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {setTopics, setTopicsLoading, setTopicsError} from '../store/topicSlice';
import {bibleService} from '../services/bible-service';
import {USER} from '../models/constants';

export const useTopics = () => {
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector(state => state.user.currentUser);
    const {topics, loading, error} = useAppSelector(state => state.topic);

    const user = currentUser || USER;

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

            fetchTopics();
        }
    }, [user, topics.length, loading, error, dispatch]);

    return {topics, loading, error};
};