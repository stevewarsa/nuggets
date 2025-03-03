import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Passage } from '../models/passage';

interface MemoryPassageState {
  passages: Passage[];
  loading: boolean;
  error: string | null;
  lastLoaded: number | null;
}

const initialState: MemoryPassageState = {
  passages: [],
  loading: false,
  error: null,
  lastLoaded: null
};

export const memoryPassageSlice = createSlice({
  name: 'memoryPassage',
  initialState,
  reducers: {
    setMemoryPassages: (state, action: PayloadAction<Passage[]>) => {
      state.passages = action.payload;
      state.loading = false;
      state.error = null;
      state.lastLoaded = Date.now();
    },
    setMemoryPassagesLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setMemoryPassagesError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearMemoryPassages: (state) => {
      state.passages = [];
      state.lastLoaded = null;
    }
  }
});

export const { 
  setMemoryPassages, 
  setMemoryPassagesLoading, 
  setMemoryPassagesError,
  clearMemoryPassages
} = memoryPassageSlice.actions;

export default memoryPassageSlice.reducer;