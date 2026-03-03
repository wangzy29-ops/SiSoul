import EmptyState from '../../components/EmptyState';

export default function Interest() {
    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>🔍 兴趣推送</h2>
            </div>
            <EmptyState icon="🔍" title="暂无兴趣推送" desc="基于用户画像，推送个人感兴趣的联网搜索信息" />
        </div>
    );
}
