import BiblePassage from './BiblePassage';
import Toolbar from './Toolbar';
import SwipeContainer from './SwipeContainer';
import { useBiblePassages } from '../hooks/useBiblePassages';
import { getUnformattedPassageTextNoVerseNumbers } from '../models/passage-utils';

const BrowseBiblePassages = () => {
  const { state, functions } = useBiblePassages();

  return (
    <SwipeContainer
      onSwipeLeft={functions.handleNext}
      onSwipeRight={functions.handlePrev}
    >
      {state.currentPassage && (
        <>
          <Toolbar
            totalCount={state.totalCount}
            currentIndex={state.currentIndex}
            clickFunction={functions.handleToolbarClick}
            translation={state.translation}
            onTranslationChange={functions.handleTranslationChange}
            currentPassage={state.currentPassage}
            getUnformattedText={getUnformattedPassageTextNoVerseNumbers}
          />
          <BiblePassage 
            passage={state.currentPassage}
            translation={state.translation}
          />
        </>
      )}
    </SwipeContainer>
  );
};

export default BrowseBiblePassages;