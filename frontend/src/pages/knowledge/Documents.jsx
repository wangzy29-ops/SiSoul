import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { docsApi } from '../../api';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

/* ---- File type icon config ---- */
const typeIcons = {
    word: { src: '/icons/DOCX图标.png', label: 'docx文件' },
    doc: { src: '/icons/DOC图标.png', label: 'doc文件' },
    pdf: { src: '/icons/PDF图标.png', label: 'pdf文件' },
    excel: { src: '/icons/XLSX图标.png', label: 'xlsx文件' },
    xls: { src: '/icons/XLS图标.png', label: 'xls文件' },
    ppt: { src: '/icons/PPT图标.png', label: 'pptx文件' },
    txt: { src: '/icons/TXT图标.png', label: 'txt文件' },
    note: { src: '/icons/云笔记.png', label: '笔记' },
    web: { src: '/icons/HTML图标.png', label: '网页' },
    image: { src: '/icons/JPG图标.png', label: '图片' },
    video: { src: '/icons/MP4图标.png', label: '视频' },
    audio: { src: '/icons/MP3图标.png', label: '音频' },
    other: { src: '/icons/其他文件.png', label: '其他文件' }
};

function getTypeInfo(type) {
    return typeIcons[type] || { src: '/icons/其他文件.png', label: type || '文件' };
}

function formatSize(b) {
    if (!b) return '-';
    const k = 1024;
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + s[i];
}

function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}

/* ---- Horizontal type filters ---- */
const typeFilters = [
    { key: 'all', label: '全部' },
    { key: 'word', label: 'DOC' },
    { key: 'excel', label: 'XLS' },
    { key: 'ppt', label: 'PPT' },
    { key: 'pdf', label: 'PDF' },
    { key: 'txt', label: 'TXT' },
    { key: 'image', label: '图片' },
    { key: 'other', label: '其他' },
];

// Types that map to the "other" category
const knownTypes = new Set(['word', 'doc', 'excel', 'xls', 'ppt', 'pdf', 'txt', 'image']);


export default function Documents() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');
    const [selected, setSelected] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const fileRef = useRef();
    const navigate = useNavigate();

    const loadDocs = () => {
        setLoading(true);
        docsApi.list()
            .then(d => setDocs(Array.isArray(d) ? d : []))
            .catch(() => setDocs([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadDocs(); }, []);

    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // Filter docs by type and search
    const filtered = docs.filter(d => {
        let matchType = true;
        if (typeFilter === 'all') {
            matchType = true;
        } else if (typeFilter === 'other') {
            matchType = !knownTypes.has(d.doc_type);
        } else if (typeFilter === 'word') {
            matchType = d.doc_type === 'word' || d.doc_type === 'doc';
        } else if (typeFilter === 'excel') {
            matchType = d.doc_type === 'excel' || d.doc_type === 'xls';
        } else {
            matchType = d.doc_type === typeFilter;
        }
        const matchSearch = !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchType && matchSearch;
    });

    // Selection
    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleSelectAll = () => {
        if (selectAll) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(d => d.id)));
        }
        setSelectAll(!selectAll);
    };

    // Batch delete
    const handleBatchDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`确认删除选中的 ${selected.size} 个文件？`)) return;
        try {
            await Promise.all([...selected].map(id => docsApi.delete(id)));
            setSelected(new Set());
            setSelectAll(false);
            loadDocs();
        } catch (e) {
            alert('批量删除失败: ' + e.message);
        }
    };

    const handleUpload = async () => {
        const files = fileRef.current?.files;
        if (!files?.length) return;
        const fd = new FormData();
        fd.append('file', files[0]);
        try {
            await docsApi.upload(fd);
            setUploadOpen(false);
            loadDocs();
        } catch (e) {
            alert('上传失败: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确认删除该文件？')) return;
        try {
            await docsApi.delete(id);
            setContextMenu(null);
            loadDocs();
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    };

    const handleRename = async () => {
        if (!renameValue.trim() || !renameOpen) return;
        try {
            await docsApi.update(renameOpen.id, { title: renameValue.trim() });
            setRenameOpen(null);
            loadDocs();
        } catch (e) {
            alert('重命名失败: ' + e.message);
        }
    };

    const openRename = (doc) => {
        setRenameValue(doc.title);
        setRenameOpen(doc);
        setContextMenu(null);
    };

    const handleContextMenu = (e, doc) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, doc });
    };

    return (
        <div className="page-enter">
            {/* ===== Toolbar ===== */}
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <button className="btn btn-primary km-upload-btn" style={{ marginLeft: -4, borderRadius: 6 }} onClick={() => setUploadOpen(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        手工上传
                    </button>
                    {selected.size > 0 && (
                        <button className="btn btn-danger km-action-btn" onClick={handleBatchDelete}>
                            <svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            删除 ({selected.size})
                        </button>
                    )}
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            placeholder="搜索文件..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
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

            {/* ===== Horizontal Type Filters ===== */}
            <div className="km-type-filters" style={{ marginLeft: -4 }}>
                {typeFilters.map(f => (
                    <button
                        key={f.key}
                        className={`km-type-chip ${typeFilter === f.key ? 'active' : ''}`}
                        onClick={() => setTypeFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
                <span className="km-file-count">{filtered.length} 个文件</span>
            </div>

            {/* ===== Content ===== */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon="📂"
                    title={searchQuery ? '未找到匹配的文件' : '暂无文件'}
                    desc={searchQuery ? '请尝试其他搜索词' : '点击上传按钮添加文件'}
                />
            ) : viewMode === 'list' ? (
                <div className="km-table-wrap">
                    <table className="km-table">
                        <thead>
                            <tr>
                                <th className="km-th-check">
                                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                                </th>
                                <th className="km-th-name">文件名</th>
                                <th className="km-th-size">大小</th>
                                <th className="km-th-type">类型</th>
                                <th className="km-th-date">修改时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(doc => {
                                const info = getTypeInfo(doc.doc_type);
                                return (
                                    <tr
                                        key={doc.id}
                                        className={`km-row ${selected.has(doc.id) ? 'selected' : ''}`}
                                        onContextMenu={(e) => handleContextMenu(e, doc)}
                                        onClick={() => navigate(`/knowledge/documents/${doc.id}`)}
                                    >
                                        <td className="km-td-check" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                                        </td>
                                        <td className="km-td-name">
                                            <img src={info.src} alt={info.label} className="km-file-icon-img" style={{ width: 24, height: 24, marginRight: 8, verticalAlign: 'middle' }} />
                                            <span className="km-file-title">{doc.title}</span>
                                            <span className="km-file-actions" onClick={e => e.stopPropagation()}>
                                                <button className="km-icon-btn" title="重命名" onClick={() => openRename(doc)}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="km-icon-btn" title="删除" onClick={() => handleDelete(doc.id)}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                </button>
                                                <button className="km-icon-btn" title="下载">
                                                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                </button>
                                                <button className="km-icon-btn" title="更多" onClick={(e) => handleContextMenu(e, doc)}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                                </button>
                                            </span>
                                        </td>
                                        <td className="km-td-size">{formatSize(doc.file_size)}</td>
                                        <td className="km-td-type">{info.label}</td>
                                        <td className="km-td-date">{formatDate(doc.updated_at || doc.created_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="file-grid">
                    {filtered.map(doc => {
                        const info = getTypeInfo(doc.doc_type);
                        return (
                            <div key={doc.id} className="card file-card" onClick={() => navigate(`/knowledge/documents/${doc.id}`)} onContextMenu={(e) => handleContextMenu(e, doc)}>
                                <div className="file-icon" style={{ background: 'transparent' }}>
                                    <img src={info.src} alt={info.label} style={{ width: 48, height: 48 }} />
                                </div>
                                <div className="file-name" title={doc.title}>{doc.title}</div>
                                <div className="file-meta">{formatSize(doc.file_size)} · {formatDate(doc.created_at)}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== Context Menu ===== */}
            {contextMenu && (
                <div className="km-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
                    <div className="km-ctx-item" onClick={() => { navigate(`/knowledge/documents/${contextMenu.doc.id}`); setContextMenu(null); }}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        预览
                    </div>
                    <div className="km-ctx-item" onClick={() => openRename(contextMenu.doc)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        重命名
                    </div>
                    <div className="km-ctx-item" onClick={() => handleDelete(contextMenu.doc.id)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        删除
                    </div>
                    <div className="km-ctx-divider" />
                    <div className="km-ctx-item" onClick={() => setContextMenu(null)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        复制
                    </div>
                    <div className="km-ctx-item" onClick={() => setContextMenu(null)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                        移动
                    </div>
                    <div className="km-ctx-item" onClick={() => setContextMenu(null)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        下载
                    </div>
                </div>
            )}

            {/* ===== Upload Modal ===== */}
            <Modal open={uploadOpen} title="上传文件" onClose={() => setUploadOpen(false)} footer={
                <>
                    <button className="btn btn-outline" onClick={() => setUploadOpen(false)}>取消</button>
                    <button className="btn btn-primary" onClick={handleUpload}>上传</button>
                </>
            }>
                <div className="form-group">
                    <label className="form-label">选择文件</label>
                    <input ref={fileRef} type="file" accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt" className="form-input" style={{ lineHeight: '38px', padding: '0 8px' }} />
                    <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        支持格式: DOC, DOCX, PDF, XLS, XLSX, PPT, PPTX, TXT
                    </div>
                </div>
            </Modal>

            {/* ===== Rename Modal ===== */}
            <Modal open={!!renameOpen} title="重命名" onClose={() => setRenameOpen(null)} footer={
                <>
                    <button className="btn btn-outline" onClick={() => setRenameOpen(null)}>取消</button>
                    <button className="btn btn-primary" onClick={handleRename}>确定</button>
                </>
            }>
                <div className="form-group">
                    <label className="form-label">新名称</label>
                    <input className="form-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus />
                </div>
            </Modal>
        </div>
    );
}
