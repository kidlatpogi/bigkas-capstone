import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  border: 0;
  border-radius: 999px;
  color: hsl(0, 0%, 100%);
  background-color: rgb(255, 56, 86);
  background-image: linear-gradient(to bottom, rgb(255, 56, 86) 0 50%, rgb(201, 46, 70) 50% 100%);
  transition: all 0.3s ease;
  box-shadow: rgb(201, 46, 70) 0px 10px 0px 0px;
  cursor: pointer;

  &:hover {
    box-shadow: rgb(201, 46, 70) 0px 7px 0px 0px;
  }

  &:active {
    background-color: rgb(255, 56, 86);
    box-shadow: rgb(201, 46, 70) 0px 0px 0px 0px;
    transform: translateY(5px);
    transition: 200ms;
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
