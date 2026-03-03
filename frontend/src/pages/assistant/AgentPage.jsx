import { useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';

/* ---- 9 个智能体的配置信息 ---- */
const AGENT_CONFIG = {
    collector: {
        name: '拾光者',
        emoji: '🌅',
        color: '#FF6D01',
        colorLight: '#fff3e0',
        tagline: '每日精选信息与知识，订阅快讯一手掌握',
        description: '我是"拾光者"，每天为您搜集和整理感兴趣的信息与知识。我会关注您订阅的新闻源和快讯，将海量信息浓缩为精华摘要，让您用最短的时间掌握最有价值的内容。无论是行业动态、热点资讯，还是个人兴趣领域的深度内容，都会为您精心筛选、分类呈现。',
        skills: ['每日信息精选推送', '订阅新闻智能摘要', '兴趣领域深度挖掘', '热点趋势快速捕捉', '多源信息聚合整理'],
        scenarios: ['想快速了解今天的重要新闻', '订阅的资讯太多来不及看', '想发现感兴趣领域的新内容', '需要某个话题的信息汇总'],
    },
    foodie: {
        name: '美食家',
        emoji: '🍽️',
        color: '#EA4335',
        colorLight: '#fce8e6',
        tagline: '懂食材、会烹饪、善搭配的私人美食顾问',
        description: '我是您的专属美食家，精通中西餐饮文化，从食材挑选、营养搭配到烹饪技巧，为您提供全方位的美食指导。无论是日常家庭餐食还是特殊场合的菜单策划，我都能给出专业建议。',
        skills: ['菜谱推荐与定制', '食材营养分析', '烹饪技巧指导', '餐厅与美食推荐', '饮食文化科普'],
        scenarios: ['不知道今天吃什么', '想学做一道新菜', '需要宴客菜单策划', '想了解食材营养价值'],
    },
    doctor: {
        name: '私人医生',
        emoji: '🩺',
        color: '#34A853',
        colorLight: '#e6f4ea',
        tagline: '关注健康细节，提供专业医学参考',
        description: '我是您的私人医生助理，能够帮助您理解常见健康问题、解读体检报告、提供日常保健建议。我结合最新医学知识，为您的健康管理提供参考性信息。',
        skills: ['健康知识科普', '体检报告解读', '日常保健建议', '常见症状分析', '用药注意事项'],
        scenarios: ['体检报告看不懂', '身体出现不适症状', '想了解某种疾病的预防', '用药方面有疑问'],
    },
    fitness: {
        name: '健身教练',
        emoji: '💪',
        color: '#FF6D01',
        colorLight: '#fff3e0',
        tagline: '科学锻炼，高效塑形，打造最佳体态',
        description: '我是您的专属健身教练，根据您的身体状况和健身目标制定个性化训练计划。从力量训练到有氧运动，从塑形到减脂，帮助您科学高效地达成健身目标。',
        skills: ['个性化训练计划', '动作规范指导', '饮食配合建议', '运动损伤预防', '体能评估分析'],
        scenarios: ['想开始健身但不知从何下手', '需要制定减脂/增肌计划', '运动后肌肉酸痛', '想了解正确的锻炼姿势'],
    },
    travel: {
        name: '出行管家',
        emoji: '✈️',
        color: '#4285F4',
        colorLight: '#e8f0fe',
        tagline: '精心规划每一段旅程，让出行无忧',
        description: '我是您的出行管家，擅长旅行路线规划、目的地推荐和行程安排。无论是短途周边游还是长途旅行，我都能为您提供详尽的出行建议，让每一次旅程都充满美好。',
        skills: ['行程智能规划', '目的地攻略', '交通方案对比', '住宿餐饮推荐', '旅行注意事项'],
        scenarios: ['周末想出去走走', '计划长假旅行', '想找小众旅行地', '出差需要行程安排'],
    },
    writer: {
        name: '笔杆子',
        emoji: '✍️',
        color: '#8430CE',
        colorLight: '#f3e8fd',
        tagline: '妙笔生花，助您高效输出优质内容',
        description: '我是您的写作助手"笔杆子"，擅长各类文体写作和内容创作。从工作报告到创意文案，从会议纪要到社交文字，帮您用精准的表达传递每一个想法。',
        skills: ['文案撰写与润色', '报告/总结生成', '邮件高效编写', '创意内容策划', '多风格文字输出'],
        scenarios: ['需要写工作周报/月报', '要撰写商务邮件', '想发一条朋友圈/社交动态', '需要一篇活动策划方案'],
    },
    butler: {
        name: '大管家',
        emoji: '🏠',
        color: '#137333',
        colorLight: '#e6f4ea',
        tagline: '统筹安排，让生活井井有条',
        description: '我是您的生活大管家，帮您管理日程、协调事务、优化生活安排。从家庭事务到个人时间管理，让一切有条不紊、高效运转。',
        skills: ['日程安排与提醒', '待办事项管理', '家庭事务协调', '生活效率优化', '物品采购清单'],
        scenarios: ['需要整理本周日程', '家里有东西要采购', '想优化时间管理', '需要安排一场家庭聚会'],
    },
    expert: {
        name: '百事通',
        emoji: '💡',
        color: '#FBBC05',
        colorLight: '#fef7e0',
        tagline: '博学多识，有问必答的全能助手',
        description: '我是"百事通"，涉猎广泛、见识丰富。无论是生活常识、科技趋势、历史文化，还是冷知识和趣闻，我都能为您提供详尽而有趣的解答。',
        skills: ['百科知识问答', '热点趋势解读', '概念通俗解释', '对比分析建议', '学习资源推荐'],
        scenarios: ['遇到了不懂的概念或名词', '想了解某个领域的趋势', '好奇某个冷知识', '需要对比两个选项的优劣'],
    },
    stylist: {
        name: '形象顾问',
        emoji: '👔',
        color: '#E91E8C',
        colorLight: '#fde7f3',
        tagline: '量身打造，提升个人形象与气质',
        description: '我是您的私人形象顾问，从穿搭配色到场合着装，从发型建议到整体造型，帮助您展现最佳形象。根据您的个人风格和需求，提供专属的形象提升方案。',
        skills: ['穿搭方案推荐', '配色指导建议', '场合着装指南', '个人风格分析', '购物清单定制'],
        scenarios: ['重要会议不知道穿什么', '想改变日常穿搭风格', '约会/面试的着装建议', '换季需要更新衣橱'],
    },
};

export default function AgentPage() {
    const { agentKey } = useParams();
    const agent = AGENT_CONFIG[agentKey];

    if (!agent) {
        return (
            <div className="page-enter">
                <EmptyState icon="🤖" title="未找到该智能体" desc="请从侧边栏选择一个智能体" />
            </div>
        );
    }

    return (
        <div className="page-enter">
            {/* ===== 头部横幅 ===== */}
            <div className="agent-hero" style={{ '--agent-color': agent.color, '--agent-color-light': agent.colorLight }}>
                <div className="agent-hero-icon">{agent.emoji}</div>
                <div className="agent-hero-info">
                    <h1 className="agent-hero-name">{agent.name}</h1>
                    <p className="agent-hero-tagline">{agent.tagline}</p>
                </div>
            </div>

            {/* ===== 板块一：智能体介绍 ===== */}
            <div className="agent-section">
                <div className="agent-section-header">
                    <span className="agent-section-dot" style={{ background: agent.color }} />
                    <h2>智能体介绍</h2>
                </div>
                <div className="card agent-intro-card">
                    <p className="agent-description">{agent.description}</p>
                    <div className="agent-skills">
                        <h3>擅长能力</h3>
                        <div className="agent-skill-tags">
                            {agent.skills.map((skill, i) => (
                                <span key={i} className="agent-skill-tag" style={{ color: agent.color, background: agent.colorLight }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="agent-scenarios">
                        <h3>使用场景</h3>
                        <ul>
                            {agent.scenarios.map((s, i) => (
                                <li key={i}>{s}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ===== 板块二：建议方案 ===== */}
            <div className="agent-section">
                <div className="agent-section-header">
                    <span className="agent-section-dot" style={{ background: agent.color }} />
                    <h2>建议方案</h2>
                </div>
                <EmptyState
                    icon={agent.emoji}
                    title="暂无建议方案"
                    desc={`${agent.name}正在分析您的数据，建议方案将在这里展示`}
                />
            </div>
        </div>
    );
}
