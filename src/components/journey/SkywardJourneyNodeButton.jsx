import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  border-radius: 999px;
  border: 0;
  transition: all 0.3s ease;
  box-shadow: rgb(201, 46, 70) 0px 10px 0px 0px;
  cursor: pointer;

  &:hover {
    box-shadow: rgb(201, 46, 70) 0px 7px 0px 0px;
  }

  &:active {
    box-shadow: rgb(201, 46, 70) 0px 0px 0px 0px;
    transform: translateX(var(--skyward-node-offset, 0%)) translateY(5px);
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
