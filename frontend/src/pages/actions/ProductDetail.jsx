import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../../api';
import ReactMarkdown from 'react-markdown';

const PLATFORM_LABELS = {
    taobao: '淘宝',
    tmall: '天猫',
    jd: '京东',
    pdd: '拼多多',
    vip: '唯品会',
    douyin: '抖音',
    bieyang: '别样海外购',
    unknown: '未识别',
    smzdm: '什么值得买',
};

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('raw'); // raw | intro | tags | link

    const [aiLoading, setAiLoading] = useState({ intro: false });

    const loadProduct = async () => {
        try {
            const p = await productsApi.get(id);
            setProduct(p);
        } catch (e) {
            console.error(e);
            setProduct(null);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadProduct();
            setLoading(false);
        };
        init();
    }, [id]);

    const handleGenerate = async (type) => {
        setAiLoading(prev => ({ ...prev, [type]: true }));
        try {
            if (type === 'intro') {
                await productsApi.generateIntro(id);
            }
            await loadProduct();
        } catch (e) {
            alert(`生成失败: ` + e.message);
        } finally {
            setAiLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        if (tab === 'intro' && !product?.ai_intro && !aiLoading.intro) {
            handleGenerate('intro');
        }
    };

    const formatDate = (d) => !d ? '-' : new Date(d).toLocaleString('zh-CN');

    if (loading) {
        return <div className="page-enter" style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>加载中...</div>;
    }

    if (!product) {
        return (
            <div className="page-enter" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🛍️</div>
                <div style={{ color: 'var(--color-text-secondary)' }}>商品不存在或已被删除</div>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/actions/products')}>返回商品列表</button>
            </div>
        );
    }

    // 格式化展示参数
    let parsedSpecs = product.specs_json;
    if (parsedSpecs) {
        try {
            const temp = JSON.parse(parsedSpecs);
            if (typeof temp === 'object') {
                parsedSpecs = Object.entries(temp).map(([k, v]) => `${k}: ${v}`).join('，');
            }
        } catch {
            // Already string format or natural text
        }
    }

    const getPlatformLabel = (p) => PLATFORM_LABELS[p] || p || '未知';

    return (
        <div className="page-enter doc-detail">
            {/* Header */}
            <div className="doc-detail-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn btn-outline km-upload-btn" style={{ height: 34, gap: 6, fontSize: 13, alignSelf: 'flex-start' }} onClick={() => navigate(-1)}>
                        <svg viewBox="0 0 24 24" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                        返回
                    </button>
                    {product.main_image_url || product.main_image_path ? (
                        <div style={{
                            width: 120, height: 120, borderRadius: 2, overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flexShrink: 0
                        }}>
                            <img
                                src={product.main_image_path ? `http://localhost:8000/api/products/${product.id}/image` : product.main_image_url}
                                alt={product.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    ) : (
                        <div style={{ width: 120, height: 120, borderRadius: 2, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🛍️</div>
                    )}
                </div>

                <div className="doc-detail-title" style={{ flex: 1, paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h1 style={{ fontSize: 20, marginBottom: 12, lineHeight: 1.4 }}>{product.title}</h1>
                        <button
                            className="btn btn-primary"
                            style={{ flexShrink: 0, marginLeft: 16 }}
                            onClick={() => window.open(product.source_url, '_blank')}
                        >
                            前往购买 🛒
                        </button>
                    </div>

                    <div className="doc-detail-meta" style={{ flexWrap: 'wrap', gap: 8 }}>
                        {product.platform && <span className="tag tag-blue">{getPlatformLabel(product.platform)}</span>}
                        {product.price && <span style={{ color: '#EA4335', fontWeight: 600, padding: '2px 8px', background: 'rgba(234, 67, 53, 0.1)', borderRadius: 2 }}>¥ {product.price}</span>}
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                            入库时间: {formatDate(product.created_at)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab Bar - 4 Tabs: 商品全文 | 商品介绍 | 商品标签 | 原链接 */}
            <div className="doc-tabs" style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 24 }}>
                <div className={`doc-tab ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    商品全文
                </div>
                <div className={`doc-tab ${activeTab === 'intro' ? 'active' : ''}`} onClick={() => handleTabClick('intro')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    商品介绍
                </div>
                <div className={`doc-tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                    商品标签
                </div>
                <div className={`doc-tab ${activeTab === 'link' ? 'active' : ''}`} onClick={() => setActiveTab('link')}>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    原链接
                </div>
            </div>

            {/* Tab Content */}
            <div className="doc-content-area" style={{ flex: 1, padding: 24, overflowY: 'auto', background: 'var(--color-surface)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>

                {/* 1. 商品全文 */}
                {activeTab === 'raw' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, margin: 0 }}>网页抓取全文</h3>
                        </div>
                        <div className="card" style={{ padding: 20, background: '#fafafa' }}>
                            {product.scraped_text ? (
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: 'inherit',
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    color: 'var(--color-text-primary)',
                                    margin: 0,
                                }}>
                                    {product.scraped_text}
                                </pre>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>未提取到网页正文记录</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. 商品介绍（联网搜索生成） */}
                {activeTab === 'intro' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 16, margin: 0 }}>联网商品介绍研究报告</h3>
                            <button className="btn btn-outline" style={{ height: 32, fontSize: 13, gap: 4 }} disabled={aiLoading.intro} onClick={() => handleGenerate('intro')}>
                                {aiLoading.intro ? <><div className="spinner" style={{ width: 12, height: 12 }} /> 生成中...</> : '重新生成'}
                            </button>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                            基于联网搜索能力，综合该商品的基本信息、竞品情况、商品评价等生成深度报告
                        </div>
                        {product.ai_intro ? (
                            <div className="ai-result-card markdown-body" style={{ padding: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                                <ReactMarkdown>{product.ai_intro}</ReactMarkdown>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>
                                {aiLoading.intro ? '正在搜索全网竞品资料与评价并生成深度报告...' : '暂无商品介绍，点击"重新生成"开始。'}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. 商品标签 */}
                {activeTab === 'tags' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* AI 智能分类标签 */}
                        <div>
                            <h3 style={{ fontSize: 16, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>AI 智能分类</h3>
                            {(product.level1_tag || product.level2_tag || product.level3_tag) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    {product.level1_tag && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>一级分类</span>
                                            <span className="tag" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 14, padding: '4px 12px' }}>{product.level1_tag}</span>
                                        </div>
                                    )}
                                    {product.level1_tag && product.level2_tag && <span style={{ color: 'var(--color-text-muted)', fontSize: 20 }}>&rarr;</span>}
                                    {product.level2_tag && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>二级分类</span>
                                            <span className="tag" style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 14, padding: '4px 12px' }}>{product.level2_tag}</span>
                                        </div>
                                    )}
                                    {product.level2_tag && product.level3_tag && <span style={{ color: 'var(--color-text-muted)', fontSize: 20 }}>&rarr;</span>}
                                    {product.level3_tag && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>三级分类</span>
                                            <span className="tag" style={{ background: '#dcfce7', color: '#15803d', fontSize: 14, padding: '4px 12px' }}>{product.level3_tag}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>暂无AI分类标签</div>
                            )}
                        </div>

                        {/* 商品规格 */}
                        <div>
                            <h3 style={{ fontSize: 16, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>商品规格</h3>
                            {parsedSpecs ? (
                                <div className="card" style={{ padding: 16, fontSize: 14, lineHeight: 1.6, background: '#fafafa' }}>
                                    {parsedSpecs}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>未提取到结构化规格参数</div>
                            )}
                        </div>

                        {/* 其他信息 */}
                        {product.other_info_json && (
                            <div>
                                <h3 style={{ fontSize: 16, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>补充信息</h3>
                                <div className="card" style={{ padding: 16, fontSize: 14, lineHeight: 1.6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    {product.other_info_json}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. 原链接 */}
                {activeTab === 'link' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <h3 style={{ fontSize: 16, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>链接来源信息</h3>
                            <div className="card" style={{ padding: 20, background: '#fafafa' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ width: 100, color: 'var(--color-text-muted)', fontSize: 14 }}>来源平台:</span>
                                        <span className="tag" style={{ background: '#E32A2520', color: '#E32A25' }}>
                                            {getPlatformLabel(product.original_platform || 'smzdm')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ width: 100, color: 'var(--color-text-muted)', fontSize: 14 }}>实际平台:</span>
                                        <span className="tag tag-blue">
                                            {getPlatformLabel(product.platform)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <span style={{ width: 100, color: 'var(--color-text-muted)', fontSize: 14, flexShrink: 0 }}>原始链接:</span>
                                        <a 
                                            href={product.source_url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            style={{ 
                                                color: 'var(--color-primary)', 
                                                wordBreak: 'break-all',
                                                fontSize: 14,
                                            }}
                                        >
                                            {product.source_url}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 1 }}
                                onClick={() => window.open(product.source_url, '_blank')}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: 6 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                前往什么值得买查看
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
