import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

/* ---- Inline SVG icons (stroke-based, linear) ---- */
const icons = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    knowledge: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    actions: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>,
    profile: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    assistant: <><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
    forget: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    video: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>,
    audio: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    web: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
    note: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
    favorite: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>,
    product: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
    app: <><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
    // Profile icons (8 tag dimensions)
    profileBase: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    profileLifestyle: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
    profileHealth: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
    profileSpirit: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
    profileExpression: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
    profileCognition: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
    profileIntent: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    profileNegative: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>,
    recycle: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    agentCollector: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /><path d="M8 2l1 3" /><path d="M16 2l-1 3" /><path d="M3 12h2" /><path d="M19 12h2" /></>,
    consistency: <><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    // AI Agent icons
    agentFoodie: <><path d="M12 2c1.1 0 2 .9 2 2v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-4 4.9V15h2a3 3 0 0 1 3 3v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2a3 3 0 0 1 3-3h2v-2.1A5 5 0 0 1 6 8V7a1 1 0 0 1 1-1h3V4c0-1.1.9-2 2-2z" /></>,
    agentDoctor: <><path d="M4.8 2.3A2 2 0 0 0 3 4.3v2a8 8 0 0 0 6 7.75V17a3 3 0 0 0 6 0v-2.95A8 8 0 0 0 21 6.3v-2a2 2 0 0 0-1.8-2" /><path d="M8 2v4" /><path d="M16 2v4" /><circle cx="12" cy="17" r="1" /></>,
    agentFitness: <><path d="M6.5 6.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0z" /><path d="M14.5 6.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0z" /><path d="M3 9.5a1.5 1.5 0 0 1 3 0v5a1.5 1.5 0 0 1-3 0z" /><path d="M18 9.5a1.5 1.5 0 0 1 3 0v5a1.5 1.5 0 0 1-3 0z" /><line x1="9.5" y1="12" x2="14.5" y2="12" /></>,
    agentTravel: <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20" /><path d="M12 2a14.5 14.5 0 0 1 0 20" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2l3 4-3 2-3-2 3-4z" /></>,
    agentWriter: <><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></>,
    agentButler: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
    agentExpert: <><circle cx="12" cy="9" r="6" /><line x1="12" y1="15" x2="12" y2="18" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="9" y1="18" x2="15" y2="18" /><line x1="12" y1="3" x2="12" y2="5" /></>,
    agentStylist: <><path d="M6 2l4 8H4l4.5 6H5l7 6 7-6h-3.5L20 10h-6l4-8" /></>,
};

const Icon = ({ name, size = 20 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        {icons[name]}
    </svg>
);

const menuConfig = [
    { key: 'home', label: '首页', icon: 'home', path: '/' },
    {
        key: 'knowledge', label: '知识', icon: 'knowledge',
        children: [
            { key: 'documents', label: '文档', icon: 'document', path: '/knowledge/documents' },
            { key: 'videos', label: '视频', icon: 'video', path: '/knowledge/videos' },
            { key: 'audios', label: '音频', icon: 'audio', path: '/knowledge/audios' },
            { key: 'webpages', label: '网页', icon: 'web', path: '/knowledge/webpages' },
            { key: 'notes', label: '笔记', icon: 'note', path: '/knowledge/notes' },
        ],
    },
    {
        key: 'actions', label: '动作', icon: 'actions',
        children: [
            { key: 'messages', label: '消息', icon: 'message', path: '/actions/messages' },
            { key: 'products', label: '商品', icon: 'product', path: '/actions/products' },
            { key: 'apprecords', label: 'App记录', icon: 'app', path: '/actions/apprecords' },
        ],
    },
    {
        key: 'profile', label: '画像', icon: 'profile',
        children: [
            { key: 'base', label: '基础画像', icon: 'profileBase', path: '/profile/base' },
            { key: 'lifestyle', label: '衣食住行', icon: 'profileLifestyle', path: '/profile/lifestyle' },
            { key: 'health', label: '健康身心', icon: 'profileHealth', path: '/profile/health' },
            { key: 'spirit', label: '精神世界', icon: 'profileSpirit', path: '/profile/spirit' },
            { key: 'expression', label: '表达特质', icon: 'profileExpression', path: '/profile/expression' },
            { key: 'cognition', label: '认知视角', icon: 'profileCognition', path: '/profile/cognition' },
            { key: 'intent', label: '即时意图', icon: 'profileIntent', path: '/profile/intent' },
            { key: 'negative', label: '负向标签', icon: 'profileNegative', path: '/profile/negative' },
        ],
    },
    {
        key: 'assistant', label: 'AI助理', icon: 'assistant',
        children: [
            { key: 'agent-collector', label: '拾光者', icon: 'agentCollector', path: '/assistant/agent/collector' },
            { key: 'agent-foodie', label: '美食家', icon: 'agentFoodie', path: '/assistant/agent/foodie' },
            { key: 'agent-doctor', label: '私人医生', icon: 'agentDoctor', path: '/assistant/agent/doctor' },
            { key: 'agent-fitness', label: '健身教练', icon: 'agentFitness', path: '/assistant/agent/fitness' },
            { key: 'agent-travel', label: '出行管家', icon: 'agentTravel', path: '/assistant/agent/travel' },
            { key: 'agent-writer', label: '笔杆子', icon: 'agentWriter', path: '/assistant/agent/writer' },
            { key: 'agent-butler', label: '大管家', icon: 'agentButler', path: '/assistant/agent/butler' },
            { key: 'agent-expert', label: '百事通', icon: 'agentExpert', path: '/assistant/agent/expert' },
            { key: 'agent-stylist', label: '形象顾问', icon: 'agentStylist', path: '/assistant/agent/stylist' },
        ],
    },
    {
        key: 'forget', label: '遗忘', icon: 'forget',
        children: [
            { key: 'recycle', label: '回收站', icon: 'recycle', path: '/forget/recycle' },
            { key: 'consistency', label: '一致性', icon: 'consistency', path: '/forget/consistency' },
        ],
    },
];

export default function Sidebar() {
    const [activeL1, setActiveL1] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Determine which L1 is currently active based on URL
    useEffect(() => {
        const path = location.pathname;
        if (path === '/') {
            setActiveL1(null);
        } else {
            for (const item of menuConfig) {
                if (item.children?.some(c => path.startsWith(c.path))) {
                    setActiveL1(item.key);
                    return;
                }
            }
        }
    }, [location.pathname]);

    const handleL1Click = (item) => {
        if (!item.children) {
            // Direct nav (e.g., 首页)
            setActiveL1(null);
            navigate(item.path);
        } else {
            if (activeL1 === item.key) {
                // Toggle off
                setActiveL1(null);
            } else {
                setActiveL1(item.key);
                // Navigate to first child
                navigate(item.children[0].path);
            }
        }
    };

    const isL1Active = (item) => {
        if (item.path) return location.pathname === item.path;
        return activeL1 === item.key;
    };

    const activeL1Item = menuConfig.find(m => m.key === activeL1);

    return (
        <div className="sidebar-two-panel">
            {/* ===== L1 Icon Rail ===== */}
            <div className="sidebar-l1">
                <Logo collapsed />
                <nav className="l1-nav">
                    {menuConfig.map(item => (
                        <div
                            key={item.key}
                            className={`l1-item ${isL1Active(item) ? 'active' : ''}`}
                            onClick={() => handleL1Click(item)}
                            title={item.label}
                        >
                            <span className="l1-icon"><Icon name={item.icon} size={22} /></span>
                            <span className="l1-label">{item.label}</span>
                        </div>
                    ))}
                </nav>
            </div>

            {/* ===== L2 Expanded Panel ===== */}
            {activeL1Item && activeL1Item.children && (
                <div className="sidebar-l2">
                    <div className="l2-header">
                        <span className="l2-title">{activeL1Item.label}</span>
                    </div>
                    <nav className="l2-nav">
                        {activeL1Item.children.map(child => (
                            <div
                                key={child.key}
                                className={`l2-item ${location.pathname === child.path ? 'active' : ''}`}
                                onClick={() => navigate(child.path)}
                            >
                                <span className="l2-icon"><Icon name={child.icon} size={18} /></span>
                                <span className="l2-label">{child.label}</span>
                            </div>
                        ))}
                    </nav>
                </div>
            )}
        </div>
    );
}
