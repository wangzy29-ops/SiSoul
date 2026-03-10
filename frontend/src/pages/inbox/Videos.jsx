import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { docsApi } from '../../api';
import EmptyState from '../../components/EmptyState';

function formatSize(b) {
    if (!b) return '-';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + s[i];
}

function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export default function Videos() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const load = () => {
        setLoading(true);
        docsApi.list({ doc_type: 'video' })
            .then(d => setVideos(Array.isArray(d) ? d : []))
            .catch(() => setVideos([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = videos.filter(v =>
        !searchQuery || v.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id) => {
        if (!confirm('确认删除该视频？')) return;
        await docsApi.delete(id).catch(() => { });
        load();
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            await docsApi.upload(formData);
            load();
        } catch (err) {
            console.error('上传失败:', err);
            alert('上传视频失败: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input
        }
    };

    return (
        <div className="page-enter">
            {/* Toolbar */}
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <label className="btn btn-primary km-upload-btn" style={{borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                        {uploading ? '上传中...' : '新增视频'}
                        <input type="file" style={{ display: 'none' }} accept="video/*,.mp4,.avi,.wmv,.webm" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="搜索视频..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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

            <div style={{ padding: '0 0 12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {filtered.length} 个视频 · 通过钉钉 OpenClaw 接收的视频文件（mp4/avi/m4a/wmv）
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon="🎬" title="暂无视频" desc="通过钉钉 OpenClaw 发送 mp4、avi、m4a、wmv 格式文件后将显示在这里" />
            ) : viewMode === 'list' ? (
                <div className="km-table-wrap">
                    <table className="km-table">
                        <thead>
                            <tr>
                                <th className="km-th-name">文件名</th>
                                <th className="km-th-size">大小</th>
                                <th className="km-th-date">添加时间</th>
                                <th style={{ width: 80 }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(v => (
                                <tr key={v.id} className="km-row" onClick={() => navigate(`/knowledge/documents/${v.id}`)}>
                                    <td className="km-td-name">
                                        <img src="/icons/MP4图标.png" alt="视频" className="km-file-icon-img" style={{ width: 24, height: 24, marginRight: 8, verticalAlign: 'middle' }} />
                                        <span className="km-file-title">{v.title}</span>
                                    </td>
                                    <td className="km-td-size">{formatSize(v.file_size)}</td>
                                    <td className="km-td-date">{formatDate(v.created_at)}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <button className="km-icon-btn" title="删除" onClick={() => handleDelete(v.id)}>
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
                    {filtered.map(v => (
                        <div key={v.id} className="card file-card" onClick={() => navigate(`/knowledge/documents/${v.id}`)}>
                            <div className="file-icon" style={{ background: 'transparent' }}>
                                <img src="/icons/MP4图标.png" alt="视频" style={{ width: 48, height: 48 }} />
                            </div>
                            <div className="file-name" title={v.title}>{v.title}</div>
                            <div className="file-meta">{formatSize(v.file_size)} · {formatDate(v.created_at)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
