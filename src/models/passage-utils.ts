import {
    faCopy,
    faExternalLink,
    faFilter,
    faListOl,
    faPencilAlt,
    faSearch,
    faTags,
} from '@fortawesome/free-solid-svg-icons';
import {StringUtils} from './string.utils';
import {bookAbbrev, booksByNum, getMaxChapterByBook, getMaxVerse, TRANSLATION} from './constants';
import {Passage} from './passage';

export const RAND: string = 'rand';
export const BY_FREQ: string = 'by_freq';
export const INTERLEAVE: string = 'interleave';
export const BY_LAST_PRACTICED: string = 'by_last_practiced_time';
export const BY_REF: string = 'by_ref';
export const BY_PSG_TXT: string = 'by_psgtxt';

const EXACT_BOOK_MATCH = 1;
const PARTIAL_BOOK_MATCH = 2;
const BOOK_MATCH_PLUS = 3;

export const EDIT_MEM_PASSAGE = {
    itemLabel: 'Edit Mem Passage...',
    icon: faPencilAlt,
};
export const ADD_TO_MEMORY_VERSES = {
    itemLabel: 'Add to Memory Verses...',
    icon: faListOl,
};
export const ADD_TO_NUGGETS = {
    itemLabel: 'Add to Nuggets...',
    icon: faListOl,
};
export const COPY_VERSE_RANGE = {
    itemLabel: 'Copy Verse Range...',
    icon: faCopy,
};
export const OPEN_IN_BIBLEHUB = {
    itemLabel: 'Open in Bible Hub...',
    icon: faExternalLink,
};
export const OPEN_INTERLINEAR = {
    itemLabel: 'Interlinear View...',
    icon: faExternalLink,
};
export const EDIT_QUOTE = {
    itemLabel: 'Edit Quote...',
    icon: faPencilAlt,
};
export const MANAGE_TOPICS = {
    itemLabel: 'Manage Topics...',
    icon: faTags,
};
export const FILTER_BY_TOPIC = {
    itemLabel: 'Filter by Topic...',
    icon: faFilter,
};
export const SEARCH_QUOTES = {
    itemLabel: 'Search Quotes...',
    icon: faSearch,
};

export const getNextBook = (
    currentBook: string,
    direction: 'next' | 'previous'
): string | null => {
    const bookIds = Object.keys(booksByNum);
    const currentBookId = Object.entries(booksByNum).find(
        ([_, name]) => name === currentBook
    )?.[0];

    if (!currentBookId) return null;

    const currentIndex = bookIds.indexOf(currentBookId);
    let nextIndex;

    if (direction === 'next') {
        nextIndex = currentIndex + 1;
        if (nextIndex >= bookIds.length) {
            // If at Revelation, wrap to Genesis
            return 'genesis';
        }
    } else {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
            // If at Genesis, wrap to Revelation
            return 'revelation';
        }
    }

    const nextBookId = bookIds[nextIndex];
    return booksByNum[nextBookId as unknown as keyof typeof booksByNum];
};

export const sortAccordingToPracticeConfig = (
    order: string,
    arr: Passage[]
): Passage[] => {
    let sortedArr = [...arr]; // Create a copy to avoid mutating the original array

    if (order === RAND) {
        shuffleArray(sortedArr);
    } else if (order === BY_FREQ) {
        sortedArr.sort((a: Passage, b: Passage) => {
            return a.frequencyDays - b.frequencyDays;
        });

        sortedArr = sortWithinFrequencyGroups(sortedArr);
    } else if (order === BY_LAST_PRACTICED) {
        sortedArr.sort((a: Passage, b: Passage) => {
            return a.last_viewed_num - b.last_viewed_num;
        });
    } else if (order === INTERLEAVE) {
        sortedArr = sortWithinFrequencyGroups(sortedArr);
        // in this case, we want to take passages from boxes 1-2 and mix them into box 3 passages
        const frequencyGroups: { [freq: number]: Passage[] } =
            getFrequencyGroups(sortedArr);
        if (frequencyGroups['3'].length >= 20) {
            console.log('frequencyGroups: ', frequencyGroups);
            const box3 = sortWithinFrequencyGroups([...frequencyGroups['3']]);
            const box2 = sortWithinFrequencyGroups([...frequencyGroups['2']]);
            const box1 = sortWithinFrequencyGroups([...frequencyGroups['1']]);
            const boxes1Thru2 = [box1, box2];
            // interleave the boxes 1-2 into this box
            for (let i = 0; i < box3.length; i++) {
                // first interleave box 1 passages in until exhausted, then box 2 until exhausted, then 3, etc
                // we want to add the lower box elements either as the first element or every other elements thereafter
                if (i === 0 || i % 2 === 0) {
                    // go through boxes 1-2 and try to get (and remove) the first element of that box and add
                    // it to box 3 at the current index.  If successful, then break out of the inner loop
                    for (let box of boxes1Thru2) {
                        // shift() returns and removes the first element of an array if the contained anything.
                        // otherwise, it returns undefined
                        let lowerBoxElement = box.shift();
                        // if we returned the first element, add it into box 3 at the current index, then
                        // increment the index counter so we advance past the newly added element
                        if (lowerBoxElement) {
                            box3.splice(i, 0, lowerBoxElement);
                            i++;
                            break;
                        }
                    }
                }
            }
            // at this point, all the lower box elements should've been interleaved into box 3 and box3's length
            // should be equal to the size of the whole list of passages
            if (box3.length > frequencyGroups['3'].length) {
                // changes were made because box 3 length is greater than it was originally
                console.log(
                    'Since box 3 has ' +
                    box3.length +
                    ' passages, which is greater than its original size (' +
                    frequencyGroups['3'].length +
                    '), tempPassages, which has ' +
                    sortedArr.length +
                    ', is being replaced with box 3'
                );
                sortedArr = box3;
            } else {
                console.log(
                    'No changes were made to box 3 - it still has ' +
                    box3.length +
                    ' passages.'
                );
            }
        } else {
            sortedArr = sortWithinFrequencyGroups(sortedArr);
        }
    }
    return sortedArr;
};

export const sortWithinFrequencyGroups = (
    passages: Passage[],
    order = BY_LAST_PRACTICED
): Passage[] => {
    let frequencyGroups: { [freq: number]: Passage[] } =
        getFrequencyGroups(passages);
    // now, iterate through the frequency groups and randomize each group
    // and append that group to the return array
    let returnPassageArray: Passage[] = [];
    let numFrequencies: number[] = Object.keys(frequencyGroups)
        .map((f) => parseInt(f))
        .sort((a: number, b: number) => {
            return a - b;
        });
    for (let numFreq of numFrequencies) {
        let passagesForFrequency: Passage[] = frequencyGroups[numFreq + ''];
        if (order === RAND) {
            // randomize this group...
            passagesForFrequency.sort(() => Math.random() - 0.5);
        } else if (order === BY_LAST_PRACTICED) {
            passagesForFrequency.sort(
                (a, b) => a.last_viewed_num - b.last_viewed_num
            );
        }
        // now append to the return array
        returnPassageArray = returnPassageArray.concat(passagesForFrequency);
    }
    return returnPassageArray;
};

export const getFrequencyGroups = (
    passages: Passage[]
): { [key: number]: Passage[] } => {
    const frequencyGroups: { [key: number]: Passage[] } = {};

    // Group passages by frequency
    for (const passage of passages) {
        const freq = passage.frequencyDays;
        if (!frequencyGroups[freq]) {
            frequencyGroups[freq] = [];
        }
        frequencyGroups[freq].push(passage);
    }

    // Ensure groups 1-3 exist
    for (let i = 1; i <= 3; i++) {
        if (!frequencyGroups[i]) {
            frequencyGroups[i] = [];
        }
    }

    return frequencyGroups;
};

export const handleCopyVerseRange = async (
    startVerse: number,
    endVerse: number,
    psg: Passage
) => {
    if (!psg || !psg.verses) return;

    const selectedVerses = psg.verses.filter((verse) => {
        const verseNum = verse.verseParts[0].verseNumber;
        return verseNum >= startVerse && verseNum <= endVerse;
    });

    if (selectedVerses.length === 0) return;

    const reference = `${getDisplayBookName(psg.bookId)} ${
        psg.chapter
    }:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ''}`;

    let verseText = '';
    selectedVerses.forEach((verse) => {
        verse.verseParts.forEach((part) => {
            verseText += part.verseText + ' ';
        });
    });

    const textToCopy = `${reference}\n\n${verseText.trim()}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        return true;
    } catch (err) {
        console.error('Failed to copy text:', err);
        return false;
    }
};

export const getPassageReference = (
    currentPassage: Passage,
    shortBook: boolean = true
) => {
    if (!currentPassage) return '';
    const bookName = getDisplayBookName(currentPassage.bookId, shortBook);
    const baseRef = `${bookName} ${currentPassage.chapter}:${currentPassage.startVerse}`;
    if (currentPassage.endVerse !== currentPassage.startVerse) {
        return `${baseRef}-${currentPassage.endVerse}${
            currentPassage.passageRefAppendLetter || ''
        }`;
    }
    return `${baseRef}${currentPassage.passageRefAppendLetter || ''}`;
};

export const getBookName = (bookId: number) => {
    const matchingRec = Object.keys(booksByNum).filter((bookNum) => {
        return parseInt(bookNum) === bookId;
    });
    return matchingRec.map((bookNum: any) => booksByNum[bookNum])[0];
};

export const getDisplayBookName = (
    bookId: number,
    shortBook: boolean = true
): string => {
    const basicName: string = getBookName(bookId);
    return basicName ? bookAbbrev[basicName][shortBook ? 0 : 1] : 'Unknown Book';
};

export const shuffleArray = (arr: any[]) => {
    for (let i: number = arr.length - 1; i >= 0; i--) {
        let randomIndex: number = Math.floor(Math.random() * (i + 1));
        let itemAtIndex: number = arr[randomIndex];
        arr[randomIndex] = arr[i];
        arr[i] = itemAtIndex;
    }
};

export const getNextIndex = (
    currentIndex: number,
    numberOfPassages: number,
    next: boolean
): number => {
    let newIndex: number;
    if (next) {
        if (currentIndex === numberOfPassages - 1) {
            newIndex = 0;
        } else {
            newIndex = currentIndex + 1;
        }
    } else {
        if (currentIndex === 0) {
            newIndex = numberOfPassages - 1;
        } else {
            newIndex = currentIndex - 1;
        }
    }
    return newIndex;
};

export const getUnformattedPassageTextNoVerseNumbers = (
    passage: Passage
): string => {
    let verseLen = passage.verses.length;
    let verseText = '';
    for (let i = 0; i < verseLen; i++) {
        let versePartLen = passage.verses[i].verseParts.length;
        for (let j = 0; j < versePartLen; j++) {
            verseText += passage.verses[i].verseParts[j].verseText + ' ';
        }
    }
    return verseText;
};
export const openInterlinearLink = (passage: Passage) => {
    let urlQuery: string;
    if (passage.startVerse === passage.endVerse) {
        urlQuery =
            passage.bookName +
            '+' +
            passage.chapter +
            ':' +
            passage.startVerse +
            '&t=nas';
    } else {
        urlQuery =
            passage.bookName +
            '+' +
            passage.chapter +
            ':' +
            passage.startVerse +
            '-' +
            passage.endVerse +
            '&t=nas';
    }
    window.open(
        'https://www.biblestudytools.com/interlinear-bible/passage/?q=' + urlQuery,
        '_blank'
    );
};
export const openBibleHubLink = (passage: Passage) => {
    // https://biblehub.com/genesis/1-1.htm
    const replacements: {} = {
        '1-kings': '1_kings',
        '2-kings': '2_kings',
        '1-samuel': '1_samuel',
        '2-samuel': '2_samuel',
        '1-chronicles': '1_chronicles',
        '2-chronicles': '2_chronicles',
        '1-peter': '1_peter',
        '2-peter': '2_peter',
        '1-john': '1_john',
        '2-john': '2_john',
        '3-john': '3_john',
        'song-of-solomon': 'songs',
        '1-timothy': '1_timothy',
        '2-timothy': '2_timothy',
        '1-thessalonians': '1_thessalonians',
        '2-thessalonians': '2_thessalonians',
        '1-corinthians': '1_corinthians',
        '2-corinthians': '2_corinthians',
    };
    const bibleHubBookName: string = replacements.hasOwnProperty(passage.bookName)
        ? replacements[passage.bookName]
        : passage.bookName;
    let urlQuery: string =
        bibleHubBookName +
        '/' +
        passage.chapter +
        '-' +
        passage.startVerse +
        '.htm';
    window.open('https://biblehub.com/' + urlQuery, '_blank');
};

export const getExactBookNameMatch = (searchTerm: string) => {
    const trimmedSearchTerm = searchTerm ? searchTerm.trim() : undefined;
    if (!trimmedSearchTerm || trimmedSearchTerm.includes(':')) {
        return undefined;
    }
    const exactMatch = Object.entries(bookAbbrev).find(([key, [abbrev, fullName]]) =>
        key === trimmedSearchTerm.toLowerCase() ||
        abbrev.toLowerCase() === trimmedSearchTerm.toLowerCase() ||
        fullName.toLowerCase() === trimmedSearchTerm.toLowerCase()
    );
    if (exactMatch) {
        return exactMatch;
    } else {
        return undefined;
    }
};

export const getMatchingBookNameContains = (searchTerm: string) => {
    const trimmedSearchTerm = searchTerm ? searchTerm.trim() : undefined;
    if (!trimmedSearchTerm || trimmedSearchTerm.includes(':')) {
        return undefined;
    }
    const matches = Object.entries(bookAbbrev).filter(([key, [abbrev, fullName]]) =>
        key.includes(trimmedSearchTerm.toLowerCase()) ||
        abbrev.toLowerCase().includes(trimmedSearchTerm.toLowerCase()) ||
        fullName.toLowerCase().includes(trimmedSearchTerm.toLowerCase())
    );
    if (matches) {
        return matches;
    } else {
        return undefined;
    }
};

const isInteger = (str: string): boolean => {
    return /^-?\d+$/.test(str);
}

export const getNewSuggestions = (passageRef: string, selectedMatch: boolean=false) => {
    const trimmedSearchTerm = passageRef ? passageRef.trim() : undefined;
    if (!trimmedSearchTerm) {
        return [];
    }

    if (trimmedSearchTerm.includes(":")) {
        const [bookChapter, verse] = trimmedSearchTerm.split(":");
        const parts = bookChapter.trim().split(/\s+/);
        const chapter = parts[parts.length - 1].toLowerCase();
        const fullBookName = parts.join(" ").replace(chapter, "").trim();
        const exactMatch = getExactBookNameMatch(fullBookName);
        const fullPassageRef = exactMatch && isInteger(chapter) && isInteger(verse);
        if (fullPassageRef && selectedMatch) {
            return undefined;
        }
        const bookKey = exactMatch[0];
        const maxVerse = getMaxVerse(TRANSLATION, bookKey, parseInt(chapter));
        const newSuggestions = Array.from({length: maxVerse}, (_, i) => i + 1)
            .map(num => (`${fullBookName} ${chapter}:${num}`))
            // Filter verses based on user input after the colon
            .filter(suggestion => {
                if (!verse) {
                    return true;
                }
                const verseNum = suggestion.split(':')[1];
                return verseNum.startsWith(verse);
            });
        // If there's exactly one suggestion and it matches
        //  the input exactly, clear the suggestions
        if (newSuggestions.length === 1 && newSuggestions[0] === passageRef) {
            return undefined;
        } else {
            return newSuggestions;
        }
    }

    // now check for book and chapter, but no verse
    const parts = trimmedSearchTerm.split(/[\s:]/);
    if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].toLowerCase();
        if (isInteger(lastPart)) {
            const bookWithoutChapter = parts.join(" ").replace(lastPart, "");
            const exactMatch = getExactBookNameMatch(bookWithoutChapter);
            const bookName = exactMatch[0];
            const fullBookName = exactMatch[1][1];
            const chapter = parseInt(lastPart);
            const maxVerse = getMaxVerse(TRANSLATION, bookName, chapter);
            let suggestions: string[] = [];
            for (let i = 1; i <= maxVerse; i++) {
                suggestions.push(fullBookName + " " + chapter + ":" + i);
            }
            return suggestions;
        }
    }

    const exactMatch = getExactBookNameMatch(passageRef);
    if (exactMatch) {
        const maxChapter: number = getMaxChapterByBook(exactMatch[0]);
        return Array.from({length: maxChapter}, (_, i) => (`${exactMatch[1][1]} ${i + 1}`));
    }

    const fuzzyBookNameMatches = getMatchingBookNameContains(passageRef);
    if (fuzzyBookNameMatches?.length > 0) {
        return fuzzyBookNameMatches.map(([, [, fullName]]) => (fullName));
    }
    return [];
};

export const getSuggestions = (passageRef: string): string[] => {
    if (!passageRef.trim()) {
        return [];
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
        return [];
    } else {
        return newSuggestions;
    }
};

export const getPassageFromPassageRef = (passageRef: string): Passage[] => {
    passageRef = passageRef.trim().toLowerCase();
    const matchingPassages: Passage[] = [];
    for (let bookNm in bookAbbrev) {
        const fullBookNm: string = bookAbbrev[bookNm][1];

        // Exactly equal
        if (passageRef === fullBookNm.toLowerCase()) {
            matchingPassages.push(
                handleMatch(bookNm, EXACT_BOOK_MATCH, passageRef, fullBookNm)
            );
            continue;
        }
        // Passage reference contains one of the book names
        if (passageRef.startsWith(fullBookNm.toLowerCase())) {
            matchingPassages.push(
                handleMatch(bookNm, BOOK_MATCH_PLUS, passageRef, fullBookNm)
            );
            continue;
        }
        // the Passage reference passed in is a partial match to one of the book names
        if (fullBookNm.toLowerCase().includes(passageRef)) {
            matchingPassages.push(
                handleMatch(bookNm, PARTIAL_BOOK_MATCH, passageRef, fullBookNm)
            );
            // implicit continue
        }
    }
    return matchingPassages;
};

const handleMatch = (
    bookNm: string,
    matchType: number,
    passageRef: string,
    fullBookNm: string
): Passage => {
    let passage = {} as Passage;
    passage.chapter = 1;
    passage.startVerse = 1;
    passage.endVerse = 1;
    passage.bookName = bookNm;
    passage.bookId = getBookId(bookNm);
    if (matchType === BOOK_MATCH_PLUS) {
        handleBookMatchPlus(passageRef, fullBookNm, passage);
    }
    return passage;
};

export const updateAllMatches = (find: string, str: string) => {
    if (StringUtils.isEmpty(find) || StringUtils.isEmpty(str)) {
        return str;
    }
    const findWords = find.split(' ');
    let locString = str;
    for (let findWord of findWords) {
        let stringToHighlight = findWord.replace('*', '(.*?)');
        //console.log("PassageUtils.updateAllMatches - Here is the regex wildcard: '" + stringToHighlight + "'");
        if (stringToHighlight === '') {
            continue;
        }
        let regex: RegExp = new RegExp(stringToHighlight, 'ig');
        locString = locString.replace(
            regex,
            "<span class='search_result'>$&</span>"
        );
    }
    return locString;
};

export const getBookId = (bookKey: string): number => {
    let keys: any[] = Object.keys(booksByNum);
    for (let key of keys) {
        const iKey = parseInt(key);
        let book: string = booksByNum[iKey];
        if (bookKey === book) {
            return iKey;
        }
    }
    return -1;
};

export const handleBookMatchPlus = (
    passageRef: string,
    fullBookNm: string,
    passage: Passage
) => {
    // assume that what is after the book is a chapter and possibly more
    let chapter = passageRef.substring(fullBookNm.length + 1, passageRef.length);
    if (chapter.includes(':')) {
        // assume that they're trying to specify a verse or a verse range
        let chapterParts = chapter.split(':');
        if (!isNaN(Number(chapterParts[0]))) {
            // assume that what is after the book name is a chapter
            passage.chapter = parseInt(chapterParts[0]);
        }
        if (chapter.includes('-')) {
            // this is a verse range
            let verseRange = chapterParts[1].split('-');
            if (!isNaN(Number(verseRange[0]))) {
                passage.startVerse = parseInt(verseRange[0]);
            }
            if (!isNaN(Number(verseRange[1])) && verseRange[1] !== '') {
                passage.endVerse = parseInt(verseRange[1]);
            } else {
                passage.endVerse = passage.startVerse;
            }
        } else {
            // this is only 1 verse
            if (!isNaN(Number(chapterParts[1])) && chapterParts[1] !== '') {
                passage.startVerse = parseInt(chapterParts[1]);
                passage.endVerse = passage.startVerse;
            } else {
                passage.startVerse = 1;
                passage.endVerse = 1;
            }
        }
    } else {
        if (!isNaN(Number(chapter))) {
            // assume that what is after the book name is a chapter
            passage.chapter = parseInt(chapter);
        }
    }
};