import { Col, Container, Row, Form, Toast, DropdownButton, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faCopy,
  faQuestionCircle,
  faLightbulb,
  faArrowUp,
  faArrowDown,
  faEllipsisV,
  IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { translationsShortNms } from '../models/constants';
import { useState } from 'react';
import copy from 'clipboard-copy';
import { getDisplayBookName } from '../models/passage-utils';

interface MenuItem {
  itemLabel: string;
  icon: IconDefinition;
  callbackFunction: () => void;
}

interface ToolbarProps {
  currentIndex: number;
  totalCount: number;
  clickFunction: Function;
  translation: string;
  onTranslationChange: (translation: string) => void;
  currentPassage: any;
  getUnformattedText: (passage: any) => string;
  showQuestionIcon?: boolean;
  showLightbulbIcon?: boolean;
  showUpIcon?: boolean;
  showDownIcon?: boolean;
  upEnabled?: boolean;
  downEnabled?: boolean;
  onQuestionClick?: () => void;
  onLightbulbClick?: () => void;
  onCopy?: () => void;
  additionalMenus?: MenuItem[];
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentIndex,
  totalCount,
  clickFunction,
  translation = 'niv',
  onTranslationChange,
  currentPassage,
  getUnformattedText,
  showQuestionIcon = false,
  showLightbulbIcon = false,
  showUpIcon = false,
  showDownIcon = false,
  upEnabled = true,
  downEnabled = true,
  onQuestionClick,
  onLightbulbClick,
  onCopy,
  additionalMenus = [],
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('#28a745');

  const getPassageReference = () => {
    if (!currentPassage) return '';
    const bookName = getDisplayBookName(currentPassage.bookId);
    const baseRef = `${bookName} ${currentPassage.chapter}:${currentPassage.startVerse}`;
    if (currentPassage.endVerse !== currentPassage.startVerse) {
      return `${baseRef}-${currentPassage.endVerse}${
        currentPassage.passageRefAppendLetter || ''
      }`;
    }
    return `${baseRef}${currentPassage.passageRefAppendLetter || ''}`;
  };

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
      return;
    }

    if (currentPassage) {
      if (!currentPassage.verses || currentPassage.verses.length === 0) {
        setToastMessage('Please wait for verses to load...');
        setToastBg('#ffc107');
        setShowToast(true);
        return;
      }

      const passageRef = getPassageReference();
      const verseText = getUnformattedText(currentPassage);
      const textToCopy = `${passageRef}\n\n${verseText}`;

      try {
        await copy(textToCopy);
        setToastMessage('Passage copied to clipboard!');
        setToastBg('#28a745');
        setShowToast(true);
      } catch (err) {
        console.error('Failed to copy text:', err);
        setToastMessage('Failed to copy text');
        setToastBg('#dc3545');
        setShowToast(true);
      }
    }
  };

  return (
    <Container className="toolbar-progress fw-bold">
      <Row className="justify-content-center align-items-center">
        <Col xs="auto" className="px-3">
          {`${currentIndex + 1} of ${totalCount}`}
        </Col>
      </Row>
      <Row className="justify-content-center align-items-center">
        {showQuestionIcon && (
          <Col xs="auto" className="px-2">
            <FontAwesomeIcon
              icon={faQuestionCircle}
              size="lg"
              onClick={onQuestionClick}
              className="cursor-pointer"
            />
          </Col>
        )}
        {showLightbulbIcon && (
          <Col xs="auto" className="px-2">
            <FontAwesomeIcon
              icon={faLightbulb}
              size="lg"
              onClick={onLightbulbClick}
              className="cursor-pointer"
            />
          </Col>
        )}
        {showUpIcon && (
          <Col xs="auto" className="px-2">
            <FontAwesomeIcon
              icon={faArrowUp}
              size="lg"
              onClick={() => upEnabled && clickFunction('UP')}
              className="cursor-pointer"
              style={{ opacity: upEnabled ? 1 : 0.5 }}
            />
          </Col>
        )}
        <Col xs="auto" className="px-2">
          <FontAwesomeIcon
            icon={faArrowLeft}
            size="lg"
            onClick={() => clickFunction('LEFT')}
            className="cursor-pointer"
          />
        </Col>
        <Col xs="auto" className="px-2">
          <FontAwesomeIcon
            icon={faArrowRight}
            size="lg"
            onClick={() => clickFunction('RIGHT')}
            className="cursor-pointer"
          />
        </Col>
        {showDownIcon && (
          <Col xs="auto" className="px-2">
            <FontAwesomeIcon
              icon={faArrowDown}
              size="lg"
              onClick={() => downEnabled && clickFunction('DOWN')}
              className="cursor-pointer"
              style={{ opacity: downEnabled ? 1 : 0.5 }}
            />
          </Col>
        )}
        <Col xs="auto" className="px-2">
          <FontAwesomeIcon
            icon={faCopy}
            size="lg"
            onClick={handleCopy}
            className="cursor-pointer"
          />
        </Col>
        {additionalMenus.length > 0 && (
          <Col xs="auto" className="px-2">
            <DropdownButton
              id="toolbar-dropdown"
              title={<FontAwesomeIcon icon={faEllipsisV} size="lg" />}
              variant="link"
              className="p-0 text-white"
            >
              {additionalMenus.map((menu, index) => (
                <Dropdown.Item 
                  key={index} 
                  onClick={menu.callbackFunction}
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon icon={menu.icon} className="me-2" />
                  {menu.itemLabel}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </Col>
        )}
      </Row>
      {translation && (
        <Row className="justify-content-center align-items-center">
          <Col xs="auto" className="px-2">
            <Form.Select
              value={translation || 'niv'}
              onChange={(e) => onTranslationChange(e.target.value)}
              className="bg-dark text-white border-0"
              size="sm"
            >
              {translationsShortNms.map((trans) => (
                <option key={trans.code} value={trans.code}>
                  {trans.translationName}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      )}

      <Toast
        onClose={() => setShowToast(false)}
        show={showToast}
        delay={3000}
        autohide
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: toastBg,
          color: 'white',
        }}
      >
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </Container>
  );
};

export default Toolbar;