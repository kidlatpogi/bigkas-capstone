import React from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  button {
    width: 100%;
    padding: 17px 40px;
    border-radius: 10px;
    border: 0;
    background-color: ${(props) => props.$bgColor || 'rgb(255, 56, 86)'};
    letter-spacing: 1.5px;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: ${(props) => props.$shadowColor || 'rgb(201, 46, 70)'} 0px 10px 0px 0px;
    color: ${(props) => props.$textColor || 'hsl(0, 0%, 100%)'};
    cursor: pointer;
    font-weight: 800;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-family: 'Nunito', sans-serif;
  }

  button:hover:not(:disabled) {
    box-shadow: ${(props) => props.$shadowColor || 'rgb(201, 46, 70)'} 0px 7px 0px 0px;
    transform: translateY(3px);
  }

  button:active:not(:disabled) {
    background-color: ${(props) => props.$bgColor || 'rgb(255, 56, 86)'};
    box-shadow: ${(props) => props.$shadowColor || 'rgb(201, 46, 70)'} 0px 0px 0px 0px;
    transform: translateY(10px);
    transition: 200ms;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: translateY(0);
    box-shadow: ${(props) => props.$shadowColor || 'rgb(201, 46, 70)'} 0px 10px 0px 0px;
  }
`;

const PushButton = ({ 
  children, 
  onClick, 
  type = 'button', 
  disabled = false, 
  className,
  bgColor,
  shadowColor,
  textColor
}) => {
  return (
    <StyledWrapper 
      className={className}
      $bgColor={bgColor}
      $shadowColor={shadowColor}
      $textColor={textColor}
    >
      <button type={type} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    </StyledWrapper>
  );
};

export default PushButton;
