import { forwardRef } from 'react';
import styled from 'styled-components';

const STATE_THEME = {
  active: {
    bg: '#f18f01',
    shadow: '#cd8b76',
    text: '#ffffff',
  },
  locked: {
    bg: '#f5f5f5',
    shadow: '#d5d5d5',
    text: '#a1a1aa',
  },
  completed: {
    bg: '#228b22',
    shadow: '#5a7863',
    text: '#ffffff',
  },
};

const StyledWrapper = styled.div`
  display: inline-flex;
  
  button {
    /* 1. Geometry */
    position: relative;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background-color: ${(props) => props.$theme.bg};
    color: ${(props) => props.$theme.text};
    cursor: pointer;
    
    /* 2. Typography & Transition */
    letter-spacing: 1.5px;
    font-size: 15px;
    transition: all 0.3s ease;
    
    /* 3. The 3D Shadow (10px) */
    box-shadow: ${(props) => props.$theme.shadow} 0px 10px 0px 0px;
    
    /* 4. Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Maintain horizontal offset established in layout */
    transform: translateX(var(--skyward-node-offset, 0%));
  }

  /* 1:1 Push-down Animation */
  button:active:not(:disabled) {
    box-shadow: ${(props) => props.$theme.shadow} 0px 0px 0px 0px;
    transform: translateX(var(--skyward-node-offset, 0%)) translateY(10px);
    transition: 200ms;
  }

  button:disabled {
    cursor: not-allowed;
    filter: grayscale(0.2);
    opacity: 0.9;
  }
`;

const SkywardJourneyNodeButton = forwardRef(function SkywardJourneyNodeButton(
  { children, nodeState = 'active', disabled, ...props },
  ref,
) {
  const theme = STATE_THEME[nodeState] || STATE_THEME.active;
  
  return (
    <StyledWrapper $theme={theme}>
      <button 
        ref={ref} 
        disabled={nodeState === 'locked' || disabled} 
        {...props}
      >
        {children}
      </button>
    </StyledWrapper>
  );
});

export default SkywardJourneyNodeButton;
