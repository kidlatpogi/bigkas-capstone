import styled from 'styled-components';

const toneMap = {
  visual: {
    cardBg: '#1a2c25',
    gradStart: '#5d8a6a',
    gradEnd: '#7fa890',
    title: '#f4fbf1',
    text: 'rgba(236, 246, 232, 0.9)',
    shadow: 'rgba(30, 49, 41, 0.34)',
  },
  vocal: {
    cardBg: '#30220f',
    gradStart: '#d88900',
    gradEnd: '#f2a71c',
    title: '#fff5e2',
    text: 'rgba(255, 246, 226, 0.92)',
    shadow: 'rgba(95, 56, 2, 0.34)',
  },
  verbal: {
    cardBg: '#132b39',
    gradStart: '#1d5a7d',
    gradEnd: '#2e759d',
    title: '#eef8ff',
    text: 'rgba(224, 240, 255, 0.92)',
    shadow: 'rgba(8, 29, 41, 0.36)',
  },
  facial: {
    cardBg: '#1a2c25',
    gradStart: '#7fa06f',
    gradEnd: '#93b184',
    title: '#f4fbf1',
    text: 'rgba(236, 246, 232, 0.9)',
    shadow: 'rgba(30, 49, 41, 0.34)',
  },
  articulation: {
    cardBg: '#132b39',
    gradStart: '#1d5a7d',
    gradEnd: '#2e759d',
    title: '#eef8ff',
    text: 'rgba(224, 240, 255, 0.92)',
    shadow: 'rgba(8, 29, 41, 0.36)',
  },
  gestures: {
    cardBg: '#242f38',
    gradStart: '#5d6f7e',
    gradEnd: '#74899a',
    title: '#f4f7fb',
    text: 'rgba(233, 240, 247, 0.92)',
    shadow: 'rgba(34, 43, 50, 0.35)',
  },
};

export default function Feature3DCard({ title, text, tone = 'visual' }) {
  const palette = toneMap[tone] || toneMap.visual;

  return (
    <StyledWrapper
      style={{
        '--card-bg': palette.cardBg,
        '--grad-start': palette.gradStart,
        '--grad-end': palette.gradEnd,
        '--title-color': palette.title,
        '--text-color': palette.text,
        '--shadow-color': palette.shadow,
      }}
    >
      <article className="card">
        <div className="top-section">
          <div className="icons">
            <span className="logo-text">Bigkas</span>
          </div>
        </div>

        <div className="bottom-section">
          <span className="title">{title}</span>
          <p className="description">{text}</p>
        </div>

        <div className="glass" />
      </article>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 100%;
  min-height: 466px;
  perspective: 1000px;

  .card {
    width: min(100%, 340px);
    margin: 0 auto;
    height: 466px;
    border-radius: 20px;
    background: var(--card-bg);
    padding: 5px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    transform-style: preserve-3d;
    transition: all 0.5s ease-in-out;
    box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 20px 0px;
  }

  .card:hover {
    transform: scale(1.03);
    box-shadow: var(--shadow-color) 0px 14px 28px 0px;
  }

  .top-section {
    height: 250px;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    background: linear-gradient(45deg, var(--grad-start) 0%, var(--grad-end) 100%);
    position: relative;
    overflow: hidden;
  }

  .top-section .icons {
    position: absolute;
    top: 0;
    width: 100%;
    height: 30px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    box-sizing: border-box;
    padding-left: 15px;
  }

  .top-section .icons .logo-text {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ffffff;
    line-height: 30px;
  }

  .bottom-section {
    margin-top: 14px;
    padding: 8px 9px 10px;
    position: relative;
    z-index: 1;
    box-sizing: border-box;
  }

  .bottom-section .title {
    display: block;
    color: var(--title-color);
    font-weight: 900;
    font-size: 17px;
    text-align: center;
    letter-spacing: 0.04em;
  }

  .bottom-section .description {
    margin: 10px 4px 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
    overflow: hidden;
    color: var(--text-color);
    font-size: 16px;
    line-height: 1.33;
    font-weight: 600;
  }

  .glass {
    position: absolute;
    inset: 5px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
    border-left: 1px solid rgba(255, 255, 255, 0.18);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    pointer-events: none;
    transition: all 0.5s ease-in-out;
    z-index: 0;
  }
`;
