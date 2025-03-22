import {BibleReferenceInput} from "./BibleReferenceInput.tsx";
import {useNavigate} from "react-router-dom";
import {useState} from "react";
import {Button, Col, Container, Row} from "react-bootstrap";
import {TRANSLATION} from "../models/constants";
import {getPassageFromPassageRef} from "../models/passage-utils.ts";
import {Passage} from "../models/passage.ts";

const GoToPassageByRef = () => {
    const navigate = useNavigate();
    const [passageRef, setPassageRef] = useState("");

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
                    <BibleReferenceInput onChange={setPassageRef} userEnteredValue={passageRef}/>
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