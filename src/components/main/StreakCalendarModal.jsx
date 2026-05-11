import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Lottie from 'lottie-react';
import { getAssetUrl } from '../../utils/assetUtils';
import fireAnimationData from '../../assets/Lottie/fire.json';

const iconFire = getAssetUrl('icons/Icon-Fire.svg');
import './StreakCalendarModal.css';

// Heatmap color scale: Dark (less) -> Light (more)
function getSessionIntensityColor(count) {
  if (count <= 0) return '#e2e8f0'; // Default empty
  if (count === 1) return '#d1fae5'; // Very light emerald
  if (count === 2) return '#a7f3d0';
  if (count === 3) return '#34d399';
  if (count === 4) return '#10b981';
  return '#059669'; // Solid emerald
}

const DayFireIcon = () => (
  <div className="streak-fire-icon-lottie">
    <Lottie animationData={fireAnimationData} loop={true} />
  </div>
);

export default function StreakCalendarModal({ isOpen, onClose, sessionCountsByDay, streakStats }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const lottieFireNode = useMemo(() => <Lottie animationData={fireAnimationData} loop={true} />, []);

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

  // Pre-calculate session counts for each day
  const dayCounts = days.map((day) => {
    const key = getLocalDateKey(day);
    return sessionCountsByDay.get(key) || 0;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="streak-calendar-overlay bigkas-modal-scrim" 
          onClick={onClose}
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
            <div className="streak-intensity-explanation">
              <span className="intensity-label">Less</span>
              <div className="intensity-boxes">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div 
                    key={lvl} 
                    className="intensity-box" 
                    style={{ backgroundColor: getSessionIntensityColor(lvl) }}
                  />
                ))}
              </div>
              <span className="intensity-label">More</span>
            </div>
            <div className="streak-card-main-row">
              <div className="new-streak-fire">
                {lottieFireNode}
              </div>
              <div className="new-streak-headline">
                <div className="new-streak-value">{streakStats.currentStreak}</div>
                <p className="new-streak-label">day streak</p>
              </div>
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
            const count = dayCounts[i];
            const isActive = count > 0;
            const isPrevActive = i > 0 ? dayCounts[i - 1] > 0 : false;
            const isNextActive = i < days.length - 1 ? dayCounts[i + 1] > 0 : false;
            
            const isPartOfStreak = isActive && (isPrevActive || isNextActive);
            
            const currentDayOfWeek = (startDayOffset + i) % 7;
            const isMonday = currentDayOfWeek === 0;
            const isSunday = currentDayOfWeek === 6;
            
            const roundedLeft = isPartOfStreak && (!isPrevActive || isMonday);
            const roundedRight = isPartOfStreak && (!isNextActive || isSunday);

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
                <div 
                  className={`streak-calendar-day ${isActive ? 'active' : ''} ${isPartOfStreak ? 'streak' : ''}`}
                  style={{ backgroundColor: isActive ? getSessionIntensityColor(count) : undefined }}
                >
                  {isActive ? (
                    <DayFireIcon />
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
        </div>
      )}
    </AnimatePresence>
  );
}
