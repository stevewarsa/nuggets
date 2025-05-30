import React, {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Col, Container, Form, ListGroup, Row} from 'react-bootstrap';
import {TRANSLATION} from '../models/constants';
import {
    getPassageFromPassageRef,
    getNewSuggestions,
} from '../models/passage-utils';
import {Passage} from '../models/passage';

const GoToPassageByRef = () => {
    const navigate = useNavigate();
    const [passageRef, setPassageRef] = useState('');
    const [suggestions, setSuggestions] = useState<string[] | undefined>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassageRef(e.target.value);
        setSuggestions(getNewSuggestions(e.target.value));
    };

    const handleSuggestionClick = (suggestion: string) => {
        const computedSuggestions = getNewSuggestions(suggestion, true);
        if (computedSuggestions === undefined) {
            // undefined is kind of a "marker" to let us know this is an
            // exact match (book, chapter, verse) and we can navigate directly to it
            setSuggestions([]);
            handleGoToPassage(suggestion);
        } else {
            setSuggestions(computedSuggestions);
        }
        setPassageRef(suggestion);
    };

    const handleGoToPassage = (suggestion?: string) => {
        console.log(
            'GoToPassageByRef.handleGoToPassage - Bible Reference:',
            passageRef
        );
        const passagesFromPassageRef: Passage[] = suggestion
            ? getPassageFromPassageRef(suggestion)
            : getPassageFromPassageRef(passageRef.trim());
        if (passagesFromPassageRef.length > 0) {
            console.log(
                'GoToPassageByRef.handleGoToPassage - Setting the first passage parsed:',
                passagesFromPassageRef[0]
            );
            const readChapRoute = `/readBibleChapter/${TRANSLATION}/${passagesFromPassageRef[0].bookName}/${passagesFromPassageRef[0].chapter}/${passagesFromPassageRef[0].startVerse}`;
            console.log(
                'GoToPassageByRef.handleGoToPassage - navigating to route:',
                readChapRoute
            );
            navigate(readChapRoute);
        } else {
            console.log(
                'GoToPassageByRef.handleGoToPassage - no passages parsed from passageRef: ' +
                (suggestion ? suggestion : passageRef)
            );
        }
    };

    return (
        <Container>
            <Row>
                <Col>
                    <div className="position-relative">
                        <Form.Control
                            ref={inputRef}
                            type="text"
                            placeholder="Type a Bible reference (e.g., John 3:16)"
                            value={passageRef}
                            onChange={handleInputChange}
                            className="mb-2"
                        />
                        {suggestions.length > 0 && (
                            <ListGroup
                                className="position-absolute w-100 shadow-sm"
                                style={{zIndex: 1000}}
                            >
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
                        onClick={() => handleGoToPassage()}
                    >
                        Go To Passage
                    </Button>
                </Col>
            </Row>
        </Container>
    );
};

export default GoToPassageByRef;