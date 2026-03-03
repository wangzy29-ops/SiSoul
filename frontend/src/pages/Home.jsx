import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { chatApi, docsApi } from '../api';

export default function Home() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ docs: 0, ai: 0, sub: 0 });
    const [chatResult, setChatResult] = useState(null);
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        docsApi.list().then(docs => {
            setStats(prev => ({ ...prev, docs: Array.isArray(docs) ? docs.length : 0 }));
        }).catch(() => { });
    }, []);

    const handleSearch = async ({ query, scope, action }) => {
        setChatLoading(true);
        try {
            const result = await chatApi.ask({ query, scope });
            setChatResult(result);
        } catch {
            setChatResult({ answer: '暂时无法获取回答，请确认后端已启动。', chunks: [] });
        } finally {
            setChatLoading(false);
        }
    };

    const quickCards = [
        { icon: '📄', title: '文档管理', desc: '上传和管理您的文档文件', path: '/knowledge/documents' },
        { icon: '🌐', title: '网页收集', desc: '收藏和解析网页内容', path: '/knowledge/webpages' },
        { icon: '📝', title: '个人笔记', desc: '创建和管理富文本笔记', path: '/knowledge/notes' },
        { icon: '👤', title: '个人画像', desc: '查看AI构建的个人画像', path: '/profile/base' },
        { icon: '🤖', title: 'AI助理', desc: '查看订阅摘要和智能提醒', path: '/assistant/agent/collector' },
        { icon: '🗑️', title: '遗忘管理', desc: '回收站和一致性检查', path: '/forget/recycle' },
    ];

    return (
        <div className="page-enter">
            {/* Search */}
            <div style={{ maxWidth: 720, margin: '0 auto 48px' }}>
                <h1 style={{ textAlign: 'center', fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 8 }}>
                    <span style={{ color: 'var(--color-text)' }}>Memory</span>
                    <span style={{ color: 'var(--color-primary)' }}>Hub</span>
                </h1>
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 28, fontSize: 'var(--font-size-md)' }}>
                    搜索你的记忆库
                </p>
                <SearchBar onSearch={handleSearch} />
            </div>

            {/* Chat Result */}
            {chatLoading && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>正在检索...</div>
            )}
            {chatResult && !chatLoading && (
                <div className="card" style={{ padding: 24, marginBottom: 32, maxWidth: 720, margin: '0 auto 32px' }}>
                    <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 12, color: 'var(--color-primary)' }}>
                        💡 回答
                    </div>
                    <div style={{ lineHeight: 1.7, color: 'var(--color-text)' }}>{chatResult.answer}</div>
                    {chatResult.chunks?.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border-light)' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>参考来源:</div>
                            {chatResult.chunks.map((c, i) => (
                                <div key={i} className="tag tag-blue" style={{ marginRight: 8, marginBottom: 4 }}>
                                    文档 #{c.document_id} · {c.score.toFixed(2)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: 32 }}>
                <div className="card stat-card">
                    <div className="stat-value">{stats.docs}</div>
                    <div className="stat-label">总文档数</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{stats.ai}</div>
                    <div className="stat-label">AI助理条数</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{stats.sub}</div>
                    <div className="stat-label">订阅源</div>
                </div>
            </div>

            {/* Quick cards */}
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 20 }}>快速进入</h2>
            <div className="grid-3">
                {quickCards.map(c => (
                    <div key={c.path} className="card card-clickable" style={{ padding: 24 }} onClick={() => navigate(c.path)}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{c.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
