import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { docsApi } from '../../api';

const folders = [
    { key: 'diet', name: '我的饮食', icon: '🍽️', desc: '菜谱、营养计划、餐厅打卡记录', folderId: 15 },
    { key: 'health', name: '我的健康', icon: '💊', desc: '体检报告、医疗记录、睡眠与生理数据', folderId: 16 },
    { key: 'fitness', name: '我的运动', icon: '🏃', desc: '训练计划、运动数据追踪、健身目标', folderId: 17 },
    { key: 'wardrobe', name: '我的衣柜', icon: '👔', desc: '衣服照片、穿搭记录、尺码记录', folderId: 18 },
    { key: 'travel', name: '我的出行', icon: '✈️', desc: '行程单、护照签证扫描件、旅行攻略', folderId: 19 },
    { key: 'daily', name: '我的日常', icon: '🏠', desc: '设备说明书、日常生活技巧', folderId: 20 },
];

/* Folder open SVG icon */
const FolderIcon = ({ color = '#f59e0b' }) => (
    <svg viewBox="0 0 24 24" width={40} height={40} style={{ fill: color, opacity: 0.85 }}>
        <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
);

const folderColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function MyLife() {
    const navigate = useNavigate();
    const [activeFolder, setActiveFolder] = useState(null);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeFolder) {
            const folder = folders.find(f => f.key === activeFolder);
            if (folder && folder.folderId) {
                setLoading(true);
                docsApi.list({ folder_id: folder.folderId })
                    .then(data => setDocs(Array.isArray(data) ? data : []))
                    .catch(() => setDocs([]))
                    .finally(() => setLoading(false));
            }
        }
    }, [activeFolder]);

    const getTypeIcon = (type) => {
        const icons = { pdf: '📄', doc: '📝', word: '📝', image: '🖼️', video: '🎬', audio: '🎵', web: '🌐', txt: '📃' };
        return icons[type] || '📎';
    };

    if (activeFolder) {
        const folder = folders.find(f => f.key === activeFolder);
        return (
            <div className="page-enter">
                <div className="km-toolbar">
                    <div className="km-toolbar-left">
                        <button className="btn btn-outline" style={{ borderRadius: 2, fontSize: 'var(--font-size-sm)' }} onClick={() => setActiveFolder(null)}>
                            <svg viewBox="0 0 24 24" width="14" height="14" style={{ stroke: 'currentColor', strokeWidth: 2, fill: 'none', marginRight: 4 }}><polyline points="15 18 9 12 15 6" /></svg>
                            返回
                        </button>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>{folder.icon} {folder.name}</h2>
                    </div>
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>加载中...</div>
                ) : docs.length === 0 ? (
                    <EmptyState icon={folder.icon} title={`${folder.name} - 暂无内容`} desc={`${folder.desc}。后续由 AI 自动从碎片中归类映射。`} />
                ) : (
                    <div className="km-file-list" style={{ marginTop: 20 }}>
                        {docs.map(doc => (
                            <div
                                key={doc.id}
                                className="km-row"
                                style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                onClick={() => navigate(`/inbox/documents/${doc.id}`)}
                            >
                                <span style={{ fontSize: 20, marginRight: 12 }}>{getTypeIcon(doc.doc_type)}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{doc.title}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        {doc.doc_type} · {new Date(doc.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`km-status-badge km-status-${doc.status}`}>{doc.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>MyLife 生活</h2>
                </div>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: '0 0 20px 0' }}>
                AI 自动从碎片中提取与生活相关的内容并归类到对应文件夹
            </p>
            <div className="km-folder-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {folders.map((f, i) => (
                    <div
                        key={f.key}
                        className="card"
                        style={{ padding: '20px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                        onClick={() => setActiveFolder(f.key)}
                    >
                        <FolderIcon color={folderColors[i % folderColors.length]} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginTop: 10, color: 'var(--color-text)' }}>{f.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>{f.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
