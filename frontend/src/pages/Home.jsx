import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi, aiApi } from '../api';

export default function Home() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [chatResult, setChatResult] = useState(null);
    const [chatLoading, setChatLoading] = useState(false);

    // 模型选择
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');

    useEffect(() => {
        // 加载模型列表
        const loadModels = async () => {
            try {
                const data = await aiApi.models();
                setModels(data.models || []);
                setSelectedModel(data.default || 'qwen3.5-plus');
            } catch {
                setModels(['qwen3.5-plus']);
                setSelectedModel('qwen3.5-plus');
            }
        };
        loadModels();
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setChatLoading(true);
        try {
            const result = await chatApi.ask({ query: query.trim(), scope: 'global' });
            setChatResult(result);
        } catch {
            setChatResult({ answer: '暂时无法获取回答，请确认后端已启动。', chunks: [] });
        } finally {
            setChatLoading(false);
        }
    };

    // 原有功能按钮
    const toolCards = [
        {
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
            ),
            iconBg: '#1f2937',
            title: '文档管理',
            desc: '上传和管理您的文档文件',
            path: '/knowledge/documents',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
            ),
            iconBg: '#1f2937',
            title: '网页收集',
            desc: '收藏和解析网页内容',
            path: '/knowledge/webpages',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            iconBg: '#1f2937',
            title: '个人笔记',
            desc: '创建和管理富文本笔记',
            path: '/knowledge/notes',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
            iconBg: '#1f2937',
            title: '个人画像',
            desc: '查看AI构建的个人画像',
            path: '/profile/base',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="16" r="1" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            ),
            iconBg: '#1f2937',
            title: 'AI助理',
            desc: '查看订阅摘要和智能提醒',
            path: '/assistant/agent/collector',
        },
        {
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            ),
            iconBg: '#1f2937',
            title: '遗忘管理',
            desc: '回收站和一致性检查',
            path: '/forget/recycle',
        },
    ];

    return (
        <div style={{
            minHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 60,
            paddingBottom: 40,
        }}>
            {/* Logo */}
            <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 700, fontFamily: 'Impact, sans-serif', color: '#67bed9' }}>Si</span>
                <span style={{ fontSize: 42, fontWeight: 700, fontFamily: 'Impact, sans-serif', color: '#1f2937' }}>Soul</span>
            </div>

            {/* Tagline */}
            <p style={{
                color: '#6b7280',
                fontSize: 15,
                marginBottom: 40,
                textAlign: 'center',
            }}>
                我是你的数字分身，有什么想了解的？
            </p>

            {/* Search Bar - 加宽1.2倍 */}
            <div style={{
                width: '100%',
                maxWidth: 768, // 640 * 1.2
                marginBottom: 24,
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: '16px 20px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}>
                    {/* 输入区域 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Textarea - 加高2.5倍 */}
                        <textarea
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSearch();
                                }
                            }}
                            placeholder="输入提取碎片的关键词"
                            style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                fontSize: 15,
                                color: '#1f2937',
                                outline: 'none',
                                resize: 'none',
                                minHeight: 100, // 原来约40px，2.5倍约100px
                                lineHeight: 1.5,
                            }}
                        />
                    </div>

                    {/* 底部工具栏 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 12,
                    }}>
                        {/* 模型选择器 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 12px',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            fontSize: 13,
                        }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" style={{ opacity: 0.5, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                                <path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
                            </svg>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: 13,
                                    color: '#374151',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontWeight: 500,
                                }}
                            >
                                {models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* Send button */}
                        <button
                            onClick={handleSearch}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '10px 20px',
                                borderRadius: 10,
                                border: 'none',
                                background: chatLoading ? '#e5e7eb' : '#1f2937',
                                cursor: chatLoading ? 'not-allowed' : 'pointer',
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: 500,
                                transition: 'background 0.2s',
                            }}
                            disabled={chatLoading}
                        >
                            {chatLoading ? '检索中...' : '发送'}
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tool Cards - 使用原有功能 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                width: '100%',
                maxWidth: 768,
            }}>
                {toolCards.map(card => (
                    <div
                        key={card.title}
                        onClick={() => navigate(card.path)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: 18,
                            background: '#fff',
                            border: '1px solid #f3f4f6',
                            borderRadius: 14,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: card.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {card.icon}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937', marginBottom: 2 }}>
                                {card.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {card.desc}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Result */}
            {chatLoading && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                    正在检索...
                </div>
            )}
            {chatResult && !chatLoading && (
                <div style={{
                    width: '100%',
                    maxWidth: 768,
                    marginTop: 32,
                    padding: 24,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#3b82f6' }}>
                        💡 回答
                    </div>
                    <div style={{ lineHeight: 1.7, color: '#1f2937' }}>{chatResult.answer}</div>
                    {chatResult.chunks?.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>参考来源:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {chatResult.chunks.map((c, i) => (
                                    <span key={i} style={{
                                        padding: '4px 10px',
                                        background: '#eff6ff',
                                        color: '#3b82f6',
                                        borderRadius: 6,
                                        fontSize: 12,
                                    }}>
                                        文档 #{c.document_id} · {c.score.toFixed(2)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
