import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionContext } from '../../context/useSessionContext';
import { buildRoute } from '../../utils/constants';
import BackButton from '../../components/common/BackButton';
import FilterTabs from '../../components/common/FilterTabs';
import SessionListItem from '../../components/common/SessionListItem';
import {
    getSessionMode,
    getRecentToneClass,
} from '../../utils/sessionFormatting';
import './InnerPages.css';
import './ProgressPage.css';

const FILTER_TABS = [
    { label: 'All Pre-Tests', value: 'All' },
    { label: 'Scripted Test', value: 'Scripted Test' },
    { label: 'Free Test', value: 'Free Test' },
];

function PreTestHistoryPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { sessions, fetchAllSessions, isLoading } = useSessionContext();
    const [filter, setFilter] = useState(location.state?.defaultFilter || 'All');

    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchAllSessions();
    }, [fetchAllSessions]);


    const filterSession = (s) => {
        if (getSessionMode(s) !== 'Pre-Test') return false;

        const isFreeSpeech = (session) => String(session?.speaking_mode || '').trim().toLowerCase() === 'free';

        if (filter === 'Scripted Test') {
            return !isFreeSpeech(s);
        }
        if (filter === 'Free Test') {
            return isFreeSpeech(s);
        }
        return true;
    };

    const filtered = sessions.filter(filterSession);

    return (
        <div className="inner-page">
            <div className="inner-page-header centered-header">
                <BackButton />
                <h1 className="inner-page-title">Pre-Test History</h1>
            </div>

            <div style={{ marginTop: 8, marginBottom: 12 }}>
                <FilterTabs
                    tabs={FILTER_TABS}
                    active={filter}
                    onChange={(val) => { setFilter(val); setPage(1); }}
                />
            </div>

            {isLoading && sessions.length === 0 && (
                <div className="page-loading">Loading…</div>
            )}

            {!isLoading && filtered.length === 0 && (
                <div className="empty-state">
                    <p className="empty-title">No pre-tests</p>
                    <p className="empty-desc">You have not recorded any Pre-Tests for this category.</p>
                </div>
            )}

            <div className="sessions-list">
                {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => {
                    const mode = getSessionMode(s);
                    return (
                        <SessionListItem
                            key={s.id}
                            session={s}
                            title={s?.script_title || s?.title || 'Pre-Test Session'}
                            mode={mode}
                            toneClass={getRecentToneClass(s.confidence_score ?? 0)}
                            onClick={() => navigate(buildRoute.sessionResult(s.id), { state: s })}
                        />
                    );
                })}
            </div>

            {Math.ceil(filtered.length / PAGE_SIZE) > 1 && (
                <div className="paged-nav">
                    <button className="paged-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&#8249; Prev</button>
                    <span className="paged-info">{page} / {Math.ceil(filtered.length / PAGE_SIZE)}</span>
                    <button className="paged-btn" disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next &#8250;</button>
                </div>
            )}
        </div>
    );
}

export default PreTestHistoryPage;
