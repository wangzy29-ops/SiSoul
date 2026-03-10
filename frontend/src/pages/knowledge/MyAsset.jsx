import { useState } from 'react';
import EmptyState from '../../components/EmptyState';

const folders = [
    { key: 'finance', name: '财务账单', icon: '💰', desc: '收支明细、税务文件、报销单据' },
    { key: 'legal', name: '法律文件', icon: '📜', desc: '个人身份证明电子版、各类协议与合同' },
    { key: 'digital', name: '我的数字资产', icon: '🔐', desc: '软件授权码、加密钱包记录、重要账号备份' },
];

const FolderIcon = ({ color = '#f59e0b' }) => (
    <svg viewBox="0 0 24 24" width={40} height={40} style={{ fill: color, opacity: 0.85 }}>
        <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
);

const folderColors = ['#f59e0b', '#3b82f6', '#8b5cf6'];

export default function MyAsset() {
    const [activeFolder, setActiveFolder] = useState(null);

    if (activeFolder) {
        const folder = folders.find(f => f.key === activeFolder);
        return (
            <div className="page-enter">
                <div className="km-toolbar">
                    <div className="km-toolbar-left">
                        <button className="btn btn-outline" style={{ borderRadius: 6, fontSize: 'var(--font-size-sm)' }} onClick={() => setActiveFolder(null)}>
                            <svg viewBox="0 0 24 24" width="14" height="14" style={{ stroke: 'currentColor', strokeWidth: 2, fill: 'none', marginRight: 4 }}><polyline points="15 18 9 12 15 6" /></svg>
                            返回
                        </button>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>{folder.icon} {folder.name}</h2>
                    </div>
                </div>
                <EmptyState icon={folder.icon} title={`${folder.name} - 暂无内容`} desc={`${folder.desc}。后续由 AI 自动从碎片中归类映射。`} />
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>MyAsset 资产</h2>
                </div>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: '0 0 20px 0' }}>
                AI 自动从碎片中提取与资产相关的内容并归类到对应文件夹
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {folders.map((f, i) => (
                    <div
                        key={f.key}
                        className="card"
                        style={{ padding: '20px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                        onClick={() => setActiveFolder(f.key)}
                    >
                        <FolderIcon color={folderColors[i % folderColors.length]} />
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginTop: 10, color: 'var(--color-text)' }}>{f.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>{f.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
