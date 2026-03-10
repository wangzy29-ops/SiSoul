import { useState, useEffect } from 'react';
import { notesApi, docsApi } from '../../api';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import SimpleEditor from '../../components/SimpleEditor';

function formatDateTime(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

const stripHtml = (html) => {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

const tabs = [
    { key: 'papers', label: '论文书籍', icon: '📚', desc: '电子书、文章剪报、播客及视频的文字提炼' },
    { key: 'webknow', label: '网页知识', icon: '🌐', desc: '网页、视频、音频、图片的多模态文字提炼' },
    { key: 'llm', label: '大模型相关', icon: '🤖', desc: '大模型相关知识' },
    { key: 'notes', label: '我的笔记', icon: '📝', desc: '控制台新建，富文本笔记' },
];

/* ---- Notes Panel (reused from old Notes page) ---- */
function NotesPanel() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [editNoteId, setEditNoteId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [expanded, setExpanded] = useState(null);

    const loadNotes = () => {
        setLoading(true);
        docsApi.list({ doc_type: 'note' })
            .then(async (d) => {
                const noteList = Array.isArray(d) ? d : [];
                const fullNotes = await Promise.all(noteList.map(async (n) => {
                    try {
                        const contentData = await docsApi.getContent(n.id);
                        return { ...n, content: contentData.content || '' };
                    } catch (e) {
                        return { ...n, content: '' };
                    }
                }));
                setNotes(fullNotes);
            })
            .catch(() => setNotes([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadNotes(); }, []);

    const filtered = notes.filter(n =>
        !searchQuery ||
        (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.content && stripHtml(n.content).toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) { alert('标题和内容不能为空'); return; }
        try {
            await notesApi.create({ title: title.trim(), content: content.trim() });
            setTitle(''); setContent('');
            setCreateOpen(false);
            loadNotes();
        } catch (e) {
            alert('创建失败: ' + e.message);
        }
    };

    const handleEditSave = async () => {
        if (!editTitle.trim() || !editContent.trim()) { alert('标题和内容不能为空'); return; }
        try {
            await docsApi.update(editNoteId, { title: editTitle.trim(), content: editContent.trim() });
            setEditNoteId(null);
            loadNotes();
        } catch (e) {
            alert('修改失败: ' + e.message);
        }
    };

    const openEdit = (e, note) => {
        e.stopPropagation();
        setEditNoteId(note.id);
        setEditTitle(note.title);
        setEditContent(note.content || '');
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm('确认删除该笔记？')) return;
        try {
            await docsApi.delete(id);
            loadNotes();
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    };

    return (
        <>
            <div className="km-toolbar" style={{ marginBottom: 12 }}>
                <div className="km-toolbar-left">
                    <button className="btn btn-primary km-upload-btn" style={{borderRadius: 2 }} onClick={() => setCreateOpen(true)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        新建笔记
                    </button>
                </div>
                <div className="km-toolbar-right">
                    <div className="km-search">
                        <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="搜索笔记..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="km-type-filters">
                <span className="km-file-count">{filtered.length} 篇笔记</span>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>加载中...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon="📝" title="暂无笔记" desc="点击新建笔记开始记录您的灵感" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(n => {
                        const isExpanded = expanded === n.id;
                        const textOnly = stripHtml(n.content || '');
                        const preview = textOnly.length > 100 ? textOnly.slice(0, 100) + '...' : textOnly;
                        return (
                            <div key={n.id} className="card" style={{ padding: '16px 20px', cursor: 'pointer', borderLeft: '4px solid #4285F4', transition: 'all 0.2s' }} onClick={() => setExpanded(isExpanded ? null : n.id)}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <img src="/icons/云笔记.png" alt="笔记" style={{ width: 28, height: 28, flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)' }}>{n.title}</span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{formatDateTime(n.created_at)}</span>
                                        </div>
                                        {isExpanded ? (
                                            <div className="ql-editor" style={{ padding: 0, marginTop: 12, minHeight: 'auto' }}>
                                                <div dangerouslySetInnerHTML={{ __html: n.content || '<span style="color:#aaa;">(无内容)</span>' }} />
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.5, fontSize: 'var(--font-size-sm)' }}>{preview || '(无内容)'}</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                        <button className="km-icon-btn" title="编辑笔记" onClick={(e) => openEdit(e, n)}>
                                            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        </button>
                                        <button className="km-icon-btn" title="删除" onClick={(e) => handleDelete(e, n.id)}>
                                            <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal open={createOpen} title="新建富文本笔记" onClose={() => setCreateOpen(false)} footer={<><button className="btn btn-outline" onClick={() => setCreateOpen(false)}>取消</button><button className="btn btn-primary" onClick={handleCreate}>保存</button></>}>
                <div className="form-group"><label className="form-label">标题</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="笔记标题" /></div>
                <div className="form-group" style={{ marginBottom: 40 }}><label className="form-label">内容</label><SimpleEditor value={content} onChange={setContent} style={{ height: 250 }} placeholder="开始记录富文本笔记..." /></div>
            </Modal>

            <Modal open={!!editNoteId} title="编辑笔记" onClose={() => setEditNoteId(null)} footer={<><button className="btn btn-outline" onClick={() => setEditNoteId(null)}>取消</button><button className="btn btn-primary" onClick={handleEditSave}>更新</button></>}>
                <div className="form-group"><label className="form-label">标题</label><input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="笔记标题" /></div>
                <div className="form-group" style={{ marginBottom: 40 }}><label className="form-label">内容</label><SimpleEditor value={editContent} onChange={setEditContent} style={{ height: 250 }} placeholder="修改笔记内容..." /></div>
            </Modal>
        </>
    );
}

/* ---- Knowledge List Panel (for papers/webknow/llm tabs) ---- */
function KnowledgeListPanel({ tab }) {
    return (
        <EmptyState
            icon={tab.icon}
            title={`${tab.label} - 暂无内容`}
            desc={`${tab.desc}。后续由 AI 大模型自动从碎片源文件中提炼并归类。`}
        />
    );
}

export default function MyCourse() {
    const [activeTab, setActiveTab] = useState('papers');
    const currentTab = tabs.find(t => t.key === activeTab);

    return (
        <div className="page-enter">
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>MyCourse 学习</h2>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="mycourse-tabs" style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--color-border)' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '10px 20px',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: activeTab === t.key ? 600 : 400,
                            color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                            marginBottom: -2,
                            transition: 'all 0.2s',
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'notes' ? (
                <NotesPanel />
            ) : (
                <KnowledgeListPanel tab={currentTab} />
            )}
        </div>
    );
}
