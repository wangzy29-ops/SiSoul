import { useState, useEffect } from 'react';
import { consistencyApi } from '../../api';
import EmptyState from '../../components/EmptyState';

export default function Consistency() {
    const [items, setItems] = useState([]);

    const loadItems = () => {
        consistencyApi.list()
            .then(d => setItems(Array.isArray(d) ? d : []))
            .catch(() => setItems([]));
    };

    useEffect(() => { loadItems(); }, []);

    const handleResolve = async (id, priority) => {
        try {
            await consistencyApi.resolve(id, { status: 'resolved', priority });
            loadItems();
        } catch (e) {
            alert('处理失败: ' + e.message);
        }
    };

    const statusColors = {
        pending: 'tag-yellow',
        resolved: 'tag-green',
        ignored: 'tag-gray',
    };

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>✅ 一致性检查</h2>
            </div>

            {items.length === 0 ? (
                <EmptyState icon="✅" title="暂无冲突" desc="当检测到矛盾信息时，将在此处展示供您决策" />
            ) : (
                <div className="card">
                    {items.map(item => (
                        <div key={item.id} className="list-item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                            <div className="list-item-icon" style={{ background: item.status === 'pending' ? '#fef7e0' : '#e6f4ea', color: item.status === 'pending' ? '#FBBC05' : '#34A853' }}>
                                {item.status === 'pending' ? '⚠️' : '✅'}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">
                                    {item.conflict_type === 'duplicate' ? '重复' : item.conflict_type === 'conflict' ? '冲突' : '缺失'}
                                    {item.doc_id_1 && ` · 文档#${item.doc_id_1}`}
                                    {item.doc_id_2 && ` vs 文档#${item.doc_id_2}`}
                                </div>
                                <div className="list-item-desc">{item.description || '(无描述)'}</div>
                            </div>
                            <span className={`tag ${statusColors[item.status] || 'tag-gray'}`} style={{ marginRight: 12 }}>{item.status}</span>
                            {item.status === 'pending' && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={() => handleResolve(item.id, 'doc1')}>保留文档1</button>
                                    <button className="btn btn-secondary" onClick={() => handleResolve(item.id, 'doc2')}>保留文档2</button>
                                    <button className="btn btn-outline" onClick={() => handleResolve(item.id, 'ignore')}>忽略</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
