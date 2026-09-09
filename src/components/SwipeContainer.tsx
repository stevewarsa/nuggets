import React, { ReactNode } from 'react';
import Swipe from 'react-easy-swipe';

interface SwipeContainerProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
  style?: React.CSSProperties;
}

const SwipeContainer: React.FC<SwipeContainerProps> = ({
                                                         onSwipeLeft,
                                                         onSwipeRight,
                                                         children,
                                                         style,
                                                       }) => {
  return (
      <Swipe
          tolerance={80}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
      >
        <div className="app-container" style={style}>{children}</div>
      </Swipe>
  );
};

export default SwipeContainer;