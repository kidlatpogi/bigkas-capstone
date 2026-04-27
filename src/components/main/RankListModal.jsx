import { motion, AnimatePresence } from 'framer-motion';
import rankBronzeImage from '../../assets/Sprites/Rank/rank-bronze.png';
import rankSilverImage from '../../assets/Sprites/Rank/rank-silver.png';
import rankGoldImage from '../../assets/Sprites/Rank/rank-gold.png';
import rankMythrilImage from '../../assets/Sprites/Rank/rank-mythril.png';
import rankLegendaryImage from '../../assets/Sprites/Rank/rank-legendary.png';
import { BIGKAS_LEVELS } from '../../utils/activityProgress';
import './RankListModal.css';

const RANK_SPRITES = {
  1: rankBronzeImage,
  2: rankSilverImage,
  3: rankGoldImage,
  4: rankMythrilImage,
  5: rankLegendaryImage,
};

export default function RankListModal({ isOpen, onClose, currentLevelNumber }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="rank-modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <motion.div
            className="rank-modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformZ: 0 }} /* Force GPU acceleration */
          >
            <div className="rank-modal-header">
              <h2 className="rank-modal-title">Speaker Ranks</h2>
              <button className="rank-modal-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="rank-modal-list">
              {BIGKAS_LEVELS.map((level) => {
                const isCurrent = level.number === currentLevelNumber;
                const sprite = RANK_SPRITES[level.number];

                return (
                  <div
                    key={level.number}
                    className={`rank-modal-item ${isCurrent ? 'is-current' : ''}`}
                  >
                    <div className="rank-modal-item-visual">
                      <img 
                        src={sprite} 
                        alt={level.name} 
                        className="rank-modal-item-sprite" 
                        decoding="async"
                        loading="eager"
                      />
                    </div>
                    <div className="rank-modal-item-info">
                      <p className="rank-modal-item-label">Level {level.number}</p>
                      <h3 className="rank-modal-item-name">{level.name}</h3>
                    </div>
                    {isCurrent && (
                      <div className="rank-modal-current-badge">
                        Current
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
