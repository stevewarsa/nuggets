import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Quote} from '../models/quote';

interface QuoteState {
    quotes: Quote[];
    loading: boolean;
    error: string | null;
}

const initialState: QuoteState = {
    quotes: [],
    loading: false,
    error: null
};

export const quoteSlice = createSlice({
    name: 'quote',
    initialState,
    reducers: {
        setQuotes: (state, action: PayloadAction<Quote[]>) => {
            state.quotes = action.payload;
            state.loading = false;
            state.error = null;
        },
        setQuotesLoading: (state) => {
            state.loading = true;
            state.error = null;
        },
        setQuotesError: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        addQuote: (state, action: PayloadAction<Quote>) => {
            state.quotes.push(action.payload);
        }
    }
});

export const {setQuotes, setQuotesLoading, setQuotesError, addQuote} = quoteSlice.actions;

export default quoteSlice.reducer;