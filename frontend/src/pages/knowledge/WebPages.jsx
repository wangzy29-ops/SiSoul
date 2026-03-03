import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { docsApi, webApi, subscriptionsApi } from '../../api';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export default function WebPages() {
    const [pages, setPages] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('manual'); // manual | subscribe
    const [addOpen, setAddOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [subUrl, setSubUrl] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const navigate = useNavigate();

    const loadPages = () => {
        setLoading(true);
        docsApi.list({ doc_type: 'web' })
            .then(d => setPages(Array.isArray(d) ? d : []))
            .catch(() => setPages([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadPages();
        subscriptionsApi.list().then(setSubscriptions).catch(() => { });
    }, []);

    const filtered = pages.filter(p =>
        !searchQuery || (p.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddUrl = async () => {
        if (!url.trim()) return;
        try {
            await webApi.ingest({ url: url.trim() });
            setUrl('');
            setAddOpen(false);
            loadPages();
        } catch (e) {
            alert('导入失败: ' + e.message);
        }
    };

    const handleAddSub = async () => {
        if (!subUrl.trim()) return;
        try {
            await subscriptionsApi.create({ url_pattern: subUrl.trim(), feed_type: 'rss' });
            setSubUrl('');
            const subs = await subscriptionsApi.list();
            setSubscriptions(subs);
        } catch (e) {
            alert('添加订阅失败: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确认删除该网页？')) return;
        await docsApi.delete(id).catch(() => { });
        loadPages();
    };

    return (
        <div className="page-enter">
            {/* Toolbar */}
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <button className="btn btn-primary km-upload-btn" style={{ marginLeft: -4, borderRadius: 6 }} onClick={() => setAddOpen(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        新建网页
                    </button>
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="搜索网页..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="km-view-toggle">
                        <button className={`km-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="列表视图">
                            <svg viewBox="0 0 24 24" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        </button>
                        <button className={`km-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="网格视图">
                            <svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="km-type-filters" style={{ marginLeft: -4 }}>
                <button
                    className={`km-type-chip ${tab === 'manual' ? 'active' : ''}`}
                    onClick={() => setTab('manual')}
                >
                    主动模式
                </button>
                <button
                    className={`km-type-chip ${tab === 'subscribe' ? 'active' : ''}`}
                    onClick={() => setTab('subscribe')}
                >
                    订阅模式
                </button>
                {tab === 'manual' && <span className="km-file-count">{filtered.length} 个网页</span>}
            </div>

            {tab === 'manual' ? (
                /* ===== Manual Mode: Web docs list ===== */
                loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon="🌐" title="暂无网页" desc="点击添加网页按钮，输入URL即可抓取并解析内容" />
                ) : viewMode === 'list' ? (
                    <div className="km-table-wrap">
                        <table className="km-table">
                            <thead>
                                <tr>
                                    <th className="km-th-name">标题</th>
                                    <th className="km-th-date">添加时间</th>
                                    <th style={{ width: 80 }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id} className="km-row" onClick={() => navigate(`/knowledge/documents/${p.id}`)}>
                                        <td className="km-td-name">
                                            <img src="/icons/HTML图标.png" alt="网页" className="km-file-icon-img" style={{ width: 24, height: 24, marginRight: 8, verticalAlign: 'middle' }} />
                                            <span className="km-file-title">{p.title}</span>
                                        </td>
                                        <td className="km-td-date">{formatDate(p.created_at)}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="km-icon-btn" title="删除" onClick={() => handleDelete(p.id)}>
                                                <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="file-grid">
                        {filtered.map(p => (
                            <div key={p.id} className="card file-card" onClick={() => navigate(`/knowledge/documents/${p.id}`)}>
                                <div className="file-icon" style={{ background: 'transparent' }}>
                                    <img src="/icons/HTML图标.png" alt="网页" style={{ width: 48, height: 48 }} />
                                </div>
                                <div className="file-name" title={p.title}>{p.title}</div>
                                <div className="file-meta">{formatDate(p.created_at)}</div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* ===== Subscribe Mode ===== */
                <div>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <input
                                className="form-input"
                                style={{ maxWidth: 400 }}
                                placeholder="输入RSS/博客订阅地址..."
                                value={subUrl}
                                onChange={e => setSubUrl(e.target.value)}
                            />
                            <button className="btn btn-secondary" onClick={handleAddSub}>添加订阅</button>
                        </div>
                    </div>
                    {subscriptions.length === 0 ? (
                        <EmptyState icon="📡" title="暂无订阅" desc="添加订阅后，关注的博主和网站新增内容将自动爬取" />
                    ) : (
                        <div className="card">
                            {subscriptions.map(sub => (
                                <div key={sub.id} className="list-item">
                                    <div className="list-item-icon" style={{ background: '#e8f7f5', color: '#12b5a0' }}>📡</div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{sub.url_pattern}</div>
                                        <div className="list-item-desc">类型: {sub.feed_type} · {sub.enabled ? '已启用' : '已禁用'}</div>
                                    </div>
                                    <span className={`tag ${sub.enabled ? 'tag-green' : 'tag-gray'}`}>{sub.enabled ? '运行中' : '已暂停'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add URL Modal */}
            <Modal open={addOpen} title="添加网页" onClose={() => setAddOpen(false)} footer={
                <>
                    <button className="btn btn-outline" onClick={() => setAddOpen(false)}>取消</button>
                    <button className="btn btn-primary" onClick={handleAddUrl}>导入</button>
                </>
            }>
                <div className="form-group">
                    <label className="form-label">网页URL</label>
                    <input className="form-input" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
                    <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        输入网页链接后将自动爬取并解析内容
                    </div>
                </div>
            </Modal>
        </div>
    );
}
