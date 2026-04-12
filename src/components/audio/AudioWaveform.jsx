import { useEffect, useRef } from 'react';
import './AudioWaveform.css';

/**
 * Audio Waveform Component
 * Visualizes audio input during recording
 */
function AudioWaveform({ isActive = false, barCount = 40 }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const barsRef = useRef([]);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Reset bars
      barsRef.current.forEach(bar => {
        if (bar) bar.style.height = '4px';
      });
      return;
    }

    const setupVisualizer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 128;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const animate = () => {
          analyser.getByteFrequencyData(dataArray);
          
          barsRef.current.forEach((bar, index) => {
            if (!bar) return;
            
            // Map bar index to frequency data
            const dataIndex = Math.floor((index / barCount) * bufferLength);
            const value = dataArray[dataIndex] || 0;
            const height = Math.max(4, (value / 255) * 60);
            bar.style.height = `${height}px`;
          });
          
          animationRef.current = requestAnimationFrame(animate);
        };
        
        animate();
        
        // Cleanup function
        return () => {
          cancelAnimationFrame(animationRef.current);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        };
      } catch (error) {
        console.error('Failed to setup audio visualizer:', error);
      }
    };

    const cleanup = setupVisualizer();
    
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [isActive, barCount]);

  return (
    <div className="waveform-container" ref={containerRef}>
      <div className="waveform-bars">
        {Array.from({ length: barCount }).map((_, index) => (
          <div
            key={index}
            className="waveform-bar"
            ref={el => barsRef.current[index] = el}
          />
        ))}
      </div>
    </div>
  );
}

export default AudioWaveform;
