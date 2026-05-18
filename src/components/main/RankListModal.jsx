import { getSpriteUrl } from '../../utils/assetUtils';
import { BIGKAS_LEVELS } from '../../utils/activityProgress';
import './RankListModal.css';

const rankBronze = getSpriteUrl('Rank/rank-bronze.webp');
const rankSilverImage = getSpriteUrl('Rank/rank-silver.webp');
const rankGoldImage = getSpriteUrl('Rank/rank-gold.webp');
const rankMythrilImage = getSpriteUrl('Rank/rank-mythril.webp');
const rankLegendaryImage = getSpriteUrl('Rank/rank-legendary.webp');

const RANK_SPRITES = {
  1: rankBronze,
  2: rankSilverImage,
  3: rankGoldImage,
  4: rankMythrilImage,
  5: rankLegendaryImage,
};

const RANK_LEVELS = BIGKAS_LEVELS.map((level) => ({
  ...level,
  sprite: RANK_SPRITES[level.number] || rankBronze,
}));

export default function RankListModal({ isOpen, onClose, currentLevelNumber }) {
  if (!isOpen) return null;

  return (
    <div
      className="rank-modal-overlay"
      onClick={onClose}
    >
      <div
        className="rank-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rank-modal-header">
          <h2 className="rank-modal-title">Speaker Ranks</h2>
          <button
            type="button"
            className="dashboard-overlay-close-btn"
            onClick={onClose}
            aria-label="Close ranks"
          >
            &times;
          </button>
        </div>

        <div className="rank-modal-list">
          {RANK_LEVELS.map((level) => {
            const isCurrent = level.number === currentLevelNumber;

            return (
              <div
                key={level.number}
                className={`rank-modal-item ${isCurrent ? 'is-current' : ''}`}
              >
                <div className="rank-modal-item-visual">
                  <img
                    src={level.sprite}
                    alt={level.name}
                    className="rank-modal-item-sprite"
                    loading="eager"
                    decoding="async"
                    fetchPriority={isCurrent ? 'high' : 'auto'}
                    width="48"
                    height="48"
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
      </div>
    </div>
  );
}
