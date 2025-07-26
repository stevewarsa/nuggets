import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Quote } from '../models/quote';

interface QuoteState {
    quotes: Quote[];
    loading: boolean;
    error: string | null;
    hasBeenLoaded: boolean;
}

const initialState: QuoteState = {
    quotes: [],
    loading: false,
    error: null,
    hasBeenLoaded: false
};

export const quoteSlice = createSlice({
    name: 'quote',
    initialState,
    reducers: {
        setQuotes: (state, action: PayloadAction<Quote[]>) => {
            state.quotes = action.payload;
            state.loading = false;
            state.error = null;
            state.hasBeenLoaded = true;
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
            // Only add to the array if quotes have been loaded
            // Otherwise, the quote will be included when quotes are eventually loaded
            if (state.hasBeenLoaded) {
                state.quotes.push(action.payload);
            }
        }
    }
});

export const { setQuotes, setQuotesLoading, setQuotesError, addQuote } = quoteSlice.actions;

export default quoteSlice.reducer;