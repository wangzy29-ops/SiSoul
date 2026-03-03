import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiApi } from '../../api';
import EmptyState from '../../components/EmptyState';

/* ---- 8 个画像维度配置 ---- */
const PROFILE_CONFIG = {
    base: { name: '基础画像', level1: '基础画像', emoji: '👤', color: '#4285F4', colorLight: '#e8f0fe' },
    lifestyle: { name: '衣食住行', level1: '衣食住行', emoji: '🏠', color: '#34A853', colorLight: '#e6f4ea' },
    health: { name: '健康身心', level1: '健康身心', emoji: '💚', color: '#EA4335', colorLight: '#fce8e6' },
    spirit: { name: '精神世界', level1: '精神世界', emoji: '⭐', color: '#8430CE', colorLight: '#f3e8fd' },
    expression: { name: '表达特质', level1: '表达特质', emoji: '💬', color: '#FF6D01', colorLight: '#fff3e0' },
    cognition: { name: '认知视角', level1: '认知视角', emoji: '🧠', color: '#137333', colorLight: '#e6f4ea' },
    intent: { name: '即时意图', level1: '即时意图', emoji: '⏰', color: '#FBBC05', colorLight: '#fef7e0' },
    negative: { name: '负向标签', level1: '负向标签', emoji: '🚫', color: '#9AA0A6', colorLight: '#f1f3f4' },
};

const DOC_TYPE_ICONS = {
    file: '📄', pdf: '📄', doc: '📄', docx: '📄', txt: '📄',
    image: '🖼️', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
    web: '🌐', note: '📝', video: '🎬', audio: '🎵',
};

export default function ProfileTagPage() {
    const { profileKey } = useParams();
    const navigate = useNavigate();
    const config = PROFILE_CONFIG[profileKey];

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [taxonomy, setTaxonomy] = useState(null);

    useEffect(() => {
        if (!config) return;
        setLoading(true);
        Promise.all([
            aiApi.getTagsByLevel1(config.level1).catch(() => ({ topology: {}, documents: [], tag_count: 0 })),
            aiApi.taxonomy().catch(() => ({})),
        ]).then(([tagData, taxData]) => {
            setData(tagData);
            setTaxonomy(taxData);
            setLoading(false);
        });
    }, [profileKey]);

    if (!config) {
        return (
            <div className="page-enter">
                <EmptyState icon="👤" title="未找到该画像维度" desc="请从侧边栏选择一个画像分类" />
            </div>
        );
    }

    // 合并实际标签和预设标签体系
    const mergedTopology = {};
    if (taxonomy && taxonomy[config.level1]) {
        for (const [l2, examples] of Object.entries(taxonomy[config.level1])) {
            mergedTopology[l2] = {
                preset: examples,
                actual: data?.topology?.[l2] || [],
            };
        }
    }
    // 补充实际数据中有但预设中没有的 level2
    if (data?.topology) {
        for (const [l2, tags] of Object.entries(data.topology)) {
            if (!mergedTopology[l2]) {
                mergedTopology[l2] = { preset: [], actual: tags };
            }
        }
    }

    return (
        <div className="page-enter">
            {/* ===== 头部 ===== */}
            <div className="agent-hero" style={{ '--agent-color': config.color, '--agent-color-light': config.colorLight }}>
                <div className="agent-hero-icon">{config.emoji}</div>
                <div className="agent-hero-info">
                    <h1 className="agent-hero-name">{config.name}</h1>
                    <p className="agent-hero-tagline">
                        {data ? `已识别 ${data.tag_count} 个标签 · 关联 ${data.documents?.length || 0} 篇内容` : '加载中...'}
                    </p>
                </div>
            </div>

            {/* ===== 板块一：标签拓扑画布 ===== */}
            <div className="agent-section">
                <div className="agent-section-header">
                    <span className="agent-section-dot" style={{ background: config.color }} />
                    <h2>标签拓扑</h2>
                </div>

                {loading ? (
                    <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        加载中...
                    </div>
                ) : Object.keys(mergedTopology).length === 0 ? (
                    <EmptyState icon="🏷️" title="暂无标签数据" desc="当文档被打标后，标签拓扑将在这里展示" />
                ) : (
                    <div className="tag-topology-grid">
                        {Object.entries(mergedTopology).map(([l2, { preset, actual }]) => {
                            const allTags = [...new Set([...actual, ...preset])];
                            return (
                                <div key={l2} className="tag-topology-card card">
                                    <div className="tag-topology-header" style={{ borderColor: config.color }}>
                                        <span className="tag-topology-l2">{l2}</span>
                                        <span className="tag-topology-count">{actual.length} / {allTags.length}</span>
                                    </div>
                                    <div className="tag-topology-body">
                                        {allTags.map((tag, i) => {
                                            const isActive = actual.includes(tag);
                                            return (
                                                <span
                                                    key={i}
                                                    className={`tag-node ${isActive ? 'active' : ''}`}
                                                    style={isActive ? { background: config.colorLight, color: config.color, borderColor: config.color } : {}}
                                                >
                                                    {tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===== 板块二：关联内容列表 ===== */}
            <div className="agent-section">
                <div className="agent-section-header">
                    <span className="agent-section-dot" style={{ background: config.color }} />
                    <h2>关联内容</h2>
                </div>

                {loading ? null : !data?.documents?.length ? (
                    <EmptyState icon="📄" title="暂无关联内容" desc="当文档被打上该维度标签后，将在这里展示" />
                ) : (
                    <div className="card">
                        {data.documents.map(doc => (
                            <div
                                key={doc.id}
                                className="list-item"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/knowledge/documents/${doc.id}`)}
                            >
                                <div className="list-item-icon" style={{ background: config.colorLight, color: config.color }}>
                                    {DOC_TYPE_ICONS[doc.doc_type] || '📄'}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{doc.title || `文档 #${doc.id}`}</div>
                                    <div className="list-item-desc" style={{ fontSize: 'var(--font-size-xs)' }}>
                                        {doc.doc_type} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
