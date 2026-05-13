import { motion, AnimatePresence } from 'framer-motion';
import { getSpriteUrl } from '../../utils/assetUtils';

const rankBronze = getSpriteUrl('Rank/rank-bronze.webp');
const rankSilverImage = getSpriteUrl('Rank/rank-silver.webp');
const rankGoldImage = getSpriteUrl('Rank/rank-gold.webp');
const rankMythrilImage = getSpriteUrl('Rank/rank-mythril.webp');
const rankLegendaryImage = getSpriteUrl('Rank/rank-legendary.webp');
import { BIGKAS_LEVELS } from '../../utils/activityProgress';
import './RankListModal.css';

const RANK_SPRITES = {
  1: rankBronze,
  2: rankSilverImage,
  3: rankGoldImage,
  4: rankMythrilImage,
  5: rankLegendaryImage,
};

export default function RankListModal({ isOpen, onClose, currentLevelNumber }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="rank-modal-overlay"
          onClick={onClose}
        >
          <motion.div
            className="rank-modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transform: 'translateZ(0)' }} /* Force GPU acceleration */
          >
            <div className="rank-modal-header">
              <h2 className="rank-modal-title">Speaker Ranks</h2>
              <button
                type="button"
                className="dashboard-overlay-close-btn"
                onClick={onClose}
                aria-label="Close ranks"
              >
                ×
              </button>
            </div>

            <div className="rank-modal-list">
              {BIGKAS_LEVELS.map((level) => {
                const isCurrent = level.number === currentLevelNumber;
                let sprite = RANK_SPRITES[level.number];
                
                // Fallback / Extra safety for Level 1 Bronze
                if (level.number === 1) sprite = rankBronze;
                if (level.number === 2) sprite = rankSilverImage;
                if (level.number === 3) sprite = rankGoldImage;
                if (level.number === 4) sprite = rankMythrilImage;
                if (level.number === 5) sprite = rankLegendaryImage;

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
                      />
                    </div>
                    <div className="rank-modal-item-info">
                      <p className="rank-modal-item-label">
                        {isCurrent ? 'Current Level' : `Level ${level.number}`}
                      </p>
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
        </div>
      )}
    </AnimatePresence>
  );
}
