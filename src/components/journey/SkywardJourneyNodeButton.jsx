import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: inline-flex;
`;

const SkywardJourneyNodeButton = forwardRef(function SkywardJourneyNodeButton(
  { children, nodeState: _nodeState = 'active', disabled, ...props },
  ref,
) {
  return (
    <StyledWrapper>
      <button 
        ref={ref} 
        disabled={disabled} 
        {...props}
      >
        {children}
      </button>
    </StyledWrapper>
  );
});

export default SkywardJourneyNodeButton;
