import { useState, useEffect } from 'react';
import { assistantApi } from '../../api';
import EmptyState from '../../components/EmptyState';

export default function Digest() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        assistantApi.list('summary')
            .then(d => setItems(Array.isArray(d) ? d : []))
            .catch(() => setItems([]));
    }, []);

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>📡 订阅摘要</h2>
            </div>

            {items.length === 0 ? (
                <EmptyState icon="📡" title="暂无订阅摘要" desc="订阅源更新后，AI将自动生成摘要展示在这里" />
            ) : (
                <div className="card">
                    {items.map(item => (
                        <div key={item.id} className="list-item">
                            <div className="list-item-icon" style={{ background: '#e8f0fe', color: '#4285F4' }}>📄</div>
                            <div className="list-item-content">
                                <div className="list-item-title">{item.title}</div>
                                <div className="list-item-desc">{item.content}</div>
                            </div>
                            <div className="list-item-meta">{new Date(item.item_date).toLocaleDateString('zh-CN')}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
