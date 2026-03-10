import EmptyState from '../../components/EmptyState';

export default function MyAction() {
    return (
        <div className="page-enter">
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>MyAction 行为</h2>
                </div>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: '0 0 20px 0' }}>
                通过 OpenClaw 操作各业务 App 的记录，按 App 维度分析操作频率与使用深度
            </p>

            <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 12 }}>📱 App 浏览记录</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {/* Placeholder stat cards */}
                    {[
                        { name: '操作频率', icon: '📈', desc: '各 App 操作次数统计', color: '#3b82f6' },
                        { name: '使用深度', icon: '🔍', desc: '每个消息的行为动作分析', color: '#10b981' },
                        { name: 'App 分布', icon: '📊', desc: '按 App 维度梳理使用情况', color: '#8b5cf6' },
                    ].map(s => (
                        <div key={s.name} style={{
                            padding: '16px',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 8,
                            borderLeft: `4px solid ${s.color}`,
                        }}>
                            <div style={{ fontSize: 'var(--font-size-md)', marginBottom: 4 }}>{s.icon} {s.name}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.desc}</div>
                            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: s.color }}>--</div>
                        </div>
                    ))}
                </div>
            </div>

            <EmptyState icon="📱" title="暂无 App 行为记录" desc="OpenClaw 操作记录将自动同步到此处" />
        </div>
    );
}
