export default function EmptyState({ icon = '📭', title = '暂无数据', desc = '' }) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <div className="empty-title">{title}</div>
            {desc && <div className="empty-desc">{desc}</div>}
        </div>
    );
}
