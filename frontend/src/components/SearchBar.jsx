import { useState } from 'react';

export default function SearchBar({ onSearch, placeholder = '搜索你的记忆库...' }) {
    const [query, setQuery] = useState('');
    const [scopeFilter, setScopeFilter] = useState('global');
    const [actionFilter, setActionFilter] = useState(null);

    const scopeFilters = [
        { key: 'global', label: '全局内容' },
        { key: 'note', label: '单个笔记' },
        { key: 'doc', label: '单个文档' },
        { key: 'web', label: '单个网页' },
    ];

    const actionFilters = [
        { key: 'summary', label: '摘要提取', icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="13" y2="16" /></> },
        { key: 'mindmap', label: '思维导图', icon: <><circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" /></> },
        { key: 'keyinfo', label: '关键信息', icon: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></> },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch?.({ query: query.trim(), scope: scopeFilter, action: actionFilter });
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="search-bar">
                    <span className="search-icon">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={placeholder}
                    />
                </div>
            </form>

            <div className="search-filters">
                {scopeFilters.map(f => (
                    <button
                        key={f.key}
                        className={`chip ${scopeFilter === f.key ? 'active' : ''}`}
                        onClick={() => setScopeFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
                <span style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
                {actionFilters.map(f => (
                    <button
                        key={f.key}
                        className={`chip ${actionFilter === f.key ? 'active' : ''}`}
                        onClick={() => setActionFilter(actionFilter === f.key ? null : f.key)}
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" style={{ stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>{f.icon}</svg>
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
