import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import './StreakCalendarModal.css';

export default function StreakCalendarModal({ isOpen, onClose, activeDayKeys, streakStats }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!isOpen) return null;

  const monthYearStr = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  // Monday = 0, Sunday = 6
  const startDayOffset = (firstDayOfMonth + 6) % 7; 

  const blanks = Array.from({ length: startDayOffset }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = blanks.length + days.length;
  const endBlanks = Array.from({ length: Math.ceil(totalSlots / 7) * 7 - totalSlots }, () => null);

  const getLocalDateKey = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  // Pre-calculate active status for each day to determine streak rendering
  const dayStatuses = days.map((day) => {
    const key = getLocalDateKey(day);
    return activeDayKeys.has(key);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="streak-calendar-overlay" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <motion.div 
            className="streak-calendar-modal" 
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ 
              duration: 0.15,
              ease: "easeOut"
            }}
          >
        <div className="streak-calendar-header">
          <div className="streak-calendar-month-nav">
            <button className="streak-calendar-nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
              <FaChevronLeft />
            </button>
            <h2 className="streak-calendar-title">{monthYearStr}</h2>
            <button className="streak-calendar-nav-btn" onClick={handleNextMonth} aria-label="Next month">
              <FaChevronRight />
            </button>
          </div>
          <button
            type="button"
            className="streak-calendar-close-btn"
            onClick={onClose}
            aria-label="Close streak calendar"
          >
            ×
          </button>
        </div>

        {streakStats && (
          <div className="streak-calendar-streak-card">

            <div className="new-streak-headline">
              <div className="new-streak-value">{streakStats.currentStreak}</div>
              <p className="new-streak-label">day streak</p>
            </div>
          </div>
        )}
        
        <div className="streak-calendar-grid">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
            <div key={day} className="streak-calendar-weekday">{day}</div>
          ))}
          
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="streak-calendar-cell empty"></div>
          ))}
          
          {days.map((day, i) => {
            const isActive = dayStatuses[i];
            const isPrevActive = i > 0 ? dayStatuses[i - 1] : false;
            const isNextActive = i < days.length - 1 ? dayStatuses[i + 1] : false;
            
            const isPartOfStreak = isActive && (isPrevActive || isNextActive);
            const isSingleActive = isActive && !isPartOfStreak;
            
            // Determine border radius for the streak background pill
            // It should connect horizontally
            const isStreakStart = isPartOfStreak && !isPrevActive;
            const isStreakEnd = isPartOfStreak && !isNextActive;
            // Also need to handle week wraps (Sunday to Monday)
            const currentDayOfWeek = (startDayOffset + i) % 7;
            const isMonday = currentDayOfWeek === 0;
            const isSunday = currentDayOfWeek === 6;
            
            const roundedLeft = isStreakStart || isMonday;
            const roundedRight = isStreakEnd || isSunday;

            let pillStyle = {};
            if (isPartOfStreak) {
              pillStyle = {
                borderTopLeftRadius: roundedLeft ? '999px' : '0',
                borderBottomLeftRadius: roundedLeft ? '999px' : '0',
                borderTopRightRadius: roundedRight ? '999px' : '0',
                borderBottomRightRadius: roundedRight ? '999px' : '0',
                left: roundedLeft ? '10%' : '-4px',
                right: roundedRight ? '10%' : '-4px',
              };
            }

            return (
              <div key={day} className="streak-calendar-cell">
                {isPartOfStreak && <div className="streak-bg-pill" style={pillStyle}></div>}
                <div className={`streak-calendar-day ${isActive ? 'active' : ''} ${isPartOfStreak ? 'streak' : ''}`}>
                  {isPartOfStreak ? (
                    <img src={iconFire} alt="fire" className="streak-fire-icon" />
                  ) : (
                    <span className="streak-day-text">{day}</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {endBlanks.map((_, i) => (
            <div key={`end-blank-${i}`} className="streak-calendar-cell empty"></div>
          ))}
        </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
