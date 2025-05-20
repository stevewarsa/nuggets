import {useState, useEffect} from 'react';
import {
    bookAbbrev,
    getMaxChapterByBook,
    getMaxVerse,
    TRANSLATION
} from '../models/constants';

export const useSuggestions = (passageRef: string) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const getSuggestions = () => {
            if (!passageRef.trim()) {
                setSuggestions([]);
                return;
            }
            let newSuggestions: string[] = [];

            const parts = passageRef.trim().split(/[\s:]/);
            const lastPart = parts[parts.length - 1].toLowerCase();

            // Book suggestions
            if (parts.length === 1 && !passageRef.includes(':')) {
                // Check if we have an exact book match
                const exactMatch = Object.entries(bookAbbrev).find(([key, [abbrev, fullName]]) =>
                    key === lastPart ||
                    abbrev.toLowerCase() === lastPart ||
                    fullName.toLowerCase() === lastPart
                );

                if (exactMatch) {
                    // If we have an exact match, show all chapters for this book
                    const maxChapter: number = getMaxChapterByBook(exactMatch[0]);
                    console.log('Setting selected book:', exactMatch[0]);
                    newSuggestions = Array.from({length: maxChapter}, (_, i) => (`${exactMatch[1][1]} ${i + 1}:`));
                } else {
                    // If no exact match, show matching book suggestions
                    newSuggestions = Object.entries(bookAbbrev)
                        .filter(([key, [abbrev, fullName]]) => {
                            const searchTerm = lastPart.toLowerCase();
                            return (
                                key.toLowerCase().startsWith(searchTerm) ||
                                abbrev.toLowerCase().startsWith(searchTerm) ||
                                fullName.toLowerCase().startsWith(searchTerm)
                            );
                        })
                        .map(([, [, fullName]]) => (fullName));
                }
            }

            // Handle book and chapter without colon
            else if (parts.length === 2 && !passageRef.includes(':')) {
                const [bookPart, chapterPart] = parts;
                const bookMatch = Object.entries(bookAbbrev).find(
                    ([, [, fullName]]) => fullName.toLowerCase() === bookPart.toLowerCase()
                );

                if (bookMatch && /^\d*$/.test(chapterPart)) {
                    console.log('Setting selected book from chapter match:', bookMatch[0]);
                    const maxChapter: number = getMaxChapterByBook(bookMatch[0]);
                    newSuggestions = Array.from(
                        {length: maxChapter},
                        (_, i) => i + 1
                    )
                        .filter(num => num.toString().startsWith(chapterPart))
                        .map(num => (`${bookMatch[1][1]} ${num}:`));
                }
            }

            // Chapter and verse suggestions
            else if (passageRef.includes(':')) {
                const [bookChapter, verse] = passageRef.split(':');
                const [book, chapter] = bookChapter.trim().split(/\s+/);

                if (book && chapter) {
                    const bookKey = Object.entries(bookAbbrev)
                        .find(([, [, fullName]]) => fullName.toLowerCase() === book.toLowerCase())?.[0];

                    if (bookKey) {
                        const chapterNum = parseInt(chapter);
                        console.log('Setting selected book and chapter:', bookKey, chapterNum);
                        const maxVerse: number = getMaxVerse(TRANSLATION, bookKey, chapterNum);
                        newSuggestions = Array.from(
                            {length: maxVerse},
                            (_, i) => i + 1
                        )
                            .map(num => (`${book} ${chapter}:${num}`))
                            // Filter verses based on user input after the colon
                            .filter(suggestion => {
                                if (!verse) return true;
                                const verseNum = suggestion.split(':')[1];
                                return verseNum.startsWith(verse);
                            });
                    }
                }
            }

            // If there's exactly one suggestion and it matches the input exactly,
            // clear the suggestions
            if (newSuggestions.length === 1 && newSuggestions[0] === passageRef) {
                setSuggestions([]);
            } else {
                setSuggestions(newSuggestions);
            }
        };

        getSuggestions();
    }, [passageRef]);

    return suggestions;
};