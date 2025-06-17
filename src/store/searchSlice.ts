import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Quote} from '../models/quote';

interface SearchState {
    searchResults: Quote[];
    searchTerm: string;
    hasSearchResults: boolean;
}

const initialState: SearchState = {
    searchResults: [],
    searchTerm: '',
    hasSearchResults: false
};

export const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        setSearchResults: (state, action: PayloadAction<{ quotes: Quote[], searchTerm: string }>) => {
            state.searchResults = action.payload.quotes;
            state.searchTerm = action.payload.searchTerm;
            state.hasSearchResults = true;
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
            state.searchTerm = '';
            state.hasSearchResults = false;
        }
    }
});

export const {setSearchResults, clearSearchResults} = searchSlice.actions;

export default searchSlice.reducer;