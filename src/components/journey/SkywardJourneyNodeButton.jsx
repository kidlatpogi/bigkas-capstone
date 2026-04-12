import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  border-radius: 999px;
  transition: all 0.2s ease;
  box-shadow: rgba(11, 57, 84, 0.22) 0px 10px 0px 0px;
  cursor: pointer;

  &:hover {
    box-shadow: rgba(11, 57, 84, 0.22) 0px 7px 0px 0px;
  }

  &:active {
    box-shadow: rgba(11, 57, 84, 0.18) 0px 0px 0px 0px;
    transform: translateY(5px);
    transition: 180ms;
  }
`;

const SkywardJourneyNodeButton = forwardRef(function SkywardJourneyNodeButton(
  { children, ...props },
  ref,
) {
  return (
    <StyledButton ref={ref} {...props}>
      {children}
    </StyledButton>
  );
});

export default SkywardJourneyNodeButton;
