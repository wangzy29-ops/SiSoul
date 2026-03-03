import { useLocation } from 'react-router-dom';

const breadcrumbMap = {
    '/': ['首页'],
    '/knowledge/documents': ['知识', '文档'],
    '/knowledge/videos': ['知识', '视频'],
    '/knowledge/audios': ['知识', '音频'],
    '/knowledge/webpages': ['知识', '网页'],
    '/knowledge/notes': ['知识', '笔记'],
    '/actions/messages': ['动作', '消息'],
    '/actions/favorites': ['动作', '收藏'],
    '/actions/products': ['动作', '商品'],
    '/actions/apprecords': ['动作', 'App记录'],
    '/profile/base': ['画像', '基础画像'],
    '/profile/lifestyle': ['画像', '衣食住行'],
    '/profile/health': ['画像', '健康身心'],
    '/profile/spirit': ['画像', '精神世界'],
    '/profile/expression': ['画像', '表达特质'],
    '/profile/cognition': ['画像', '认知视角'],
    '/profile/intent': ['画像', '即时意图'],
    '/profile/negative': ['画像', '负向标签'],
    '/assistant/agent/collector': ['AI助理', '拾光者'],
    '/assistant/agent/foodie': ['AI助理', '美食家'],
    '/assistant/agent/doctor': ['AI助理', '私人医生'],
    '/assistant/agent/fitness': ['AI助理', '健身教练'],
    '/assistant/agent/travel': ['AI助理', '出行管家'],
    '/assistant/agent/writer': ['AI助理', '笔杆子'],
    '/assistant/agent/butler': ['AI助理', '大管家'],
    '/assistant/agent/expert': ['AI助理', '百事通'],
    '/assistant/agent/stylist': ['AI助理', '形象顾问'],
    '/forget/recycle': ['遗忘', '回收站'],
    '/forget/consistency': ['遗忘', '一致性'],
};

export default function Header() {
    const location = useLocation();
    const crumbs = breadcrumbMap[location.pathname] || ['MemoryHub'];

    return (
        <div className="header">
            <div className="header-breadcrumb">
                {crumbs.map((c, i) => (
                    <span key={i}>
                        {i > 0 && <span className="separator" style={{ marginRight: 8 }}>/</span>}
                        <span style={i === crumbs.length - 1 ? { fontWeight: 500, color: 'var(--color-text)' } : { color: 'var(--color-text-secondary)' }}>
                            {c}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}
