import { forwardRef } from 'react';
import styled from 'styled-components';

const STATE_THEME = {
  active: {
    background: '#f18f01',
    shadow: 'rgba(201, 46, 70, 0.45)',
    text: '#ffffff',
  },
  completed: {
    background: '#5a7863',
    shadow: 'rgba(63, 93, 71, 0.42)',
    text: '#ffffff',
  },
  locked: {
    background: '#a1a1aa',
    shadow: 'rgba(113, 113, 122, 0.45)',
    text: '#ffffff',
  },
};

const StyledButton = styled.button`
  background-color: ${(props) => props.$theme.background};
  color: ${(props) => props.$theme.text};
  border-radius: 999px;
  border: 0;
  transition: all 0.2s ease;
  box-shadow: ${(props) => props.$theme.shadow} 0px 10px 0px 0px;
  cursor: pointer;

  &:hover {
    box-shadow: ${(props) => props.$theme.shadow} 0px 7px 0px 0px;
  }

  &:active {
    background-color: ${(props) => props.$theme.background};
    box-shadow: ${(props) => props.$theme.shadow} 0px 0px 0px 0px;
    transform: translateY(5px);
    transition: 180ms;
  }
`;

const SkywardJourneyNodeButton = forwardRef(function SkywardJourneyNodeButton(
  { children, nodeState = 'active', ...props },
  ref,
) {
  const theme = STATE_THEME[nodeState] || STATE_THEME.active;
  return (
    <StyledButton ref={ref} $theme={theme} {...props}>
      {children}
    </StyledButton>
  );
});

export default SkywardJourneyNodeButton;
