import { useState, useRef, useCallback } from 'react';
import { engineerApi } from '../../api';

/* ---- 工程师智能体配置 ---- */
const ENGINEER = {
    name: '工程师',
    emoji: '⚙️',
    color: '#607D8B',
    colorLight: '#eceff1',
    tagline: '复杂任务处理与智能编排专家',
    description:
        '我是您的专属工程师，擅长处理各类复杂任务。从文件格式转换到复杂任务编码，从工作流编排到自动化处理，帮您高效解决技术性问题。',
    skills: ['文件格式转换', '复杂任务编码', '任务编排调度', '自动化流程处理', '数据处理与分析'],
    scenarios: ['需要转换文件格式', '有复杂任务需要编码解决', '想编排多步骤工作流', '需要批量处理数据'],
};

/* ---- 语音选项 ---- */
const VOICE_OPTIONS = [
    { value: 'auto', label: '自动识别' },
    { value: 'xiaoxiao', label: '晓晓（中文女声）', group: '中文' },
    { value: 'xiaoyi', label: '晓伊（中文女声）', group: '中文' },
    { value: 'yunyang', label: '云扬（中文男声）', group: '中文' },
    { value: 'jenny', label: 'Jenny（英文女声）', group: '英文' },
    { value: 'aria', label: 'Aria（英文女声）', group: '英文' },
    { value: 'guy', label: 'Guy（英文男声）', group: '英文' },
];
const SPEED_OPTIONS = [
    { value: 'slow', label: '慢速' },
    { value: 'normal', label: '正常' },
    { value: 'fast', label: '快速' },
];
const VOLUME_OPTIONS = [
    { value: 'low', label: '低音量' },
    { value: 'normal', label: '正常' },
    { value: 'loud', label: '高音量' },
];

export default function EngineerPage() {
    const [file, setFile] = useState(null);
    const [voice, setVoice] = useState('auto');
    const [speed, setSpeed] = useState('normal');
    const [volume, setVolume] = useState('normal');
    const [converting, setConverting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = useCallback((f) => {
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['doc', 'docx'].includes(ext)) {
            setError('请上传 DOC 或 DOCX 格式的文件');
            return;
        }
        if (f.size > 50 * 1024 * 1024) {
            setError('文件大小不能超过 50MB');
            return;
        }
        setFile(f);
        setError('');
        setResult(null);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    }, [handleFile]);

    const handleConvert = async () => {
        if (!file) return;
        setConverting(true);
        setError('');
        setResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('voice', voice);
            formData.append('speed', speed);
            formData.append('volume', volume);
            const data = await engineerApi.doc2audio(formData);
            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || '转换失败');
            }
        } catch (err) {
            setError(err.message || '网络错误');
        } finally {
            setConverting(false);
        }
    };

    const langNames = { zh: '中文', en: '英文' };
    const voiceNames = {
        'zh-CN': '晓晓 (XiaoxiaoNeural)',
        en: 'Jenny (JennyNeural)',
    };

    return (
        <div className="page-enter">
            {/* ===== Hero ===== */}
            <div className="agent-hero" style={{ '--agent-color': ENGINEER.color, '--agent-color-light': ENGINEER.colorLight }}>
                <div className="agent-hero-icon">{ENGINEER.emoji}</div>
                <div className="agent-hero-info">
                    <h1 className="agent-hero-name">{ENGINEER.name}</h1>
                    <p className="agent-hero-tagline">{ENGINEER.tagline}</p>
                </div>
            </div>

            {/* ===== 板块一：智能体介绍 ===== */}
            <div className="agent-section">
                <div className="agent-section-header">
                    <span className="agent-section-dot" style={{ background: ENGINEER.color }} />
                    <h2>智能体介绍</h2>
                </div>
                <div className="card agent-intro-card">
                    <p className="agent-description">{ENGINEER.description}</p>
                    <div className="agent-skills">
                        <h3>擅长能力</h3>
                        <div className="agent-skill-tags">
                            {ENGINEER.skills.map((s, i) => (
                                <span key={i} className="agent-skill-tag" style={{ color: ENGINEER.color, background: ENGINEER.colorLight }}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="agent-scenarios">
                        <h3>使用场景</h3>
                        <ul>
                            {ENGINEER.scenarios.map((s, i) => (
                                <li key={i}>{s}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ===== 板块二：文档转语音 ===== */}
            <div className="agent-section">
                <div className="agent-section-header">
                    <span className="agent-section-dot" style={{ background: ENGINEER.color }} />
                    <h2>📄 文档转语音</h2>
                </div>

                {/* -- 上传区 -- */}
                <div className="card" style={{ padding: 24 }}>
                    <div
                        className={`eng-upload-area${dragOver ? ' eng-dragover' : ''}${file ? ' eng-has-file' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".doc,.docx"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                        />
                        {!file ? (
                            <>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17,8 12,3 7,8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <p style={{ margin: '12px 0 4px', fontWeight: 500 }}>点击或拖拽文件到此处上传</p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>支持 .doc 和 .docx 格式，最大 50MB</p>
                            </>
                        ) : (
                            <div className="eng-file-info">
                                <span style={{ fontSize: 28 }}>📄</span>
                                <span style={{ fontWeight: 500, flex: 1 }}>{file.name}</span>
                                <button
                                    className="eng-file-remove"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* -- 语音设置 -- */}
                    <div className="eng-settings">
                        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 12 }}>语音设置</h3>
                        <div className="eng-settings-grid">
                            <label>
                                <span className="eng-label">语音选择</span>
                                <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                                    {VOICE_OPTIONS.map((v) => (
                                        <option key={v.value} value={v.value}>{v.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="eng-label">语速</span>
                                <select value={speed} onChange={(e) => setSpeed(e.target.value)}>
                                    {SPEED_OPTIONS.map((v) => (
                                        <option key={v.value} value={v.value}>{v.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="eng-label">音量</span>
                                <select value={volume} onChange={(e) => setVolume(e.target.value)}>
                                    {VOLUME_OPTIONS.map((v) => (
                                        <option key={v.value} value={v.value}>{v.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    {/* -- 转换按钮 -- */}
                    <button
                        className="eng-convert-btn"
                        disabled={!file || converting}
                        onClick={handleConvert}
                        style={{ '--eng-color': ENGINEER.color }}
                    >
                        {converting && <span className="eng-spinner" />}
                        {converting ? '转换中…' : '开始转换'}
                    </button>

                    {/* -- 错误提示 -- */}
                    {error && (
                        <div className="eng-error">⚠ {error}</div>
                    )}

                    {/* -- 结果 -- */}
                    {result && (
                        <div className="eng-result">
                            <div className="eng-result-success">✓ 转换成功！</div>
                            <div className="eng-result-details">
                                <div className="eng-result-item">
                                    <div className="eng-result-label">检测语言</div>
                                    <div className="eng-result-value">{langNames[result.language] || result.language}</div>
                                </div>
                                <div className="eng-result-item">
                                    <div className="eng-result-label">文本长度</div>
                                    <div className="eng-result-value">{result.text_length} 字符</div>
                                </div>
                                <div className="eng-result-item">
                                    <div className="eng-result-label">使用语音</div>
                                    <div className="eng-result-value">{voiceNames[result.voice] || result.voice}</div>
                                </div>
                            </div>
                            <a
                                className="eng-download-btn"
                                href={engineerApi.downloadUrl(result.download_url)}
                                download
                            >
                                ⬇ 下载 MP3 文件
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== 内联样式 ===== */}
            <style>{`
                .eng-upload-area {
                    border: 2px dashed var(--color-border);
                    border-radius: 12px;
                    padding: 40px 24px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.25s;
                    margin-bottom: 20px;
                }
                .eng-upload-area:hover, .eng-upload-area.eng-dragover {
                    border-color: ${ENGINEER.color};
                    background: ${ENGINEER.colorLight};
                }
                .eng-upload-area.eng-has-file {
                    border-style: solid;
                    border-color: var(--color-border);
                    padding: 16px 20px;
                }
                .eng-file-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .eng-file-remove {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: var(--color-text-muted);
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .eng-file-remove:hover {
                    color: var(--color-error, #ef4444);
                    background: rgba(239,68,68,0.1);
                }
                .eng-settings {
                    margin-bottom: 20px;
                }
                .eng-settings-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }
                @media (max-width: 640px) {
                    .eng-settings-grid { grid-template-columns: 1fr; }
                }
                .eng-settings-grid label {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .eng-label {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                }
                .eng-settings-grid select {
                    padding: 10px 14px;
                    border-radius: 8px;
                    border: 1px solid var(--color-border);
                    background: var(--color-bg);
                    color: var(--color-text);
                    font-size: var(--font-size-sm);
                    cursor: pointer;
                    transition: border-color 0.2s;
                }
                .eng-settings-grid select:hover,
                .eng-settings-grid select:focus {
                    border-color: ${ENGINEER.color};
                    outline: none;
                }
                .eng-convert-btn {
                    width: 100%;
                    padding: 14px;
                    background: var(--eng-color);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: var(--font-size-md);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.25s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .eng-convert-btn:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(96,125,139,0.3);
                }
                .eng-convert-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .eng-spinner {
                    width: 18px; height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: eng-spin 0.7s linear infinite;
                }
                @keyframes eng-spin { to { transform: rotate(360deg); } }
                .eng-error {
                    margin-top: 16px;
                    padding: 12px 16px;
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.3);
                    border-radius: 8px;
                    color: #ef4444;
                    font-size: var(--font-size-sm);
                }
                .eng-result {
                    margin-top: 20px;
                }
                .eng-result-success {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: rgba(16,185,129,0.08);
                    border: 1px solid rgba(16,185,129,0.3);
                    border-radius: 8px;
                    color: #10b981;
                    font-weight: 500;
                    margin-bottom: 16px;
                }
                .eng-result-details {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .eng-result-item {
                    background: var(--color-bg);
                    border-radius: 8px;
                    padding: 12px;
                }
                .eng-result-label {
                    font-size: var(--font-size-xs, 12px);
                    color: var(--color-text-muted);
                    margin-bottom: 4px;
                }
                .eng-result-value {
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                }
                .eng-download-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 13px;
                    background: #10b981;
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    font-weight: 600;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .eng-download-btn:hover {
                    background: #0ea572;
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
}
