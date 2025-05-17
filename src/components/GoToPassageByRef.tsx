import {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {Button, Col, Container, Form, ListGroup, Row} from "react-bootstrap";
import {bookAbbrev, TRANSLATION} from "../models/constants";
import {getPassageFromPassageRef} from "../models/passage-utils";
import {Passage} from "../models/passage";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {bibleService, ChapterInfo} from "../services/bible-service";
import {setMaxVerseByBookChapter} from "../store/memoryPassageSlice";

const GoToPassageByRef = () => {
    const navigate = useNavigate();
    const dispatcher = useAppDispatch();
    const [passageRef, setPassageRef] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [maxChaptersByBook, setMaxChaptersByBook] = useState<ChapterInfo[]>([]);
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
                    const chapters = await bibleService.getMaxChaptersByBook();
                    setMaxChaptersByBook(chapters);
                    const bookInfo = chapters.find(chapter => chapter.bookName === exactMatch[0]);
                    if (bookInfo) {
                        console.log('Setting selected book:', exactMatch[0]);
                        newSuggestions = Array.from({length: bookInfo.maxChapter}, (_, i) => (`${exactMatch[1][1]} ${i + 1}:`));
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
                    const bookInfo = maxChaptersByBook.find(b => b.bookName === bookMatch[0]);
                    if (bookInfo) {
                        console.log('Setting selected book from chapter match:', bookMatch[0]);
                        newSuggestions = Array.from(
                            {length: bookInfo.maxChapter},
                            (_, i) => i + 1
                        )
                            .filter(num => num.toString().startsWith(chapterPart))
                            .map(num => (`${bookMatch[1][1]} ${num}:`));
                    }
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

                        const locMaxVerseByBookChapter = maxVerseByBookChapterMap[TRANSLATION];
                        const maxChapVerseForBook = locMaxVerseByBookChapter[bookKey];
                        const maxVerseData = maxChapVerseForBook.find((chapAndVerse: number[]) => chapAndVerse[0] === chapterNum);
                        const maxVerse = maxVerseData ? maxVerseData[1] : 0;

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassageRef(e.target.value);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setPassageRef(suggestion);
    };

    const handleGoToPassage = () => {
        console.log('Bible Reference:', passageRef);
        const passagesFromPassageRef: Passage[] = getPassageFromPassageRef(passageRef.trim());
        if (passagesFromPassageRef.length > 0) {
            console.log("GoToPassageByRef.handleGoToPassage - Setting the first passage parsed:", passagesFromPassageRef[0]);
            navigate(`/readBibleChapter/${TRANSLATION}/${passagesFromPassageRef[0].bookName}/${passagesFromPassageRef[0].chapter}/${passagesFromPassageRef[0].startVerse}`);
        } else {
            console.log("GoToPassageByRef.handleGoToPassage - no passages parsed from passageRef: " + passageRef.trim());
        }
    };

    return (
        <Container>
            <Row>
                <Col>
                    <div className="position-relative">
                        <Form.Control
                            type="text"
                            placeholder="Type a Bible reference (e.g., John 3:16)"
                            value={passageRef}
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
                                        {suggestion}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        )}
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleGoToPassage}
                    >
                        Go To Passage
                    </Button>
                </Col>
            </Row>
        </Container>
    );
};

export default GoToPassageByRef;