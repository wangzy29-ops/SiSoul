import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api';
import EmptyState from '../../components/EmptyState';

const PLATFORM_TABS = [
    { key: 'all', label: '全部' },
    { key: 'taobao', label: '淘宝' },
    { key: 'tmall', label: '天猫' },
    { key: 'jd', label: '京东' },
    { key: 'pdd', label: '拼多多' },
    { key: 'vip', label: '唯品会' },
    { key: 'douyin', label: '抖音' },
    { key: 'bieyang', label: '别样海外购' },
];

const PLATFORM_COLORS = {
    taobao: { bg: '#FF6A0020', text: '#FF6A00', label: '淘宝' },
    tmall: { bg: '#FF000020', text: '#FF0000', label: '天猫' },
    jd: { bg: '#E8191920', text: '#E81919', label: '京东' },
    pdd: { bg: '#E0232620', text: '#E02326', label: '拼多多' },
    vip: { bg: '#FF6A9820', text: '#FF1493', label: '唯品会' },
    douyin: { bg: '#00000020', text: '#000000', label: '抖音' },
    bieyang: { bg: '#4A90E220', text: '#4A90E2', label: '别样' },
    unknown: { bg: '#9AA0A620', text: '#9AA0A6', label: '未识别' },
};

function getPlatformStyle(p) {
    return PLATFORM_COLORS[p] || { bg: '#9AA0A620', text: '#9AA0A6', label: p || '未知' };
}

function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export default function Products() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [tab, setTab] = useState('all');

    // 新增录入链接弹窗状态
    const [showAddModal, setShowAddModal] = useState(false);
    const [addUrl, setAddUrl] = useState('');
    const [addTitle, setAddTitle] = useState('');
    const [adding, setAdding] = useState(false);

    const load = () => {
        setLoading(true);
        productsApi.list()
            .then(d => setProducts(Array.isArray(d) ? d : []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = products.filter(p => {
        const matchTab = tab === 'all' || p.platform === tab;
        const matchSearch = !searchQuery || (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchTab && matchSearch;
    });

    const handleDelete = async (id) => {
        if (!confirm('确认删除该商品记录？')) return;
        await productsApi.delete(id).catch(() => { });
        load();
    };

    const openUrl = (url) => {
        if (url) window.open(url, '_blank');
    };

    const goToDetail = (id) => {
        navigate(`/actions/products/${id}`);
    };

    const handleAddProduct = async () => {
        if (!addUrl.trim()) return alert('请输入商品链接');
        setAdding(true);
        try {
            await productsApi.create({ url: addUrl.trim(), title: addTitle.trim() || undefined });
            setShowAddModal(false);
            setAddUrl('');
            setAddTitle('');
            load(); // 刷新列表
        } catch (e) {
            alert('录入失败: ' + e.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="page-enter">
            {/* Toolbar */}
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>商品</span>
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="搜索商品..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>

                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', borderRadius: 8 }} onClick={() => setShowAddModal(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        录入商品链接
                    </button>

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

            {/* Platform Tabs */}
            <div className="km-type-filters">
                {PLATFORM_TABS.map(t => (
                    <button
                        key={t.key}
                        className={`km-type-chip ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
                <span className="km-file-count">{filtered.length} 个商品</span>
            </div>

            {/* 新增商品链接弹窗 */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => !adding && setShowAddModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">录入商品链接</h3>
                            <button className="modal-close" onClick={() => !adding && setShowAddModal(false)}>
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>商品链接 (支持什么值得买smzdm.com链接)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="https://www.smzdm.com/..."
                                    value={addUrl}
                                    onChange={e => setAddUrl(e.target.value)}
                                    disabled={adding}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 14 }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>指定标题 (可选，留空则自动抓取)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="选填"
                                    value={addTitle}
                                    onChange={e => setAddTitle(e.target.value)}
                                    disabled={adding}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 14 }}
                                />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-outline" onClick={() => setShowAddModal(false)} disabled={adding}>取消</button>
                            <button className="btn btn-primary" onClick={handleAddProduct} disabled={adding} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {adding ? <><div className="spinner" style={{ width: 14, height: 14 }} /> 解析抓取中...</> : '开始录入'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon="🛍️" title="暂无商品记录" desc="通过钉钉 OpenClaw 发送什么值得买(smzdm.com)商品链接后将显示在这里" />
            ) : viewMode === 'grid' ? (
                /* ===== Grid View ===== */
                <div className="file-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {filtered.map(p => {
                        const ps = getPlatformStyle(p.platform);
                        return (
                            <div
                                key={p.id}
                                className="card file-card"
                                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                                onClick={() => goToDetail(p.id)}
                            >
                                {/* 商品主图 */}
                                <div style={{
                                    width: '100%', height: 140, background: 'var(--color-bg-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '8px 8px 0 0', overflow: 'hidden',
                                }}>
                                    {(p.main_image_url || p.main_image_path) ? (
                                        <img
                                            src={p.main_image_path ? productsApi.getImageUrl(p.id) : p.main_image_url}
                                            alt={p.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={e => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 48, opacity: 0.3 }}>🛍️</span>
                                    )}
                                </div>

                                {/* 平台标签 */}
                                <span style={{
                                    position: 'absolute', top: 8, right: 8,
                                    background: ps.bg, color: ps.text,
                                    fontSize: 'var(--font-size-xs)', fontWeight: 600,
                                    padding: '2px 8px', borderRadius: 10,
                                    backdropFilter: 'blur(4px)',
                                }}>
                                    {ps.label}
                                </span>

                                {/* 信息区 */}
                                <div style={{ padding: '10px 12px' }}>
                                    <div className="file-name" title={p.title} style={{ marginBottom: 4, fontSize: 'var(--font-size-sm)', fontWeight: 500, lineHeight: 1.4 }}>
                                        {p.title}
                                    </div>

                                    {/* AI 标签区域 */}
                                    {(p.level2_tag || p.level3_tag) && (
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                            {p.level2_tag && <span className="tag tag-blue" style={{ fontSize: 10, padding: '1px 6px' }}>{p.level2_tag}</span>}
                                            {p.level3_tag && <span className="tag tag-green" style={{ fontSize: 10, padding: '1px 6px' }}>{p.level3_tag}</span>}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {p.price ? (
                                            <span style={{ color: '#EA4335', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>¥{p.price}</span>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>暂无价格</span>
                                        )}
                                        <button
                                            className="km-icon-btn"
                                            title="删除"
                                            onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                                        >
                                            <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ===== List View ===== */
                <div className="km-table-wrap">
                    <table className="km-table">
                        <thead>
                            <tr>
                                <th className="km-th-name">商品名称</th>
                                <th style={{ width: 80 }}>平台</th>
                                <th style={{ width: 80 }}>价格</th>
                                <th className="km-th-date">时间</th>
                                <th style={{ width: 80 }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const ps = getPlatformStyle(p.platform);
                                return (
                                    <tr key={p.id} className="km-row" onClick={() => goToDetail(p.id)}>
                                        <td className="km-td-name">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="km-file-icon" style={{ color: ps.text }}>🛍️</span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <span className="km-file-title" style={{ lineHeight: 1.2 }}>{p.title}</span>
                                                    {(p.level2_tag || p.level3_tag) && (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            {p.level2_tag && <span className="tag tag-blue" style={{ fontSize: 10, padding: '0 4px' }}>{p.level2_tag}</span>}
                                                            {p.level3_tag && <span className="tag tag-green" style={{ fontSize: 10, padding: '0 4px' }}>{p.level3_tag}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                background: ps.bg, color: ps.text,
                                                fontSize: 'var(--font-size-xs)', fontWeight: 500,
                                                padding: '2px 8px', borderRadius: 10,
                                            }}>
                                                {ps.label}
                                            </span>
                                        </td>
                                        <td style={{ color: p.price ? '#EA4335' : 'var(--color-text-muted)', fontWeight: p.price ? 600 : 400 }}>
                                            {p.price ? `¥${p.price}` : '-'}
                                        </td>
                                        <td className="km-td-date">{formatDate(p.send_time || p.created_at)}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="km-icon-btn" title="删除" onClick={() => handleDelete(p.id)}>
                                                <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
