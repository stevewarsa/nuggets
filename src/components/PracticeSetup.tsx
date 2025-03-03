import { Container, Form, Button } from 'react-bootstrap';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BY_REF,
  BY_PSG_TXT,
  BY_FREQ,
  INTERLEAVE,
  RAND,
  BY_LAST_PRACTICED
} from '../models/passage-utils';

const PracticeSetup = () => {
  const [practiceMode, setPracticeMode] = useState(BY_REF);
  const [displayOrder, setDisplayOrder] = useState(BY_FREQ);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(`/practice/${practiceMode}/${displayOrder}`);
  };

  return (
    <Container className="p-4">
      <h1 className="text-white mb-4">Practice Setup</h1>
      
      <div className="mb-4">
        <h2 className="text-white mb-3">Practice Mode</h2>
        <Form>
          <div className="bg-dark p-3 rounded">
            <Form.Check
              type="radio"
              id="practice-by-ref"
              label="By Reference"
              name="practiceMode"
              className="text-white mb-2"
              checked={practiceMode === BY_REF}
              onChange={() => setPracticeMode(BY_REF)}
            />
            <Form.Check
              type="radio"
              id="practice-by-text"
              label="By Passage Text"
              name="practiceMode"
              className="text-white"
              checked={practiceMode === BY_PSG_TXT}
              onChange={() => setPracticeMode(BY_PSG_TXT)}
            />
          </div>
        </Form>
      </div>

      <div className="mb-4">
        <h2 className="text-white mb-3">Passage Display Order</h2>
        <Form>
          <div className="bg-dark p-3 rounded">
            <Form.Check
              type="radio"
              id="order-by-freq"
              label="By Frequency"
              name="displayOrder"
              className="text-white mb-2"
              checked={displayOrder === BY_FREQ}
              onChange={() => setDisplayOrder(BY_FREQ)}
            />
            <Form.Check
              type="radio"
              id="order-interleave"
              label="Interleave"
              name="displayOrder"
              className="text-white mb-2"
              checked={displayOrder === INTERLEAVE}
              onChange={() => setDisplayOrder(INTERLEAVE)}
            />
            <Form.Check
              type="radio"
              id="order-random"
              label="By Random"
              name="displayOrder"
              className="text-white mb-2"
              checked={displayOrder === RAND}
              onChange={() => setDisplayOrder(RAND)}
            />
            <Form.Check
              type="radio"
              id="order-by-last-practiced"
              label="By Last Practiced Date/Time"
              name="displayOrder"
              className="text-white"
              checked={displayOrder === BY_LAST_PRACTICED}
              onChange={() => setDisplayOrder(BY_LAST_PRACTICED)}
            />
          </div>
        </Form>
      </div>

      <div className="text-center">
        <Button 
          variant="primary" 
          size="lg"
          onClick={handleStart}
        >
          Start
        </Button>
      </div>
    </Container>
  );
};

export default PracticeSetup;