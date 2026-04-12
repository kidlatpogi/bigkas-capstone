import './FilterTabs.css';

/**
 * FilterTabs — reusable horizontal pill/tab filter bar.
 *
 * Props:
 *   tabs     {Array<{ label: string, value: string }>}  — tab definitions
 *   active   {string}                                   — currently active value
 *   onChange {(value: string) => void}                  — called on tab click
 *   disabled {boolean}                                  — disables interaction
 *   className {string}                                  — optional extra class
 */
function FilterTabs({ tabs = [], active, onChange, disabled = false, className = '' }) {
  return (
    <div
      className={`filter-tabs ${className}`.trim()}
      role="tablist"
      aria-disabled={disabled}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          disabled={disabled}
          className={`filter-tab-btn${active === tab.value ? ' active' : ''}${disabled ? ' disabled' : ''}`}
          onClick={() => {
            if (disabled) return;
            onChange(tab.value);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default FilterTabs;
