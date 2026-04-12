import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO_CONFIG } from '../../utils/constants';
import './AudioRecordButton.css';

/**
 * Audio Record Button Component
 * Handles microphone recording
 */
function AudioRecordButton({ 
  onStart,
  onComplete,
  onError,
  disabled = false,
}) {
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, processing
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const shouldStopRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Format duration as mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setRecordingState('processing');
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      shouldStopRef.current = false;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          channelCount: AUDIO_CONFIG.CHANNELS,
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: AUDIO_CONFIG.MIME_TYPE,
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: AUDIO_CONFIG.MIME_TYPE });
        setRecordingState('idle');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (onComplete) {
          onComplete(audioBlob);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      setRecordingState('recording');
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if ((prev + 1) * 1000 >= AUDIO_CONFIG.MAX_DURATION_MS) {
            shouldStopRef.current = true;
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      if (onStart) {
        onStart();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (onError) {
        onError(error);
      }
    }
  }, [onStart, onComplete, onError]);

  // Check for max duration stop
  useEffect(() => {
    if (shouldStopRef.current && recordingState === 'recording') {
      // Use setTimeout to avoid calling setState synchronously in effect
      const timeoutId = setTimeout(() => {
        stopRecording();
        shouldStopRef.current = false;
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [duration, recordingState, stopRecording]);

  const handleClick = () => {
    if (disabled) return;
    
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  return (
    <div className={`audio-record-container recording-state-${recordingState}`}>
      <button
        type="button"
        className={`record-btn ${recordingState === 'recording' ? 'record-btn-recording' : ''}`}
        onClick={handleClick}
        disabled={disabled || recordingState === 'processing'}
        aria-label={recordingState === 'recording' ? 'Stop recording' : 'Start recording'}
      >
        <span className="record-icon">
          {recordingState === 'recording' ? '⏹' : '🎤'}
        </span>
        <span className="record-btn-label" aria-hidden="true">START</span>
      </button>
      
      <div className="record-info">
        {recordingState === 'idle' && (
          <span className="record-hint">Press Start to begin</span>
        )}
        {recordingState === 'recording' && (
          <>
            <span className="recording-indicator" />
            <span className="record-duration">{formatDuration(duration)}</span>
            <span className="record-hint">Click to stop</span>
          </>
        )}
        {recordingState === 'processing' && (
          <span className="record-hint">Processing...</span>
        )}
      </div>
    </div>
  );
}

export default AudioRecordButton;
