import React, { ReactNode } from 'react';
import Swipe from 'react-easy-swipe';

interface SwipeContainerProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: ReactNode;
}

const SwipeContainer: React.FC<SwipeContainerProps> = ({
  onSwipeLeft,
  onSwipeRight,
  children,
}) => {
  return (
    <Swipe 
      tolerance={80}
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
    >
      <div className="app-container">{children}</div>
    </Swipe>
  );
};

export default SwipeContainer;