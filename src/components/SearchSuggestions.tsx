import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dictionaryCache } from '../services/dictionary-cache';

interface SearchSuggestionsProps {
    searchPhrase: string;
    onSearchPhraseChange: (value: string) => void;
    translation: string;
    section: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

const DEBOUNCE_MS = 200;
const MIN_WORD_LENGTH = 2;
const MAX_SUGGESTIONS = 10;

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
                                                                 searchPhrase,
                                                                 onSearchPhraseChange,
                                                                 translation,
                                                                 section,
                                                                 inputRef,
                                                             }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract the current word being typed (the one after the last space)
    const getCurrentWord = useCallback((phrase: string): string => {
        const words = phrase.split(' ');
        return words[words.length - 1] || '';
    }, []);

    // Recompute suggestions when the search phrase changes (debounced)
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        const currentWord = getCurrentWord(searchPhrase);

        if (currentWord.length < MIN_WORD_LENGTH || currentWord.includes('*')) {
            setSuggestions([]);
            setShowDropdown(false);
            setHighlightedIndex(-1);
            return;
        }

        debounceTimer.current = setTimeout(() => {
            const words = dictionaryCache.getSuggestions(
                currentWord,
                translation,
                section,
                MAX_SUGGESTIONS
            );
            setSuggestions(words);
            setShowDropdown(words.length > 0);
            setHighlightedIndex(-1);
        }, DEBOUNCE_MS);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [searchPhrase, translation, section, getCurrentWord]);

    // Accept a suggestion: replace the current word in the search phrase
    const acceptSuggestion = useCallback(
        (word: string) => {
            const words = searchPhrase.split(' ');
            words[words.length - 1] = word;
            const newPhrase = words.join(' ');
            onSearchPhraseChange(newPhrase + ' ');
            setShowDropdown(false);
            setHighlightedIndex(-1);
            inputRef.current?.focus();
        },
        [searchPhrase, onSearchPhraseChange, inputRef]
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset highlighted index when suggestions change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [suggestions]);

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (!showDropdown || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < suggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : suggestions.length - 1
            );
        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            acceptSuggestion(suggestions[highlightedIndex]);
        } else if (e.key === 'Tab' && highlightedIndex >= 0) {
            e.preventDefault();
            acceptSuggestion(suggestions[highlightedIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowDropdown(false);
            setHighlightedIndex(-1);
        }
    };

    if (!showDropdown || suggestions.length === 0) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="suggestions-dropdown"
            onKeyDown={handleKeyDown}
        >
            {suggestions.map((word, index) => (
                <div
                    key={word}
                    className={`suggestion-item${
                        index === highlightedIndex ? ' suggestion-item-highlighted' : ''
                    }`}
                    onClick={() => acceptSuggestion(word)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                >
                    {word}
                </div>
            ))}
        </div>
    );
};

export default SearchSuggestions;
