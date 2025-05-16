import {useState, useEffect} from "react";
import {bookAbbrev, TRANSLATION} from "../models/constants";
import {Form, ListGroup} from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import {useAppDispatch, useAppSelector} from "../store/hooks.ts";
import {bibleService, ChapterInfo} from "../services/bible-service.ts";
import {setMaxVerseByBookChapter} from "../store/memoryPassageSlice.ts";
import {useNavigate} from "react-router-dom";

interface Suggestion {
    text: string;
    type: 'book' | 'chapter' | 'verse';
}

interface BibleReferenceInputProps {
    userEnteredValue: string;
    onChange: (value: string) => void;
}

export const BibleReferenceInput: React.FC<BibleReferenceInputProps> = ({userEnteredValue, onChange}) => {
    const navigate = useNavigate();
    const dispatcher = useAppDispatch();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [maxChaptersByBook, setMaxChaptersByBook] = useState<ChapterInfo[]>([]);
    const [selectedBook, setSelectedBook] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    let maxVerseByBookChapterMap = useAppSelector(state => state.memoryPassage.maxVerseByBookChapter);

    useEffect(() => {
        if (!maxVerseByBookChapterMap?.hasOwnProperty(TRANSLATION)) {
            (async () => {
                console.log('Fetching max verses for translation:', TRANSLATION);
                const locMaxVerseByBookChapter = await bibleService.getMaxVersesByBookChapter(TRANSLATION);
                dispatcher(setMaxVerseByBookChapter({
                    maxVerseByBookChapter: locMaxVerseByBookChapter,
                    translation: TRANSLATION
                }));
            })();
        }
    }, [maxVerseByBookChapterMap]);

    useEffect(() => {
        const getSuggestions = async () => {
            if (!userEnteredValue.trim()) {
                setSuggestions([]);
                setSelectedBook(null);
                setSelectedChapter(null);
                return;
            }

            let newSuggestions: Suggestion[] = [];

            const parts = userEnteredValue.trim().split(/[\s:]/);
            const lastPart = parts[parts.length - 1].toLowerCase();

            // Book suggestions
            if (parts.length === 1 && !userEnteredValue.includes(':')) {
                // Check if we have an exact book match
                const exactMatch = Object.entries(bookAbbrev).find(([key, [abbrev, fullName]]) =>
                    key === lastPart ||
                    abbrev.toLowerCase() === lastPart ||
                    fullName.toLowerCase() === lastPart
                );

                if (exactMatch) {
                    // If we have an exact match, show all chapters for this book
                    const chapters = await bibleService.getMaxChaptersByBook();
                    setMaxChaptersByBook(chapters);
                    const bookInfo = chapters.find(chapter => chapter.bookName === exactMatch[0]);
                    if (bookInfo) {
                        console.log('Setting selected book:', exactMatch[0]);
                        setSelectedBook(exactMatch[0]);
                        newSuggestions = Array.from(
                            {length: bookInfo.maxChapter},
                            (_, i) => ({
                                text: `${exactMatch[1][1]} ${i + 1}:`,
                                type: 'chapter' as const
                            })
                        );
                    }
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
                        .map(([, [, fullName]]) => ({
                            text: fullName,
                            type: 'book' as const
                        }));
                }
            }

            // Handle book and chapter without colon
            else if (parts.length === 2 && !userEnteredValue.includes(':')) {
                const [bookPart, chapterPart] = parts;
                const bookMatch = Object.entries(bookAbbrev).find(
                    ([, [, fullName]]) => fullName.toLowerCase() === bookPart.toLowerCase()
                );

                if (bookMatch && /^\d*$/.test(chapterPart)) {
                    const bookInfo = maxChaptersByBook.find(b => b.bookName === bookMatch[0]);
                    if (bookInfo) {
                        console.log('Setting selected book from chapter match:', bookMatch[0]);
                        setSelectedBook(bookMatch[0]);
                        newSuggestions = Array.from(
                            {length: bookInfo.maxChapter},
                            (_, i) => i + 1
                        )
                            .filter(num => num.toString().startsWith(chapterPart))
                            .map(num => ({
                                text: `${bookMatch[1][1]} ${num}:`,
                                type: 'chapter' as const
                            }));
                    }
                }
            }

            // Chapter and verse suggestions
            else if (userEnteredValue.includes(':')) {
                const [bookChapter, verse] = userEnteredValue.split(':');
                const [book, chapter] = bookChapter.trim().split(/\s+/);

                if (book && chapter) {
                    const bookKey = Object.entries(bookAbbrev)
                        .find(([, [, fullName]]) => fullName.toLowerCase() === book.toLowerCase())?.[0];

                    if (bookKey) {
                        const chapterNum = parseInt(chapter);
                        console.log('Setting selected book and chapter:', bookKey, chapterNum);
                        setSelectedBook(bookKey);
                        setSelectedChapter(chapterNum);

                        const locMaxVerseByBookChapter = maxVerseByBookChapterMap[TRANSLATION];
                        const maxChapVerseForBook = locMaxVerseByBookChapter[bookKey];
                        const maxVerseData = maxChapVerseForBook.find((chapAndVerse: number[]) => chapAndVerse[0] === chapterNum);
                        const maxVerse = maxVerseData ? maxVerseData[1] : 0;

                        newSuggestions = Array.from(
                            {length: maxVerse},
                            (_, i) => i + 1
                        )
                            .map(num => ({
                                text: `${book} ${chapter}:${num}`,
                                type: 'verse' as const
                            }))
                            // Filter verses based on user input after the colon
                            .filter(suggestion => {
                                if (!verse) return true;
                                const verseNum = suggestion.text.split(':')[1];
                                return verseNum.startsWith(verse);
                            });
                    }
                }
            }

            // If there's exactly one suggestion and it matches the input exactly,
            // clear the suggestions
            if (newSuggestions.length === 1 && newSuggestions[0].text === userEnteredValue) {
                setSuggestions([]);
            } else {
                setSuggestions(newSuggestions);
            }
        };

        getSuggestions();
    }, [userEnteredValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        onChange(suggestion.text);
    };

    // Get available verses for the selected book and chapter
    const getAvailableVerses = () => {
        if (!selectedBook || !selectedChapter || !maxVerseByBookChapterMap[TRANSLATION]) {
            console.log('Cannot get verses - missing data:', {
                selectedBook,
                selectedChapter,
                hasMaxVerseMap: !!maxVerseByBookChapterMap[TRANSLATION]
            });
            return [];
        }

        const maxChapVerseForBook = maxVerseByBookChapterMap[TRANSLATION][selectedBook];
        if (!maxChapVerseForBook) {
            console.log('No max verse data for book:', selectedBook);
            return [];
        }

        const maxVerseData = maxChapVerseForBook.find((chapAndVerse: number[]) => chapAndVerse[0] === selectedChapter);
        if (!maxVerseData) {
            console.log('No verse data for chapter:', selectedChapter);
            return [];
        }

        const maxVerse = maxVerseData[1];
        const bookFullName = bookAbbrev[selectedBook][1];

        console.log('Generated verses for:', {
            book: selectedBook,
            chapter: selectedChapter,
            maxVerse
        });

        return Array.from(
            {length: maxVerse},
            (_, i) => ({
                text: `${bookFullName} ${selectedChapter}:${i + 1}`,
                type: 'verse' as const
            })
        );
    };

    const handleVerseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;
        console.log('Verse selected:', selectedValue);

        if (selectedValue && selectedBook && selectedChapter) {
            console.log('Navigation data:', {
                selectedBook,
                selectedChapter,
                selectedValue
            });

            // Parse the verse number from the selected text
            const verseNumber = parseInt(selectedValue.split(':')[1]);
            console.log('Parsed verse number:', verseNumber);

            // Update the input value
            onChange(selectedValue);

            // Build the navigation URL
            const navigationUrl = `/readBibleChapter/${TRANSLATION}/${selectedBook}/${selectedChapter}/${verseNumber}`;
            console.log('Navigating to:', navigationUrl);

            // Navigate immediately
            navigate(navigationUrl);
        } else {
            console.log('Missing required data for navigation:', {
                hasSelectedValue: !!selectedValue,
                selectedBook,
                selectedChapter
            });
        }
    };

    const availableVerses = getAvailableVerses();

    return (
        <div className="position-relative">
            <Form.Control
                type="text"
                placeholder="Type a Bible reference (e.g., John 3:16)"
                value={userEnteredValue}
                onChange={handleInputChange}
                className="mb-2"
            />
            {suggestions.length > 0 && (
                <ListGroup className="position-absolute w-100 shadow-sm" style={{zIndex: 1000}}>
                    {suggestions.map((suggestion, index) => (
                        <ListGroup.Item
                            key={index}
                            action
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="cursor-pointer"
                        >
                            {suggestion.text}
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
            {selectedBook && selectedChapter && availableVerses.length > 0 && !userEnteredValue.includes(':') && (
                <Form.Select
                    className="mt-2"
                    onChange={handleVerseSelect}
                    value=""
                >
                    <option value="">Select a verse...</option>
                    {availableVerses.map((verse, index) => (
                        <option key={index} value={verse.text}>
                            {verse.text}
                        </option>
                    ))}
                </Form.Select>
            )}
        </div>
    );
};