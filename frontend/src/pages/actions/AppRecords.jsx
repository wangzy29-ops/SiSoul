import EmptyState from '../../components/EmptyState';

export default function AppRecords() {
    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>App记录</h2>
            </div>
            <EmptyState icon="📱" title="暂无App记录" desc="App使用记录将展示在这里" />
        </div>
    );
}
