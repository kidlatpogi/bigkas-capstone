import { forwardRef } from 'react';
import styled from 'styled-components';

const STATE_STYLES = {
  active: {
    bg: '#f18f01',
    shadow: '#cd8b76',
  },
  locked: {
    bg: '#f5f5f5',
    shadow: '#d5d5d5',
  },
  completed: {
    bg: '#228b22',
    shadow: '#5a7863',
  },
};

const StyledWrapper = styled.div`
  button {
    padding: 0;
    border-radius: 999px;
    border: 0;
    background-color: ${(props) => props.$bg};
    letter-spacing: 1.5px;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: ${(props) => props.$shadow} 0px 10px 0px 0px;
    color: hsl(0, 0%, 100%);
    cursor: pointer;
  }

  button:active {
    background-color: ${(props) => props.$bg};
    box-shadow: ${(props) => props.$shadow} 0px 0px 0px 0px;
    transform: translateX(var(--skyward-node-offset, 0%)) translateY(10px);
    transition: 200ms;
  }
`;

const SkywardJourneyNodeButton = forwardRef(function SkywardJourneyNodeButton(
  { children, nodeState = 'active', disabled, ...props },
  ref,
) {
  const palette = STATE_STYLES[nodeState] || STATE_STYLES.active;
  return (
    <StyledWrapper $bg={palette.bg} $shadow={palette.shadow}>
      <button ref={ref} disabled={disabled} {...props}>
        {children}
      </button>
    </StyledWrapper>
  );
});

export default SkywardJourneyNodeButton;
