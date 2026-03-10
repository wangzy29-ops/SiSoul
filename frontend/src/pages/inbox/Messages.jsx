import { useState, useEffect } from 'react';
import { messagesApi } from '../../api';
import EmptyState from '../../components/EmptyState';

const SUB_TYPE_TABS = [
    { key: 'all', label: '全部' },
    { key: 'text', label: '文本消息' },
    { key: 'image_msg', label: '图片消息' },
    { key: 'action_msg', label: '操作类消息' },
    { key: 'collection', label: '消息集合' },
];

const SUB_TYPE_ICONS = {
    text: { emoji: '💬', color: '#4285F4' },
    image_msg: { emoji: '🖼️', color: '#34A853' },
    action_msg: { emoji: '📎', color: '#FBBC05' },
    collection: { emoji: '📦', color: '#A142F4' },
};

function formatDateTime(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
}

export default function Messages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState(null);

    const load = () => {
        setLoading(true);
        messagesApi.list()
            .then(d => setMessages(Array.isArray(d) ? d : []))
            .catch(() => setMessages([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = messages.filter(m => {
        const matchTab = tab === 'all' || m.sub_type === tab;
        const matchSearch = !searchQuery || (m.text_content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.action_desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.sender_id || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchTab && matchSearch;
    });

    const handleDelete = async (id) => {
        if (!confirm('确认删除该消息记录？')) return;
        await messagesApi.delete(id).catch(() => { });
        load();
    };

    return (
        <div className="page-enter">
            {/* Toolbar */}
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>消息</span>
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="搜索消息内容/发送人..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Sub-type Tabs */}
            <div className="km-type-filters" style={{ marginLeft: 0 }}>
                {SUB_TYPE_TABS.map(t => (
                    <button
                        key={t.key}
                        className={`km-type-chip ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
                <span className="km-file-count">{filtered.length} 条消息</span>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon="💬" title="暂无消息" desc="通过钉钉 OpenClaw 接收的消息将显示在这里" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(msg => {
                        const info = SUB_TYPE_ICONS[msg.sub_type] || { emoji: '💬', color: '#9AA0A6' };
                        const isExpanded = expanded === msg.id;
                        const preview = msg.text_content
                            ? (msg.text_content.length > 80 ? msg.text_content.slice(0, 80) + '...' : msg.text_content)
                            : msg.action_desc || '(无内容)';

                        return (
                            <div
                                key={msg.id}
                                className="card"
                                style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: `3px solid ${info.color}` }}
                                onClick={() => setExpanded(isExpanded ? null : msg.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{info.emoji}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{
                                                fontSize: 'var(--font-size-xs)',
                                                background: info.color + '20',
                                                color: info.color,
                                                padding: '2px 7px',
                                                borderRadius: 2,
                                                fontWeight: 500,
                                            }}>
                                                {SUB_TYPE_TABS.find(t => t.key === msg.sub_type)?.label || msg.sub_type}
                                            </span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                {msg.sender_id || '未知发送人'}
                                            </span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                                                {formatDateTime(msg.send_time || msg.created_at)}
                                            </span>
                                        </div>

                                        {/* 消息内容预览 */}
                                        {isExpanded ? (
                                            <div>
                                                {msg.text_content && (
                                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--color-text)', marginBottom: 6 }}>
                                                        {msg.text_content}
                                                    </div>
                                                )}
                                                {msg.action_desc && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                        {msg.action_desc}
                                                    </div>
                                                )}
                                                {msg.conversation_id && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                                        群聊 ID: {msg.conversation_id}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--color-text)', lineHeight: 1.5, fontSize: 'var(--font-size-sm)' }}>
                                                {preview}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="km-icon-btn"
                                        title="删除"
                                        onClick={e => { e.stopPropagation(); handleDelete(msg.id); }}
                                        style={{ flexShrink: 0 }}
                                    >
                                        <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
