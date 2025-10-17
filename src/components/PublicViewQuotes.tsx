import React, {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {setUser} from '../store/userSlice';
import {GUEST_USER} from '../models/constants';
import ViewQuotes from './ViewQuotes';

const PublicViewQuotes: React.FC = () => {
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        // If no user is logged in, automatically log in as guest user
        if (!currentUser) {
            dispatch(setUser(GUEST_USER));
        }
    }, [currentUser, dispatch]);

    // Only render the ViewQuotes component once we have a user
    if (!currentUser) {
        return (
            <div className="text-center text-white mt-4">
                <p>Loading...</p>
            </div>
        );
    }

    return <ViewQuotes/>;
};

export default PublicViewQuotes;