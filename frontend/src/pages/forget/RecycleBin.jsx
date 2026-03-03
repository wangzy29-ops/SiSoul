import { useState, useEffect } from 'react';
import { recycleApi } from '../../api';
import EmptyState from '../../components/EmptyState';

export default function RecycleBin() {
    const [items, setItems] = useState([]);

    const loadItems = () => {
        recycleApi.list()
            .then(d => setItems(Array.isArray(d) ? d : []))
            .catch(() => setItems([]));
    };

    useEffect(() => { loadItems(); }, []);

    const handleRestore = async (id) => {
        try {
            await recycleApi.restore(id);
            loadItems();
        } catch (e) {
            alert('恢复失败: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确认永久删除？此操作不可撤销。')) return;
        try {
            await recycleApi.permanentDelete(id);
            loadItems();
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    };

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>🗑️ 回收站</h2>
            </div>

            {items.length === 0 ? (
                <EmptyState icon="🗑️" title="回收站为空" desc="删除的文档将暂存在这里，不会加入回答的记忆体系" />
            ) : (
                <div className="card">
                    {items.map(item => (
                        <div key={item.id} className="list-item">
                            <div className="list-item-icon" style={{ background: '#fce8e6', color: '#EA4335' }}>📄</div>
                            <div className="list-item-content">
                                <div className="list-item-title">文档 #{item.document_id}</div>
                                <div className="list-item-desc">
                                    删除于 {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString('zh-CN') : '-'}
                                    {item.expire_at && ` · 过期于 ${new Date(item.expire_at).toLocaleDateString('zh-CN')}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary" onClick={() => handleRestore(item.id)}>恢复</button>
                                <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>永久删除</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
