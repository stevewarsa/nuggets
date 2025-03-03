import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Topic } from '../models/topic';

interface TopicState {
  topics: Topic[];
  loading: boolean;
  error: string | null;
}

const initialState: TopicState = {
  topics: [],
  loading: false,
  error: null
};

export const topicSlice = createSlice({
  name: 'topic',
  initialState,
  reducers: {
    setTopics: (state, action: PayloadAction<Topic[]>) => {
      state.topics = action.payload;
      state.loading = false;
      state.error = null;
    },
    setTopicsLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setTopicsError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    }
  }
});

export const { setTopics, setTopicsLoading, setTopicsError } = topicSlice.actions;

export default topicSlice.reducer;