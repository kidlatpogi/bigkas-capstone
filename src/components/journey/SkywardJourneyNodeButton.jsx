import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  button {
    padding: 0;
    border-radius: 999px;
    border: 0;
    background-color: rgb(255, 56, 86);
    letter-spacing: 1.5px;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: rgb(201, 46, 70) 0px 10px 0px 0px;
    color: hsl(0, 0%, 100%);
    cursor: pointer;
  }

  button:active {
    background-color: rgb(255, 56, 86);
    box-shadow: rgb(201, 46, 70) 0px 0px 0px 0px;
    transform: translateX(var(--skyward-node-offset, 0%)) translateY(10px);
    transition: 200ms;
  }
`;

const SkywardJourneyNodeButton = forwardRef(function SkywardJourneyNodeButton(
  { children, nodeState: _NODE_STATE = 'active', disabled, ...props },
  ref,
) {
  return (
    <StyledWrapper>
      <button ref={ref} disabled={disabled} {...props}>
        {children}
      </button>
    </StyledWrapper>
  );
});

export default SkywardJourneyNodeButton;
