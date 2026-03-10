import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { docsApi, aiApi } from '../../api';
import MindmapCanvas from '../../components/MindmapCanvas';

export default function DocumentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doc, setDoc] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('content');

    // AI 结果（从后端缓存加载 + 手动生成）
    const [aiResults, setAiResults] = useState({ summary: null, mindmap: null, key_info: null });
    const [aiModels, setAiModels] = useState({
        summary: null, mindmap: null, key_info: null,
    });
    const [aiLoading, setAiLoading] = useState({ summary: false, mindmap: false, keyinfo: false, tags: false });

    // 模型选择
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');

    // 智能打标
    const [tags, setTags] = useState([]);
    const [expandedL1, setExpandedL1] = useState({});

    useEffect(() => {
        const loadDoc = async () => {
            setLoading(true);
            try {
                const d = await docsApi.get(id);
                setDoc(d);
                try {
                    const c = await docsApi.getContent(id);
                    setContent(c.content || '');
                } catch { setContent(''); }
            } catch { setDoc(null); }
            finally { setLoading(false); }
        };
        loadDoc();

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

        // 加载已有 AI 结果
        const loadAiResults = async () => {
            try {
                const data = await aiApi.getResults(id);
                setAiResults({
                    summary: data.summary || null,
                    mindmap: data.mindmap || null,
                    key_info: data.key_info || null,
                });
                setAiModels({
                    summary: data.summary_model || null,
                    mindmap: data.mindmap_model || null,
                    key_info: data.key_info_model || null,
                });
            } catch { /* ignore */ }
        };
        loadAiResults();

        // 加载已有标签
        const loadTags = async () => {
            try {
                const data = await aiApi.getTags(id);
                setTags(data.tags || []);
            } catch { setTags([]); }
        };
        loadTags();
    }, [id]);

    // 生成 / 重新生成 AI 内容
    const handleRegenerate = async (type) => {
        const loadingKey = type === 'key_info' ? 'keyinfo' : type;
        setAiLoading(prev => ({ ...prev, [loadingKey]: true }));
        try {
            let result;
            if (type === 'summary') {
                result = await aiApi.summary(id, selectedModel, true);
                setAiResults(prev => ({ ...prev, summary: result.summary }));
                setAiModels(prev => ({ ...prev, summary: selectedModel }));
            } else if (type === 'mindmap') {
                result = await aiApi.mindmap(id, selectedModel, true);
                setAiResults(prev => ({ ...prev, mindmap: result.mindmap }));
                setAiModels(prev => ({ ...prev, mindmap: selectedModel }));
            } else if (type === 'key_info') {
                result = await aiApi.keyInfo(id, selectedModel, true);
                setAiResults(prev => ({ ...prev, key_info: result.key_info }));
                setAiModels(prev => ({ ...prev, key_info: selectedModel }));
            }
        } catch (e) {
            alert('生成失败: ' + e.message);
        } finally {
            setAiLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    // 首次点击 tab 时触发生成（如果尚无缓存）
    const handleTabClick = async (tab) => {
        setActiveTab(tab);
        if (['summary', 'mindmap', 'keyinfo'].includes(tab)) {
            const resultKey = tab === 'keyinfo' ? 'key_info' : tab;
            if (!aiResults[resultKey]) {
                // 无缓存，自动生成
                await handleRegenerate(resultKey);
            }
        }
    };

    const handleGenerateTags = async () => {
        setAiLoading(prev => ({ ...prev, tags: true }));
        try {
            const data = await aiApi.generateTags(id, selectedModel);
            setTags(data.tags || []);
        } catch (e) { alert('打标失败: ' + e.message); }
        finally { setAiLoading(prev => ({ ...prev, tags: false })); }
    };

    // 标签树形结构
    const buildTagTree = (tags) => {
        const tree = {};
        tags.forEach(t => {
            if (!tree[t.level1]) tree[t.level1] = {};
            if (!tree[t.level1][t.level2]) tree[t.level1][t.level2] = [];
            tree[t.level1][t.level2].push(t.level3);
        });
        return tree;
    };
    const toggleL1 = (l1) => setExpandedL1(prev => ({ ...prev, [l1]: !prev[l1] }));

    const typeLabels = {
        word: 'Word文档', doc: 'Word文档', pdf: 'PDF文档', excel: 'Excel表格',
        xls: 'Excel表格', ppt: 'PPT演示', txt: '文本文件', note: '笔记',
        web: '网页', audio: '音频', video: '视频', image: '图片',
    };
    const formatDate = (d) => !d ? '-' : new Date(d).toLocaleString('zh-CN');
    const formatSize = (b) => {
        if (!b) return '-';
        const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return (b / Math.pow(k, i)).toFixed(1) + s[i];
    };

    if (loading) {
        return <div className="page-enter" style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>加载中...</div>;
    }
    if (!doc) {
        return (
            <div className="page-enter" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📄</div>
                <div style={{ color: 'var(--color-text-secondary)' }}>文档不存在或已被删除</div>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/knowledge/documents')}>返回文档列表</button>
            </div>
        );
    }

    const tagTree = buildTagTree(tags);
    const l1Colors = {
        '基础画像': '#6366f1', '衣食住行': '#f59e0b', '健康身心': '#10b981',
        '精神世界': '#8b5cf6', '表达特质': '#ec4899', '认知视角': '#3b82f6',
        '即时意图': '#f97316', '负向标签': '#ef4444',
    };

    // 模型选择器 + 重新生成按钮 组件
    const RegenBar = ({ type, label }) => {
        const loadingKey = type === 'key_info' ? 'keyinfo' : type;
        const isLoading = aiLoading[loadingKey];
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* 模型选择器 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', background: 'var(--color-bg-secondary, #f5f5f5)',
                    borderRadius: 2, fontSize: 12,
                }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" style={{ opacity: 0.4, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                        <path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
                    </svg>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer', outline: 'none', fontWeight: 500 }}
                    >
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                {/* 重新生成按钮 */}
                <button
                    className="btn btn-outline"
                    onClick={() => handleRegenerate(type)}
                    disabled={isLoading}
                    style={{ fontSize: 12, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8 }}
                >
                    {isLoading ? (
                        <><div className="spinner" style={{ width: 12, height: 12 }} /> 生成中...</>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="12" height="12" style={{ stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            重新生成
                        </>
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="page-enter doc-detail" style={activeTab === 'mindmap' ? { maxWidth: 'none' } : undefined}>
            {/* Header */}
            <div className="doc-detail-header">
                <button className="btn btn-outline km-upload-btn" style={{ height: 34, gap: 6, fontSize: 13, marginLeft: -10 }} onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    返回
                </button>
                <div className="doc-detail-title">
                    <h1>{doc.title}</h1>
                    <div className="doc-detail-meta">
                        <span className="tag tag-blue">{typeLabels[doc.doc_type] || doc.doc_type}</span>
                        <span className={`tag ${doc.status === 'parsed' ? 'tag-green' : 'tag-yellow'}`}>{doc.status}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{formatSize(doc.file_size)} · {formatDate(doc.created_at)}</span>
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="doc-tabs" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div className={`doc-tab ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    文件内容
                </div>
                <div className={`doc-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => handleTabClick('summary')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="13" y2="16" /></svg>
                    AI 摘要
                </div>
                <div className={`doc-tab ${activeTab === 'mindmap' ? 'active' : ''}`} onClick={() => handleTabClick('mindmap')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" /></svg>
                    思维导图
                </div>
                <div className={`doc-tab ${activeTab === 'keyinfo' ? 'active' : ''}`} onClick={() => handleTabClick('keyinfo')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    关键信息
                </div>
                <div className={`doc-tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                    智能打标
                </div>
            </div>

            {/* Content Area */}
            <div className="doc-content-area">
                {/* 文件内容 */}
                {activeTab === 'content' && (
                    <div className="doc-content-text">
                        {content ? (
                            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)' }}>{content}</pre>
                        ) : (
                            <div className="doc-content-empty">
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📄</div>
                                <div>暂无可展示的文件内容</div>
                                <div style={{ fontSize: 12, marginTop: 8, color: 'var(--color-text-muted)' }}>文件可能仍在解析中，或该类型不支持内容预览</div>
                            </div>
                        )}
                    </div>
                )}

                {/* AI 摘要 */}
                {activeTab === 'summary' && (
                    <div className="doc-ai-result">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>📝 AI 摘要</h3>
                            <RegenBar type="summary" />
                        </div>
                        {aiLoading.summary ? (
                            <div className="doc-ai-loading"><div className="spinner" /><span>AI 正在使用 {selectedModel} 生成摘要...</span></div>
                        ) : aiResults.summary ? (
                            <div className="doc-ai-content">
                                <div style={{ lineHeight: 1.8 }}>{aiResults.summary}</div>
                                {aiModels.summary && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 12 }}>由 {aiModels.summary} 生成</div>}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📝</div>
                                <div>暂无摘要，后台正在生成或点击"重新生成"</div>
                            </div>
                        )}
                    </div>
                )}

                {/* 思维导图 */}
                {activeTab === 'mindmap' && (
                    <div className="doc-ai-result">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>🧠 思维导图</h3>
                            <RegenBar type="mindmap" />
                        </div>
                        {aiLoading.mindmap ? (
                            <div className="doc-ai-loading"><div className="spinner" /><span>AI 正在使用 {selectedModel} 生成思维导图...</span></div>
                        ) : aiResults.mindmap ? (
                            <MindmapCanvas key={doc.id + '-' + (aiModels.mindmap || 'default')} markdown={aiResults.mindmap} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🧠</div>
                                <div>暂无思维导图，后台正在生成或点击"重新生成"</div>
                            </div>
                        )}
                        {aiResults.mindmap && aiModels.mindmap && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 8 }}>由 {aiModels.mindmap} 生成</div>}
                    </div>
                )}

                {/* 关键信息 */}
                {activeTab === 'keyinfo' && (
                    <div className="doc-ai-result">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>⭐ 关键信息</h3>
                            <RegenBar type="key_info" />
                        </div>
                        {aiLoading.keyinfo ? (
                            <div className="doc-ai-loading"><div className="spinner" /><span>AI 正在使用 {selectedModel} 提取关键信息...</span></div>
                        ) : aiResults.key_info && aiResults.key_info.length > 0 ? (
                            <div className="doc-ai-content">
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {aiResults.key_info.map((item, i) => (
                                        <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border-light)', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>•</span>
                                            <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {aiModels.key_info && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 12 }}>由 {aiModels.key_info} 生成</div>}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>⭐</div>
                                <div>暂无关键信息，后台正在生成或点击"重新生成"</div>
                            </div>
                        )}
                    </div>
                )}

                {/* 智能打标 */}
                {activeTab === 'tags' && (
                    <div style={{ padding: '20px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-primary)', margin: 0, marginLeft: 12 }}>
                                🏷️ 智能打标
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
                                {/* 模型选择器 */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '3px 10px', background: 'var(--color-bg-secondary, #f5f5f5)',
                                    borderRadius: 2, fontSize: 12,
                                }}>
                                    <svg viewBox="0 0 24 24" width="12" height="12" style={{ opacity: 0.4, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                                        <path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
                                    </svg>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer', outline: 'none', fontWeight: 500 }}
                                    >
                                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <button
                                    className="btn btn-outline"
                                    onClick={handleGenerateTags}
                                    disabled={aiLoading.tags}
                                    style={{ fontSize: 12, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8 }}
                                >
                                    {aiLoading.tags ? (
                                        <><div className="spinner" style={{ width: 12, height: 12 }} /> 分析中...</>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" width="12" height="12" style={{ stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                            </svg>
                                            {tags.length > 0 ? '重新打标' : '开始打标'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {aiLoading.tags && (
                            <div className="doc-ai-loading">
                                <div className="spinner" />
                                <span>AI 正在使用 {selectedModel} 分析文档内容并生成标签...</span>
                            </div>
                        )}

                        {!aiLoading.tags && tags.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🏷️</div>
                                <div>暂无标签，后台正在生成或点击"开始打标"</div>
                            </div>
                        )}

                        {!aiLoading.tags && tags.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {Object.entries(tagTree).map(([l1, l2Map]) => (
                                    <div key={l1} style={{
                                        border: '1px solid var(--color-border-light, #e5e7eb)',
                                        borderRadius: 2, overflow: 'hidden',
                                        background: 'var(--color-bg-primary, #fff)',
                                    }}>
                                        <div
                                            onClick={() => toggleL1(l1)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '12px 16px', cursor: 'pointer',
                                                background: `${l1Colors[l1] || '#6366f1'}11`,
                                                borderBottom: expandedL1[l1] !== false ? '1px solid var(--color-border-light, #e5e7eb)' : 'none',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" style={{
                                                transform: expandedL1[l1] !== false ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                                stroke: l1Colors[l1] || '#6366f1', fill: 'none', strokeWidth: 2,
                                            }}>
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                            <span style={{ fontWeight: 600, fontSize: 15, color: l1Colors[l1] || '#6366f1' }}>{l1}</span>
                                            <span style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 2,
                                                background: `${l1Colors[l1] || '#6366f1'}22`,
                                                color: l1Colors[l1] || '#6366f1', fontWeight: 500,
                                            }}>
                                                {Object.values(l2Map).reduce((s, arr) => s + arr.length, 0)} 个标签
                                            </span>
                                        </div>
                                        {expandedL1[l1] !== false && (
                                            <div style={{ padding: '8px 16px 12px' }}>
                                                {Object.entries(l2Map).map(([l2, l3List]) => (
                                                    <div key={l2} style={{ marginBottom: 8 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6, paddingLeft: 4 }}>{l2}</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 4 }}>
                                                            {l3List.map((l3, i) => (
                                                                <span key={i} style={{
                                                                    display: 'inline-flex', alignItems: 'center',
                                                                    padding: '4px 12px', borderRadius: 2,
                                                                    fontSize: 12, fontWeight: 500,
                                                                    background: `${l1Colors[l1] || '#6366f1'}15`,
                                                                    color: l1Colors[l1] || '#6366f1',
                                                                    border: `1px solid ${l1Colors[l1] || '#6366f1'}30`,
                                                                    cursor: 'default',
                                                                }}>{l3}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {tags.length > 0 && tags[0].model_used && (
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 8 }}>
                                        由 {tags[0].model_used} 模型生成 · {tags.length} 个标签
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
