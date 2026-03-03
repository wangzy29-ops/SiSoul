import { useState, useEffect } from 'react';
import { profileApi } from '../../api';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

export default function ProfilePage({ category, categoryName, icon }) {
    const [items, setItems] = useState([]);
    const [addOpen, setAddOpen] = useState(false);
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');

    const loadItems = () => {
        profileApi.list(category)
            .then(d => setItems(Array.isArray(d) ? d.filter(i => i.category === category) : []))
            .catch(() => setItems([]));
    };

    useEffect(() => { loadItems(); }, [category]);

    const handleAdd = async () => {
        if (!key.trim() || !value.trim()) { alert('键和值不能为空'); return; }
        try {
            await profileApi.create({ category, item_key: key.trim(), item_value: value.trim() });
            setKey(''); setValue('');
            setAddOpen(false);
            loadItems();
        } catch (e) {
            alert('添加失败: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确认删除？')) return;
        try {
            await profileApi.delete(id);
            loadItems();
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    };

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{icon} {categoryName}</h2>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        添加条目
                    </button>
                </div>
            </div>

            {/* Two panels: core info + supporting files */}
            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Core Info */}
                <div className="profile-section">
                    <div className="profile-section-header">
                        <span>核心信息</span>
                    </div>
                    <div className="profile-section-body">
                        {items.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>暂无数据</div>
                        ) : items.map(item => (
                            <div key={item.id} className="profile-row" style={{ position: 'relative' }}>
                                <span className="profile-key">{item.item_key}</span>
                                <span className="profile-val">{item.item_value}</span>
                                <button
                                    className="btn btn-icon btn-outline"
                                    style={{ position: 'absolute', right: 8, width: 28, height: 28, opacity: 0.5 }}
                                    onClick={() => handleDelete(item.id)}
                                    title="删除"
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Supporting files */}
                <div className="profile-section">
                    <div className="profile-section-header">
                        <span>支撑文件</span>
                    </div>
                    <div className="profile-section-body">
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                            支撑该结论的知识和动作文件将在这里展示
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            <Modal open={addOpen} title={`添加${categoryName}条目`} onClose={() => setAddOpen(false)} footer={
                <>
                    <button className="btn btn-outline" onClick={() => setAddOpen(false)}>取消</button>
                    <button className="btn btn-primary" onClick={handleAdd}>保存</button>
                </>
            }>
                <div className="form-group">
                    <label className="form-label">项目名称</label>
                    <input className="form-input" value={key} onChange={e => setKey(e.target.value)} placeholder="如：姓名、年龄..." />
                </div>
                <div className="form-group">
                    <label className="form-label">内容</label>
                    <textarea className="form-textarea" value={value} onChange={e => setValue(e.target.value)} placeholder="输入内容..." />
                </div>
            </Modal>
        </div>
    );
}
