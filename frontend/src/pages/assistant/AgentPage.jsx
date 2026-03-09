import { useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';

/* ---- 10 个智能体的配置信息 ---- */
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
        tagline: '饮食量化与餐饮调度执行官',
        description: '我是您的专属美食家，作为饮食量化与餐饮调度执行官，擅长饮食照片解析、卡路里计算、买菜清单生成、餐厅预订和食谱推荐。无论是日常饮食管理还是特殊场合的菜单策划，我都能给出专业建议。',
        skills: ['饮食照片解析', '卡路里计算', '买菜清单生成', '餐厅预订推荐', '食谱定制推荐'],
        scenarios: ['拍一张食物照片分析营养成分', '想计算今日摄入的卡路里', '需要生成本周买菜清单', '想预订附近合适的餐厅'],
    },
    doctor: {
        name: '私人医生',
        emoji: '🩺',
        color: '#34A853',
        colorLight: '#e6f4ea',
        tagline: '医疗档案解析与生理指标中枢',
        description: '我是您的私人医生，作为医疗档案解析与生理指标中枢，能够帮助您解析和存档体检报告、追踪生理指标变化，并提供每周健康建议。我结合最新医学知识，为您的健康管理提供专业参考。',
        skills: ['体检报告解析存档', '生理指标追踪', '每周健康建议', '医疗档案管理', '健康趋势分析'],
        scenarios: ['体检报告需要解析存档', '想追踪近期的健康指标变化', '获取本周的个性化健康建议', '整理历史体检记录'],
    },
    fitness: {
        name: '健身教练',
        emoji: '💪',
        color: '#FF6D01',
        colorLight: '#fff3e0',
        tagline: '动态体能监测与卡路里精算师',
        description: '我是您的专属健身教练，作为动态体能监测与卡路里精算师，擅长汇总睡眠、运动和心率数据，计算卡路里消耗建议，并制定个性化运动计划。帮助您科学高效地管理体能状态。',
        skills: ['睡眠/运动/心率汇总', '卡路里消耗计算', '个性化运动计划', '体能数据分析', '运动损伤预防'],
        scenarios: ['查看本周睡眠和运动数据汇总', '想了解今日卡路里消耗建议', '需要制定下周运动计划', '追踪心率变化趋势'],
    },
    travel: {
        name: '出行管家',
        emoji: '✈️',
        color: '#4285F4',
        colorLight: '#e8f0fe',
        tagline: '日程聚合与差旅规划总管',
        description: '我是您的出行管家，作为日程聚合与差旅规划总管，擅长日程关联管理和旅游规划。无论是日常出行安排还是长途差旅，我都能为您提供智能化的行程方案。',
        skills: ['日程关联管理', '旅游行程规划', '差旅智能安排', '交通方案对比', '住宿餐饮推荐'],
        scenarios: ['需要关联日程安排出行', '计划一次旅游需要完整规划', '出差行程需要智能安排', '想优化日常出行路线'],
    },
    writer: {
        name: '笔杆子',
        emoji: '✍️',
        color: '#8430CE',
        colorLight: '#f3e8fd',
        tagline: '您的高效工作助理',
        description: '我是您的工作助理"笔杆子"，擅长邮件分类起草、会议纪要整理和文档管理。帮您高效处理日常工作文字任务，让工作更加井然有序。',
        skills: ['邮件分类与起草', '会议纪要整理', '文档整理归档', '报告撰写润色', '工作文案输出'],
        scenarios: ['需要分类和起草工作邮件', '整理会议纪要', '文档需要归档整理', '需要撰写工作报告'],
    },
    butler: {
        name: '大管家',
        emoji: '🏠',
        color: '#137333',
        colorLight: '#e6f4ea',
        tagline: '消费记录与智能家居管理中枢',
        description: '我是您的生活大管家，专注于消费记录管理与智能家居联动。帮您追踪和分析账单消费记录，让财务管理清晰透明（智能家居联动功能即将推出）。',
        skills: ['账单消费记录', '消费分析统计', '预算管理建议', '消费趋势追踪', '智能家居联动（规划中）'],
        scenarios: ['记录日常消费账单', '想分析本月消费情况', '需要制定消费预算', '查看消费趋势报告'],
    },
    expert: {
        name: '百事通',
        emoji: '💡',
        color: '#FBBC05',
        colorLight: '#fef7e0',
        tagline: '知识归档与智能检索专家',
        description: '我是"百事通"，专注于知识归档与检索。擅长网页、文档和笔记的归档管理，以及从海量信息中提取关键知识点，让您的知识库井然有序、随时可查。',
        skills: ['网页内容归档', '文档智能管理', '笔记分类整理', '知识点提取', '智能检索查询'],
        scenarios: ['需要归档网页/文档/笔记', '从资料中提取关键知识点', '想快速检索之前保存的内容', '整理分类知识库'],
    },
    stylist: {
        name: '形象顾问',
        emoji: '👔',
        color: '#E91E8C',
        colorLight: '#fde7f3',
        tagline: '数字衣橱与穿搭建议专家',
        description: '我是您的私人形象顾问，专注于数字衣橱管理与穿搭建议。帮您收集衣服照片并智能打标，根据场合和个人风格提供穿搭建议，还能追踪打折信息帮您购物。',
        skills: ['衣服照片收集管理', '智能服装打标', '穿搭方案推荐', '打折信息提醒', '场合着装指南'],
        scenarios: ['拍照录入新买的衣服', '需要明天的穿搭建议', '想了解关注品牌的打折信息', '重要场合的着装方案'],
    },
    engineer: {
        name: '工程师',
        emoji: '⚙️',
        color: '#607D8B',
        colorLight: '#eceff1',
        tagline: '复杂任务处理与智能编排专家',
        description: '我是您的专属工程师，擅长处理各类复杂任务。从文件格式转换到复杂任务编码，从工作流编排到自动化处理，帮您高效解决技术性问题。',
        skills: ['文件格式转换', '复杂任务编码', '任务编排调度', '自动化流程处理', '数据处理与分析'],
        scenarios: ['需要转换文件格式', '有复杂任务需要编码解决', '想编排多步骤工作流', '需要批量处理数据'],
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
