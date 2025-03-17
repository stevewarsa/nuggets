import React, {useState, useEffect} from 'react';
import {Modal, Form, Button, Spinner} from 'react-bootstrap';
import {Passage} from '../models/passage';
import {bibleService} from '../services/bible-service';
import {translations} from '../models/constants';
import {getUnformattedPassageTextNoVerseNumbers} from '../models/passage-utils';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {UpdatePassageParam} from '../models/update-passage-param';
import {StringUtils} from '../models/string.utils';
import {setMaxVerseByBookChapter} from "../store/memoryPassageSlice.ts";


interface EditPassageProps {
    passage: Passage;
    overrides: Passage[];
    visible: boolean;
    setVisibleFunction: Function;
}

const colsInTextArea = 47;
const EditPassage = ({props}: { props: EditPassageProps }) => {
    const dispatcher = useAppDispatch();
    const user = useAppSelector(state => state.user.currentUser);
    const [psgTextChanged, setPsgTextChanged] = useState(false);
    const [startVerse, setStartVerse] = useState(props.passage.startVerse);
    const [frequency, setFrequency] = useState(props.passage.frequencyDays);
    const [endVerse, setEndVerse] = useState(props.passage.endVerse);
    const [appendLetter, setAppendLetter] = useState(props.passage.passageRefAppendLetter ? props.passage.passageRefAppendLetter : undefined);
    const [translation, setTranslation] = useState(props.passage.translationName);
    let maxVerseByBookChapterMap = useAppSelector(state => state.memoryPassage.maxVerseByBookChapter);
    const [maxVerse, setMaxVerse] = useState(props.passage.endVerse);
    const [currPassageText, setCurrPassageText] = useState("");
    const [rowsInTextArea, setRowsInTextArea] = useState(10);
    const [frequencies, setFrequencies] = useState<{ freqLabel: string, freqValue: number }[]>([]);
    const [busy, setBusy] = useState({state: false, message: ""});
    const [editPassageVisible, setEditPassageVisible] = useState(props.visible);

    useEffect(() => {
        // populate the frequency dropdown values (only one time - no dependencies)
        const freqDep: { freqLabel: string, freqValue: number }[] = [];
        freqDep.push({freqValue: -1, freqLabel: "Every Time"});
        for (let i = 1; i <= 3; i++) {
            freqDep.push({freqLabel: i + "", freqValue: i});
        }
        setFrequencies(freqDep);
        setEditPassageVisible(true);
    }, []);

    useEffect(() => {
        setEditPassageVisible(props.visible);
    }, [props.visible]);

    useEffect(() => {
        setTranslation(props.passage.translationName);
    }, [props.passage.translationName]);

    useEffect(() => {
        if (startVerse === props.passage.startVerse && endVerse === props.passage.endVerse) {
            // no update necessary, just return
            return;
        }
        console.log("EditPassage - startVerse or endVerse has changed: startVerse=" + startVerse + ", endVerse=" + endVerse);
        props.passage = {...props.passage, startVerse: startVerse, endVerse: endVerse};
        populateVerses(props.passage, updateStateFromPassage)
    }, [startVerse, endVerse]);

    useEffect(() => {
        console.log("EditPassage - currPassageText changed: ", currPassageText);
    }, [currPassageText]);

    useEffect(() => {
        console.log("EditPassage - appendLetter changed: " + appendLetter);
    }, [appendLetter]);

    const updateStateFromPassage = (psg: Passage) => {
        const locMaxVerseByBookChapter = maxVerseByBookChapterMap[translation];
        const maxChapVerseForBook = locMaxVerseByBookChapter[psg.bookName];
        const maxVerseForChap = maxChapVerseForBook.find((chapAndVerse: number[]) => chapAndVerse[0] === psg.chapter);
        setMaxVerse(maxVerseForChap[1]);
        setStartVerse(psg.startVerse);
        setEndVerse(psg.endVerse);
        setFrequency(psg.frequencyDays);
        setAppendLetter(psg.passageRefAppendLetter ? psg.passageRefAppendLetter : undefined);
        populateCurrentPassageTextFromPassage(psg);
    }

    const populateVerses = (psg: Passage, callback: Function) => {
        // if override exists, populate verses of passage with override, otherwise fetch passage from server
        const override = props.overrides.find(
            (o) => o.passageId === psg.passageId
        );
        if (override) {
            psg.verses = override.verses;
            callback(psg);
        } else {
            // fetch passage from server
            (async () => {
                const locPsg = await bibleService.getPassageText(user, translation, psg.bookName, psg.chapter, psg.startVerse, psg.endVerse);
                psg.verses = locPsg.verses;
                callback(psg);
            })();
        }
    }

    useEffect(() => {
        if (!maxVerseByBookChapterMap?.hasOwnProperty(translation)) {
            (async () => {
                const locMaxVerseByBookChapter = await bibleService.getMaxVersesByBookChapter(translation);
                dispatcher(setMaxVerseByBookChapter({
                    maxVerseByBookChapter: locMaxVerseByBookChapter,
                    translation: translation
                }));
            })();
            return;
        }
        if (!editPassageVisible) {
            return;
        }
        if (!props.passage || props.passage.passageId === -1) {
            return;
        }

        if (!props.passage.verses || props.passage.verses.length === 0) {
            populateVerses(props.passage, updateStateFromPassage);
        } else {
            updateStateFromPassage(props.passage);
        }
    }, [props.passage, maxVerseByBookChapterMap, editPassageVisible]);

    const populateCurrentPassageTextFromPassage = (psg: Passage) => {
        if (psg.verses && psg.verses.length > 0) {
            const txt = getUnformattedPassageTextNoVerseNumbers(psg);
            setCurrPassageText(txt);
            setRowsInTextArea(Math.ceil(txt.length / colsInTextArea));
        }
    }

    const changePassageText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const updatedPsgText = e.target.value ? e.target.value.trim() : null;
        const userHasChangedText = currPassageText !== updatedPsgText;
        setPsgTextChanged(userHasChangedText);
        setCurrPassageText(updatedPsgText);
        if (userHasChangedText) {
            if (!StringUtils.isEmpty(updatedPsgText) && StringUtils.isEmpty(appendLetter)) {
                setAppendLetter("a");
            }
        }

        if (StringUtils.isEmpty(updatedPsgText)) {
            setAppendLetter(undefined);
        }
    };

    const changeTranslation = (value: string) => {
        if (value !== translation) {
            setTranslation(value);
            const locPassage = {...props.passage}
            locPassage.translationId = value;
            locPassage.translationName = value;
            (async () => {
                const resp = await bibleService.getPassageText(user, translation, locPassage.bookName, locPassage.chapter, startVerse, endVerse);
                locPassage.verses = resp.verses;
                populateCurrentPassageTextFromPassage(locPassage);
                // When only the translation changed, we need to make sure this text from a different translation
                // is not submitted as "override" text, since the user hasn't modified the text manually
                setPsgTextChanged(false);
            })();
        }
    };

    const changeStartVerse = (value) => {
        setStartVerse(parseInt(value));
    };

    const changeEndVerse = (value) => {
        setEndVerse(parseInt(value));
    };

    const changPassageAppendLetter = (value) => {
        setAppendLetter(value);
    };

    const changeFrequency = (value) => {
        if (parseInt(value) !== frequency) {
            setFrequency(parseInt(value));
        }
    }

    const submitChanges = () => {
        const updateParam: UpdatePassageParam = new UpdatePassageParam();
        updateParam.passageRefAppendLetter = appendLetter;
        updateParam.user = user;
        updateParam.newText = psgTextChanged ? currPassageText : null;
        updateParam.passage = {
            ...props.passage,
            translationName: translation,
            translationId: translation,
            startVerse: startVerse,
            endVerse: endVerse,
            frequencyDays: frequency
        };
        setBusy({state: true, message: "Updating passage..."});
        bibleService.updatePassage(user, updateParam.passage, updateParam.newText, updateParam.passageRefAppendLetter).then(resp => {
            if (resp === "success") {
                console.log("Passage has been updated!");
                setEditPassageVisible(false);
                props.setVisibleFunction(
                    {...updateParam.passage, passageRefAppendLetter: appendLetter},
                    updateParam.newText,
                    false);
            } else {
                console.log("Error updating passage: " + resp);
            }
            setBusy({state: false, message: ""});
        });
    };

    if (busy.state) {
        return (
            <div className="text-center mt-3">
                <Spinner animation="border" size="sm" className="me-2"/>
                <span>Loading passage text...</span>
            </div>
        );
    } else {
        return (
            <Modal show={editPassageVisible} onHide={() => {
                setEditPassageVisible(false);
                props.setVisibleFunction(null, null, true);
            }}>
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Edit Passage</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        {/* Translation Selection */}
                        <Form.Group className="mb-3">
                            <Form.Label>Translation</Form.Label>
                            <Form.Select
                                value={translation}
                                onChange={(e) => changeTranslation(e.target.value)}
                            >
                                {translations.map((trans) => (
                                    <option key={trans.code} value={trans.code}>
                                        {trans.translationName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <div className="row mb-3">
                            <div className="col">
                                <Form.Group>
                                    <Form.Label>Start Verse</Form.Label>
                                    <Form.Select
                                        value={startVerse}
                                        onChange={(e) => changeStartVerse(e.target.value)}
                                    >
                                        <option value={-1}>
                                            --Start Verse--
                                        </option>
                                        {Array(maxVerse).fill(undefined).map((_n, i) => i + 1).map(num => (
                                            <option key={"start-" + num} value={num}>{num}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col">
                                <Form.Group>
                                    <Form.Label>End Verse</Form.Label>
                                    <Form.Select
                                        value={endVerse}
                                        onChange={(e) => changeEndVerse(e.target.value)}
                                    >
                                        <option value={-1}>
                                            --End Verse--
                                        </option>
                                        {Array(maxVerse).fill(undefined).map((_n, i) => i + 1).filter(num => num >= startVerse).map(num => (
                                            <option key={"end-" + num} value={num}>{num}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-3">
                                <Form.Group>
                                    <Form.Label>Append</Form.Label>
                                    <Form.Select
                                        value={appendLetter}
                                        onChange={(e) => changPassageAppendLetter(e.target.value || null)}
                                    >
                                        <option value={undefined}>None</option>
                                        <option value="a">a</option>
                                        <option value="b">b</option>
                                        <option value="c">c</option>
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>
                        {/* Frequencies (Boxes) */}
                        <Form.Group className="mb-3">
                            <Form.Label>Box</Form.Label>
                            <Form.Select
                                value={frequency}
                                onChange={(e) => changeFrequency(e.target.value)}
                            >
                                {frequencies.map(freq => (
                                    <option key={freq.freqValue} value={freq.freqValue}>
                                        {freq.freqLabel}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        {/* Passage Text */}
                        <Form.Group>
                            <Form.Label>Passage Text</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={rowsInTextArea}
                                value={currPassageText}
                                onChange={changePassageText}
                                className="bg-dark text-white"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="primary"
                        onClick={submitChanges}
                    >
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
};

export default EditPassage;