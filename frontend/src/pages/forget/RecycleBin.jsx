import { useState, useEffect } from 'react';
import { recycleApi, docsApi, foldersApi } from '../../api';
import EmptyState from '../../components/EmptyState';

export default function RecycleBin() {
    const [items, setItems] = useState([]);
    const [docDetails, setDocDetails] = useState({});
    const [folders, setFolders] = useState([]);

    const loadItems = async () => {
        try {
            const [recycleItems, foldersData] = await Promise.all([
                recycleApi.list(),
                foldersApi.list(),
            ]);
            setItems(Array.isArray(recycleItems) ? recycleItems : []);
            setFolders(Array.isArray(foldersData) ? foldersData : []);

            // 加载文档详情
            const docIds = [...new Set(recycleItems.map(item => item.document_id))];
            const details = {};
            for (const docId of docIds) {
                try {
                    const doc = await docsApi.get(docId);
                    details[docId] = doc;
                } catch {
                    details[docId] = null;
                }
            }
            setDocDetails(details);
        } catch (e) {
            console.error('加载回收站失败:', e);
            setItems([]);
        }
    };

    useEffect(() => { loadItems(); }, []);

    const getFolderName = (folderId) => {
        if (!folderId) return '根目录';
        const folder = folders.find(f => f.id === folderId);
        return folder ? folder.name : '未知文件夹';
    };

    const handleRestore = async (docId) => {
        try {
            await recycleApi.restore(docId);
            loadItems();
        } catch (e) {
            alert('恢复失败: ' + e.message);
        }
    };

    const handleDelete = async (docId) => {
        if (!confirm('确认永久删除？此操作不可撤销，底层文件也将被删除。')) return;
        try {
            await recycleApi.permanentDelete(docId);
            loadItems();
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const getDocTypeIcon = (docType) => {
        const icons = {
            'document': '📄',
            'image': '🖼️',
            'video': '🎬',
            'audio': '🎵',
            'web': '🌐',
            'note': '📝',
        };
        return icons[docType] || '📄';
    };

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>回收站</h2>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    {items.length} 个文档 · 30天后自动清理
                </span>
            </div>

            {items.length === 0 ? (
                <EmptyState icon="🗑️" title="回收站为空" desc="删除的文档将暂存在这里，不会加入回答的记忆体系" />
            ) : (
                <div className="card">
                    {items.map(item => {
                        const doc = docDetails[item.document_id];
                        return (
                            <div key={item.id} className="list-item" style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--color-border-light)',
                            }}>
                                <div className="list-item-icon" style={{
                                    background: '#fce8e6',
                                    color: '#EA4335',
                                    width: 44,
                                    height: 44,
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 20,
                                    marginRight: 16,
                                }}>
                                    {getDocTypeIcon(doc?.doc_type)}
                                </div>
                                <div className="list-item-content" style={{ flex: 1 }}>
                                    <div className="list-item-title" style={{ fontWeight: 500, marginBottom: 4 }}>
                                        {doc?.title || `文档 #${item.document_id}`}
                                    </div>
                                    <div className="list-item-desc" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                                        <span>删除于 {formatDate(item.deleted_at)}</span>
                                        <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>·</span>
                                        <span>原位置: {getFolderName(item.original_folder_id)}</span>
                                        {item.expire_at && (
                                            <>
                                                <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>·</span>
                                                <span>过期于 {formatDate(item.expire_at)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleRestore(item.document_id)}
                                        title="还原到原来的文件夹"
                                    >
                                        还原记忆
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(item.document_id)}
                                        title="永久删除，包括底层文件"
                                    >
                                        永久删除
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
