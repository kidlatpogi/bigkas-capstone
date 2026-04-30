/* FrameworksPageMobile.jsx */
import { useState, useMemo, useCallback, useEffect } from 'react';
import ReactPaginate from 'react-paginate';
import { 
  IoChevronBack, 
  IoChevronForward, 
  IoSearch, 
  IoClose, 
  IoOpenOutline, 
  IoChevronDown 
} from 'react-icons/io5';
import learnLibraryData from '../../assets/data/learnLibraryData.json';
import './FrameworksPageMobile.css';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'facial-expression', label: 'Facial Expression' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'pronunciation', label: 'Pronunciation' },
  { id: 'articulation', label: 'Articulation' },
];

const PAGE_SIZE = 6;

function toCategoryId(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function getInitials(label = '') {
  return String(label)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BK';
}

function ItemCard({ item, onOpen, index }) {
  const [thumbSrc, setThumbSrc] = useState(
    `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`
  );

  return (
    <button 
      type="button" 
      className={`fh-mobile-card dashboard-anim-bottom dashboard-anim-delay-${Math.min(index + 1, 9)}`}
      onClick={() => onOpen(item)}
    >
      <img
        className="fh-mobile-card-thumb"
        src={thumbSrc}
        alt={item.name}
        loading="lazy"
        onError={() => setThumbSrc(`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`)}
      />
      <div className="fh-mobile-card-body">
        <div className="fh-mobile-card-avatar">{getInitials(item.author)}</div>
        <div className="fh-mobile-card-info">
          <h3 className="fh-mobile-card-name">{item.name}</h3>
          <p className="fh-mobile-card-author">{item.author}</p>
          <p className="fh-mobile-card-summary">{item.summary}</p>
        </div>
      </div>
    </button>
  );
}

function ItemModal({ item, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="fh-mobile-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fh-mobile-modal-sheet">
        <div className="fh-mobile-modal-handle" />
        <div className="fh-mobile-modal-header">
          <div className="fh-mobile-modal-titles">
            <span className="fh-mobile-modal-kicker">{item.author}</span>
            <h2 className="fh-mobile-modal-title">{item.name}</h2>
          </div>
          <button className="fh-mobile-modal-close" onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        {item.youtubeId ? (
          <div className="fh-mobile-video-container">
            <iframe
              className="fh-mobile-video-frame"
              src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0&modestbranding=1`}
              title={item.name}
              allowFullScreen
            />
          </div>
        ) : (
          <div style={{ height: 120, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>
            No video preview available
          </div>
        )}

        <div className="fh-mobile-modal-body">
          <p className="fh-mobile-modal-summary">{item.summary}</p>
          {item.studyLink && (
            <a href={item.studyLink} target="_blank" rel="noopener noreferrer" className="fh-mobile-modal-action">
              Read Detailed Guide <IoOpenOutline size={20} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FrameworksPageMobile({ initialItem }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activeModal, setActiveModal] = useState(initialItem || null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const allItems = useMemo(() => {
    return (learnLibraryData || []).map((item) => ({
      ...item,
      _categoryId: toCategoryId(item.category),
    }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allItems;
    
    if (activeTab !== 'all') {
      list = list.filter((item) => item._categoryId === activeTab);
    }
    
    if (q) {
      list = list.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.author?.toLowerCase().includes(q) ||
          it.summary?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allItems, activeTab, query]);

  const pageCount = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered.length]);
  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="fh-mobile-root no-scrollbar">
      <div className="fh-mobile-header dashboard-anim-top">
        <div className="fh-mobile-search-bar">
          <IoSearch className="fh-mobile-search-icon" />
          <input
            className="fh-mobile-search-input"
            type="search"
            placeholder="Search frameworks..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          />
          {query && (
            <button className="fh-mobile-search-clear" onClick={() => { setQuery(''); setPage(0); }}>
              <IoClose />
            </button>
          )}
        </div>

        <div className="fh-mobile-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`fh-mobile-chip ${activeTab === cat.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(cat.id); setPage(0); }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fh-mobile-content">
        {pageItems.length === 0 ? (
          <div className="fh-mobile-empty dashboard-anim-bottom">
            {query ? `No results for "${query}"` : 'No frameworks found in this category.'}
          </div>
        ) : (
          <div className="fh-mobile-grid">
            {pageItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                onOpen={setActiveModal}
                index={index}
              />
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <div className="fh-mobile-pagination dashboard-anim-bottom">
            <ReactPaginate
              previousLabel={<IoChevronBack />}
              nextLabel={<IoChevronForward />}
              breakLabel="..."
              pageCount={pageCount}
              forcePage={page}
              onPageChange={(selectedItem) => setPage(selectedItem.selected)}
              containerClassName="history-pagination"
              pageClassName="history-pagination-page"
              pageLinkClassName="history-pagination-link"
              previousClassName="history-pagination-page history-pagination-nav"
              nextClassName="history-pagination-page history-pagination-nav"
              previousLinkClassName="history-pagination-link"
              nextLinkClassName="history-pagination-link"
              activeClassName="active"
              disabledClassName="disabled"
            />
          </div>
        )}
      </div>

      {activeModal && <ItemModal item={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
}
