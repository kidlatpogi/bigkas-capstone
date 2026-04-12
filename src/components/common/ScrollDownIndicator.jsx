import styled from 'styled-components';

export default function ScrollDownIndicator({ hidden = false, white = false }) {
  return (
    <StyledWrapper className={`${hidden ? 'is-hidden' : ''} ${white ? 'is-white' : ''}`} aria-hidden="true">
      <div className="container_mouse">
        <span className="mouse-btn">
          <span className="mouse-scroll" />
        </span>
        <span className="indicator-label">Scroll Down</span>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  z-index: 4;
  transition: opacity 220ms ease, transform 220ms ease;

  &.is-hidden {
    opacity: 0;
    transform: translate(-50%, 10px);
    pointer-events: none;
  }

  &.is-white {
    .mouse-btn {
      border-color: #ffffff;
    }
    .mouse-scroll {
      background: #ffffff;
    }
    .indicator-label {
      color: #ffffff;
    }
  }

  .container_mouse {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .mouse-btn {
    margin: 2px auto;
    width: 18px;
    height: 34px;
    border: 1.5px solid #0e0f0c;
    border-radius: 10px;
    display: flex;
  }

  .mouse-scroll {
    display: block;
    width: 6px;
    height: 6px;
    background: #0e0f0c;
    border-radius: 50%;
    margin: auto;
    animation: scrolling13 1s linear infinite;
  }

  .indicator-label {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0e0f0c;
    font-feature-settings: 'calt' 1;
  }

  @keyframes scrolling13 {
    0% {
      opacity: 0;
      transform: translateY(-12px);
    }

    100% {
      opacity: 1;
      transform: translateY(12px);
    }
  }
`;
