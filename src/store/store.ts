import {configureStore} from '@reduxjs/toolkit';
import userReducer from './userSlice';
import topicReducer from './topicSlice';
import memoryPassageReducer from './memoryPassageSlice';
import quoteReducer from './quoteSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        topic: topicReducer,
        memoryPassage: memoryPassageReducer,
        quote: quoteReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;