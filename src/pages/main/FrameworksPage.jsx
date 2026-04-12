import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import { IoChevronBack, IoChevronDown, IoChevronForward } from 'react-icons/io5';
import learnLibraryData from '../../assets/data/learnLibraryData.json';
import './FrameworksPage.css';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'facial-expression', label: 'Facial Expression' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'pronunciation', label: 'Pronunciation' },
  { id: 'articulation', label: 'Articulation' },
];

const PAGE_SIZE = 6;

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ─── Item Card ──────────────────────────────────────────────────────────────── */
function toCategoryId(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function getBriefSummary(summary) {
  if (!summary) return '';
  const clean = String(summary).trim();
  if (clean.length <= 110) return clean;
  return `${clean.slice(0, 107).trimEnd()}...`;
}

function getInitials(label = '') {
  return String(label)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BK';
}

function ItemCard({ item, onOpen, animationClass = '' }) {
  const [thumbSrc, setThumbSrc] = useState(
    `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`,
  );

  return (
    <button type="button" className={`fh-card ${animationClass}`.trim()} onClick={() => onOpen(item)}>
      <div className="fh-card-thumb-wrap">
        <img
          className="fh-card-thumb"
          src={thumbSrc}
          alt={item.name}
          loading="lazy"
          onError={() => setThumbSrc(`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`)}
        />
      </div>
      <div className="fh-card-meta">
        <span className="fh-card-author-avatar" aria-hidden="true">{getInitials(item.author)}</span>
        <div className="fh-card-copy">
          <h3 className="fh-card-name">{item.name}</h3>
          <p className="fh-card-author">{item.author}</p>
          <p className="fh-card-summary">{getBriefSummary(item.summary)}</p>
        </div>
      </div>
    </button>
  );
}

function ItemModal({ item, onClose }) {
  const hasVideo = Boolean(item.youtubeId);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fh-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Learn ${item.name}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fh-modal">
        <div className="fh-modal-header">
          <div className="fh-modal-title-block">
            {item.author && <span className="fh-modal-author">{item.author}</span>}
            <h2 className="fh-modal-title">{item.name}</h2>
          </div>
          <button className="fh-modal-close" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        {hasVideo ? (
          <div className="fh-video-wrapper">
            <iframe
              className="fh-video"
              src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0&modestbranding=1`}
              title={`${item.name} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="fh-video-placeholder">No video available yet.</div>
        )}

        <p className="fh-modal-summary">{item.summary}</p>

        {item.studyLink && (
          <a
            className="fh-modal-link"
            href={item.studyLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read full guide <IconExternal />
          </a>
        )}
      </div>
    </div>
  );
}

export default function FrameworksPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const catId = toCategoryId(location.state?.lessonItem?.category || location.state?.lessonItem?._categoryId);
    return (catId && CATEGORIES.find((c) => c.id === catId)) ? catId : CATEGORIES[0].id;
  });
  const [activeModal, setActiveModal] = useState(() => location.state?.lessonItem ?? null);
  const [query, setQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (location.state?.lessonItem) window.history.replaceState({}, '', location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allItems = useMemo(() => {
    return (learnLibraryData || []).map((item) => ({
      ...item,
      _categoryId: toCategoryId(item.category),
    }));
  }, []);

  const scopedItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    return allItems.filter((item) => item._categoryId === activeTab);
  }, [activeTab, allItems]);

  const authorOptions = useMemo(() => {
    const set = new Set(scopedItems.map((it) => it.author).filter(Boolean));
    return ['all', ...[...set].sort()];
  }, [scopedItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? scopedItems.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.author?.toLowerCase().includes(q) ||
          it.summary?.toLowerCase().includes(q),
      )
      : [...scopedItems];

    if (authorFilter !== 'all') list = list.filter((it) => it.author === authorFilter);
    return list;
  }, [scopedItems, query, authorFilter]);

  const pageCount = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered.length]);
  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const openModal = useCallback((item) => setActiveModal(item), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const switchTab = (id) => {
    setActiveTab(id);
    setQuery('');
    setAuthorFilter('all');
    setPage(0);
  };

  return (
    <div className="fh-page">
      <div className="fh-controls dashboard-anim-top">
        <div className="fh-search-wrap">
          <span className="fh-search-icon"><IconSearch /></span>
          <input
            className="fh-search"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            aria-label="Search items"
          />
          {query && (
            <button
              className="fh-search-clear"
              onClick={() => { setQuery(''); setPage(0); }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="fh-sort-wrap">
          <select
            className="fh-sort"
            value={authorFilter}
            onChange={(e) => { setAuthorFilter(e.target.value); setPage(0); }}
            aria-label="Filter by author"
          >
            <option value="all">All Authors</option>
            {authorOptions.filter((a) => a !== 'all').map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span className="fh-sort-chevron"><IoChevronDown aria-hidden="true" /></span>
        </div>
      </div>

      <div className="fh-tabs dashboard-anim-top dashboard-anim-delay-1" role="tablist" aria-label="Content categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeTab === cat.id}
            className={`fh-tab${activeTab === cat.id ? ' fh-tab--active' : ''}`}
            onClick={() => switchTab(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {pageItems.length === 0 ? (
        <div className="fh-empty dashboard-anim-bottom dashboard-anim-delay-2" aria-live="polite">
          {query ? `No results for "${query}"` : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="fh-grid">
          {pageItems.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              onOpen={openModal}
              animationClass={`dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 2, 9)}`}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="fh-pagination-wrap dashboard-anim-bottom dashboard-anim-delay-3">
          <ReactPaginate
            previousLabel={<IoChevronBack aria-hidden="true" />}
            nextLabel={<IoChevronForward aria-hidden="true" />}
            breakLabel="..."
            pageCount={pageCount}
            forcePage={Math.min(page, Math.max(0, pageCount - 1))}
            onPageChange={(selectedItem) => setPage(selectedItem.selected)}
            ariaLabelBuilder={(nextPage) => `Go to frameworks page ${nextPage}`}
            containerClassName="history-pagination"
            pageClassName="history-pagination-page"
            pageLinkClassName="history-pagination-link"
            previousClassName="history-pagination-page history-pagination-nav"
            nextClassName="history-pagination-page history-pagination-nav"
            previousLinkClassName="history-pagination-link"
            nextLinkClassName="history-pagination-link"
            breakClassName="history-pagination-break"
            activeClassName="active"
            disabledClassName="disabled"
          />
        </div>
      )}

      {activeModal && <ItemModal item={activeModal} onClose={closeModal} />}
    </div>
  );
}
