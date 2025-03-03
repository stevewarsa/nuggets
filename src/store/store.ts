import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import topicReducer from './topicSlice';
import memoryPassageReducer from './memoryPassageSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    topic: topicReducer,
    memoryPassage: memoryPassageReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;