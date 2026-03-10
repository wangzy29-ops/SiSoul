import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { docsApi, foldersApi } from '../../api';
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

/* ---- Type filters ---- */
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
const knownTypes = new Set(['word', 'doc', 'excel', 'xls', 'ppt', 'pdf', 'txt', 'image']);

/* ---- Folder icon SVG ---- */
const FolderIcon = ({ color = '#f59e0b', size = 20 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ flexShrink: 0 }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

export default function Documents() {
    const [docs, setDocs] = useState([]);
    const [folders, setFolders] = useState([]);
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

    // Folder states
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [moveOpen, setMoveOpen] = useState(false); // move dialog
    const [moveTargetId, setMoveTargetId] = useState(null);

    const fileRef = useRef();
    const navigate = useNavigate();

    const loadData = async () => {
        setLoading(true);
        try {
            const [docsData, foldersData] = await Promise.all([
                docsApi.list(),
                foldersApi.list(),
            ]);
            setDocs(Array.isArray(docsData) ? docsData : []);
            setFolders(Array.isArray(foldersData) ? foldersData : []);
        } catch {
            setDocs([]); setFolders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);
    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // current folder obj
    const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

    // sub-folders in current view
    const subFolders = folders.filter(f => f.parent_id === currentFolderId);

    // docs in current folder
    const filteredDocs = docs.filter(d => {
        const matchFolder = (d.folder_id ?? null) === currentFolderId;
        let matchType = true;
        if (typeFilter === 'all') { matchType = true; }
        else if (typeFilter === 'other') { matchType = !knownTypes.has(d.doc_type); }
        else if (typeFilter === 'word') { matchType = d.doc_type === 'word' || d.doc_type === 'doc'; }
        else if (typeFilter === 'excel') { matchType = d.doc_type === 'excel' || d.doc_type === 'xls'; }
        else { matchType = d.doc_type === typeFilter; }
        const matchSearch = !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchFolder && matchType && matchSearch;
    });

    // all docs for search mode (across all folders)
    const searchedDocs = searchQuery ? docs.filter(d => {
        let matchType = true;
        if (typeFilter !== 'all') {
            if (typeFilter === 'other') matchType = !knownTypes.has(d.doc_type);
            else if (typeFilter === 'word') matchType = d.doc_type === 'word' || d.doc_type === 'doc';
            else if (typeFilter === 'excel') matchType = d.doc_type === 'excel' || d.doc_type === 'xls';
            else matchType = d.doc_type === typeFilter;
        }
        return matchType && d.title?.toLowerCase().includes(searchQuery.toLowerCase());
    }) : null;

    const displayDocs = searchedDocs || filteredDocs;

    // Selection
    const toggleSelect = (id) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSelectAll = () => {
        if (selectAll) { setSelected(new Set()); }
        else { setSelected(new Set(displayDocs.map(d => d.id))); }
        setSelectAll(!selectAll);
    };

    // Batch delete
    const handleBatchDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`确认删除选中的 ${selected.size} 个文件？`)) return;
        try {
            await Promise.all([...selected].map(id => docsApi.delete(id)));
            setSelected(new Set()); setSelectAll(false);
            loadData();
        } catch (e) { alert('批量删除失败: ' + e.message); }
    };

    const handleUpload = async () => {
        const files = fileRef.current?.files;
        if (!files?.length) return;
        const fd = new FormData();
        fd.append('file', files[0]);
        // 如果在文件夹内，传递 folder_id
        console.log('Upload - currentFolderId:', currentFolderId, 'type:', typeof currentFolderId);
        if (currentFolderId) {
            fd.append('folder_id', currentFolderId);
            console.log('Upload - folder_id appended to FormData');
        } else {
            console.log('Upload - No folder_id (root directory)');
        }
        try {
            const newDoc = await docsApi.upload(fd);
            setUploadOpen(false);
            loadData();
        } catch (e) { alert('上传失败: ' + e.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('确认删除该文件？')) return;
        try {
            await docsApi.delete(id);
            setContextMenu(null);
            loadData();
        } catch (e) { alert('删除失败: ' + e.message); }
    };

    const handleRename = async () => {
        if (!renameValue.trim() || !renameOpen) return;
        try {
            await docsApi.update(renameOpen.id, { title: renameValue.trim() });
            setRenameOpen(null);
            loadData();
        } catch (e) { alert('重命名失败: ' + e.message); }
    };

    const openRename = (doc) => { setRenameValue(doc.title); setRenameOpen(doc); setContextMenu(null); };
    const handleContextMenu = (e, doc) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, doc }); };

    // Create folder
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await foldersApi.create({ name: newFolderName.trim(), parent_id: currentFolderId });
            setNewFolderOpen(false);
            setNewFolderName('');
            loadData();
        } catch (e) { alert('创建失败: ' + (e.message || '同名文件夹已存在')); }
    };

    // Delete folder
    const handleDeleteFolder = async (folderId) => {
        const f = folders.find(x => x.id === folderId);
        if (!confirm(`确认删除文件夹"${f?.name}"？文件夹内的文件将移至根目录。`)) return;
        try {
            await foldersApi.delete(folderId);
            if (currentFolderId === folderId) setCurrentFolderId(null);
            loadData();
        } catch (e) { alert('删除失败: ' + e.message); }
    };

    // Open move dialog
    const openMoveDialog = () => {
        if (selected.size === 0) return;
        setMoveTargetId(currentFolderId);
        setMoveOpen(true);
    };

    // Do move
    const handleMove = async () => {
        try {
            await foldersApi.moveDocs([...selected], moveTargetId);
            setSelected(new Set()); setSelectAll(false);
            setMoveOpen(false);
            loadData();
        } catch (e) { alert('移动失败: ' + e.message); }
    };

    // Breadcrumb path
    const getBreadcrumb = () => {
        const crumbs = [{ id: null, name: '全部文件' }];
        if (!currentFolderId) return crumbs;
        const build = (fid) => {
            const f = folders.find(x => x.id === fid);
            if (!f) return;
            if (f.parent_id) build(f.parent_id);
            crumbs.push({ id: f.id, name: f.name });
        };
        build(currentFolderId);
        return crumbs;
    };
    const breadcrumb = getBreadcrumb();

    return (
        <div className="page-enter">
            {/* ===== Toolbar ===== */}
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <button className="btn btn-primary km-upload-btn" style={{borderRadius: 8 }} onClick={() => setUploadOpen(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        手工上传
                    </button>
                    <button className="btn btn-outline km-upload-btn" style={{ borderRadius: 8 }} onClick={() => setNewFolderOpen(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        新建文件夹
                    </button>
                    {selected.size > 0 && (
                        <>
                            <button className="btn btn-outline km-action-btn" onClick={openMoveDialog}>
                                <svg viewBox="0 0 24 24" width="15" height="15"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                                移动 ({selected.size})
                            </button>
                            <button className="btn btn-danger km-action-btn" onClick={handleBatchDelete}>
                                <svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                删除 ({selected.size})
                            </button>
                        </>
                    )}
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="搜索文件..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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

            {/* ===== Breadcrumb ===== */}
            {!searchQuery && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {breadcrumb.map((crumb, i) => (
                        <span key={crumb.id ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
                            <span
                                style={{ cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default', color: i < breadcrumb.length - 1 ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: i === breadcrumb.length - 1 ? 500 : 400 }}
                                onClick={() => i < breadcrumb.length - 1 && setCurrentFolderId(crumb.id)}
                            >
                                {crumb.name}
                            </span>
                        </span>
                    ))}
                </div>
            )}

            {/* ===== Type Filters ===== */}
            <div className="km-type-filters" style={{ marginLeft: 0 }}>
                {typeFilters.map(f => (
                    <button key={f.key} className={`km-type-chip ${typeFilter === f.key ? 'active' : ''}`} onClick={() => setTypeFilter(f.key)}>{f.label}</button>
                ))}
                <span className="km-file-count">{displayDocs.length} 个文件{subFolders.length > 0 && !searchQuery ? `，${subFolders.length} 个文件夹` : ''}</span>
            </div>

            {/* ===== Content ===== */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
            ) : (
                <>
                    {/* Sub-folders grid (only when not searching) */}
                    {!searchQuery && subFolders.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                            {subFolders.map(f => (
                                <div
                                    key={f.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                        background: 'var(--color-bg-primary, #fff)', border: '1px solid var(--color-border-light, #e5e7eb)',
                                        borderRadius: 2, cursor: 'pointer', userSelect: 'none', position: 'relative',
                                        transition: 'box-shadow 0.15s',
                                    }}
                                    onClick={() => setCurrentFolderId(f.id)}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                >
                                    <FolderIcon size={22} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{f.doc_count} 个文件</div>
                                    </div>
                                    <button
                                        title="删除文件夹"
                                        style={{ opacity: 0, position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                                        className="folder-del-btn"
                                        onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                                    >
                                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* File list/grid */}
                    {displayDocs.length === 0 && subFolders.length === 0 ? (
                        <EmptyState icon="📂" title={searchQuery ? '未找到匹配的文件' : '暂无文件'} desc={searchQuery ? '请尝试其他搜索词' : '点击上传按钮添加文件'} />
                    ) : displayDocs.length === 0 ? null : viewMode === 'list' ? (
                        <div className="km-table-wrap">
                            <table className="km-table">
                                <thead>
                                    <tr>
                                        <th className="km-th-check"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} /></th>
                                        <th className="km-th-name">文件名</th>
                                        <th className="km-th-size">大小</th>
                                        <th className="km-th-type">类型</th>
                                        <th className="km-th-date">修改时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayDocs.map(doc => {
                                        const info = getTypeInfo(doc.doc_type);
                                        return (
                                            <tr key={doc.id} className={`km-row ${selected.has(doc.id) ? 'selected' : ''}`} onContextMenu={(e) => handleContextMenu(e, doc)} onClick={() => navigate(`/inbox/documents/${doc.id}`)}>
                                                <td className="km-td-check" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                                                </td>
                                                <td className="km-td-name">
                                                    <img src={info.src} alt={info.label} className="km-file-icon-img" style={{ width: 24, height: 24, marginRight: 8, verticalAlign: 'middle' }} />
                                                    <span className="km-file-title">{doc.title}</span>
                                                    {searchQuery && doc.folder_id && (
                                                        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                                                            📁 {folders.find(f => f.id === doc.folder_id)?.name}
                                                        </span>
                                                    )}
                                                    <span className="km-file-actions" onClick={e => e.stopPropagation()}>
                                                        <button className="km-icon-btn" title="重命名" onClick={() => openRename(doc)}>
                                                            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                        </button>
                                                        <button className="km-icon-btn" title="删除" onClick={() => handleDelete(doc.id)}>
                                                            <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
                            {displayDocs.map(doc => {
                                const info = getTypeInfo(doc.doc_type);
                                return (
                                    <div key={doc.id} className="card file-card" onClick={() => navigate(`/inbox/documents/${doc.id}`)} onContextMenu={(e) => handleContextMenu(e, doc)}>
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
                </>
            )}

            {/* ===== Context Menu ===== */}
            {contextMenu && (
                <div className="km-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
                    <div className="km-ctx-item" onClick={() => { navigate(`/inbox/documents/${contextMenu.doc.id}`); setContextMenu(null); }}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        预览
                    </div>
                    <div className="km-ctx-item" onClick={() => openRename(contextMenu.doc)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        重命名
                    </div>
                    <div className="km-ctx-item" onClick={() => { setSelected(new Set([contextMenu.doc.id])); setMoveTargetId(contextMenu.doc.folder_id ?? null); setMoveOpen(true); setContextMenu(null); }}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                        移动到...
                    </div>
                    <div className="km-ctx-divider" />
                    <div className="km-ctx-item" onClick={() => handleDelete(contextMenu.doc.id)}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        删除
                    </div>
                </div>
            )}

            {/* ===== Upload Modal ===== */}
            <Modal open={uploadOpen} title="上传文件" onClose={() => setUploadOpen(false)} footer={
                <><button className="btn btn-outline" onClick={() => setUploadOpen(false)}>取消</button><button className="btn btn-primary" onClick={handleUpload}>上传</button></>
            }>
                <div className="form-group">
                    <label className="form-label">选择文件</label>
                    <input ref={fileRef} type="file" accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt" className="form-input" style={{ lineHeight: '38px', padding: '0 8px' }} />
                    {currentFolder && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-primary)' }}>📁 将上传到「{currentFolder.name}」</div>}
                    <div style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>支持格式: DOC, DOCX, PDF, XLS, XLSX, PPT, PPTX, TXT</div>
                </div>
            </Modal>

            {/* ===== Rename Modal ===== */}
            <Modal open={!!renameOpen} title="重命名" onClose={() => setRenameOpen(null)} footer={
                <><button className="btn btn-outline" onClick={() => setRenameOpen(null)}>取消</button><button className="btn btn-primary" onClick={handleRename}>确定</button></>
            }>
                <div className="form-group">
                    <label className="form-label">新名称</label>
                    <input className="form-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus />
                </div>
            </Modal>

            {/* ===== New Folder Modal ===== */}
            <Modal open={newFolderOpen} title="新建文件夹" onClose={() => { setNewFolderOpen(false); setNewFolderName(''); }} footer={
                <><button className="btn btn-outline" onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }}>取消</button><button className="btn btn-primary" onClick={handleCreateFolder}>创建</button></>
            }>
                <div className="form-group">
                    <label className="form-label">文件夹名称</label>
                    <input className="form-input" placeholder="请输入文件夹名称" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus />
                    {currentFolder && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>创建位置：📁 {currentFolder.name}</div>}
                </div>
            </Modal>

            {/* ===== Move Modal ===== */}
            <Modal open={moveOpen} title={`移动文件 (${selected.size} 个)`} onClose={() => setMoveOpen(false)} footer={
                <><button className="btn btn-outline" onClick={() => setMoveOpen(false)}>取消</button><button className="btn btn-primary" onClick={handleMove}>确认移动</button></>
            }>
                <div className="form-group">
                    <label className="form-label">选择目标文件夹</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                        {/* Root */}
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 2, cursor: 'pointer', background: moveTargetId === null ? 'var(--color-primary-light, #ede9fe)' : 'var(--color-bg-secondary, #f5f5f5)', border: moveTargetId === null ? '1.5px solid var(--color-primary)' : '1.5px solid transparent' }}
                            onClick={() => setMoveTargetId(null)}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#888" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
                            <span style={{ fontSize: 13 }}>根目录（无文件夹）</span>
                        </div>
                        {/* All folders */}
                        {folders.filter(f => f.parent_id === null).map(f => (
                            <div
                                key={f.id}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 2, cursor: 'pointer', background: moveTargetId === f.id ? 'var(--color-primary-light, #ede9fe)' : 'var(--color-bg-secondary, #f5f5f5)', border: moveTargetId === f.id ? '1.5px solid var(--color-primary)' : '1.5px solid transparent' }}
                                onClick={() => setMoveTargetId(f.id)}
                            >
                                <FolderIcon size={16} />
                                <span style={{ fontSize: 13 }}>{f.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{f.doc_count} 个文件</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* folder delete button hover CSS */}
            <style>{`.folder-del-btn { opacity: 0 !important; transition: opacity 0.15s; } div:hover > .folder-del-btn { opacity: 1 !important; }`}</style>
        </div>
    );
}
