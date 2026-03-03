"""智能打标服务：通过 AI 模型对文档内容进行三级标签分类。

一级/二级标签固定，三级标签由大模型根据内容自动生成。
"""
import json
import logging
from typing import List, Dict, Optional

import httpx

from ..config import get_settings
from ..models import Document, DocumentContent, DocumentTag

settings = get_settings()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 标签分类体系
# ---------------------------------------------------------------------------

TAG_TAXONOMY: Dict[str, Dict[str, List[str]]] = {
    "基础画像": {
        "职业/身份": ["IT从业者", "医疗人员", "在校大学生", "宝妈/宝爸", "退休生活者"],
        "技能/专长": ["擅长PPT", "Python", "木工", "法语", "深度潜水", "家庭维修"],
        "人生阶段": ["职场新人", "备考期", "新婚期", "育儿早期", "中年危机/转型期"],
        "地理/环境": ["一线城市（高压）", "小镇青年（闲暇）", "旅居者（频繁异地）"],
    },
    "衣食住行": {
        "衣（审美习惯）": ["极简主义", "汉服/洛丽塔（圈层）", "注重功能（机能风）", "二手/古着（环保）"],
        "食（味蕾地图）": ["厨房达人（重食材）", "外卖重度（重效率）", "精致探店", "健康轻食", "成瘾品（重度咖啡/奶茶）"],
        "住（居住生态）": ["智能家居发烧友", "断舍离践行者", "租房改造家", "养宠家庭（猫/狗/爬宠）"],
        "行（空间轨迹）": ["绿色出行（公共交通）", "自驾控", "Citywalk爱好者", "特种兵旅行", "酒店控"],
        "用（数字实物）": ["苹果/安卓生态", "效率工具控（Notion/Obsidian）", "数码产品尝鲜者", "实体书原教旨"],
    },
    "健康身心": {
        "生理健康": ["脊椎/颈椎问题（久坐族）", "脱发焦虑", "过敏源（花粉/花生）", "长期健身"],
        "心理/情绪": ["处于压力期", "情绪稳定器", "存在主义危机", "正念/冥想习惯"],
        "健康认知": ["养生迷（研究成分表）", "医疗专家型（看论文）", "佛系养生"],
    },
    "精神世界": {
        "文学偏好": ["硬核科幻", "网文追更", "非虚构纪实", "古典诗词", "个人成长类"],
        "影视品位": ["商业大片受众", "独立电影迷", "纪录片控", "二次元/番剧", "倍速看剧党"],
        "音乐审美": ["氛围Lo-fi", "古典乐/交响", "独立摇滚", "怀旧老歌", "华语流行"],
        "艺术参与": ["摄影爱好者", "看展达人", "乐器学习者", "博物馆常客"],
    },
    "表达特质": {
        "词汇偏好": ["学术专业术语", "网络热梗/模因", "职场黑话（闭环/打法）", "外语混搭（中英夹杂）"],
        "情绪色调": ["幽默毒舌", "温和知性", "严谨冷淡", "感性热烈", "极简克制"],
        "社交模式": ["深度社交", "社恐/边缘观察者", "社牛/组织者", "线上活跃/线下沉默"],
    },
    "认知视角": {
        "消费观": ["悦己消费", "实用主义", "品牌忠诚", "低碳环保"],
        "思维方式": ["逻辑理性", "直觉感性", "乐观主义", "风险厌恶", "技术崇拜"],
        "关注焦点": ["宏大叙事（政治/经济）", "个人微观生活（兴趣/情感）", "硬核技术", "人文关怀"],
    },
    "即时意图": {
        "待办事项": ["正在筹备婚礼", "准备下周汇报", "自学日语中"],
        "重要事项": ["会议", "考试", "出行"],
        "购买决策": ["正在对比洗碗机", "观望新能源车"],
        "学习路径": ["最近在研究AI绘画", "正在钻研牛排煎法"],
    },
    "负向标签": {
        "回避内容": ["拒绝短视频", "不看流量明星", "反感成功学", "对金融理财无感"],
        "物理禁忌": ["蚕豆病", "严重的幽闭恐惧", "对某种颜色极度厌恶"],
    },
}


def _build_taxonomy_text() -> str:
    """将标签树构建为 prompt 可用的文本格式。"""
    lines = []
    for l1, l2_dict in TAG_TAXONOMY.items():
        lines.append(f"一级标签: {l1}")
        for l2, examples in l2_dict.items():
            examples_str = "、".join(examples)
            lines.append(f"  二级标签: {l2}（示例三级标签: {examples_str}）")
    return "\n".join(lines)


def _truncate(text: str, max_chars: int = 4000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n...(内容过长已截断)"


def generate_tags(text: str, model: Optional[str] = None) -> List[Dict[str, str]]:
    """调用 AI 模型对文本内容进行智能打标。返回标签列表。"""
    if not text or not text.strip():
        return []

    api_key = settings.maas_api_key
    base_url = settings.maas_base_url
    if not api_key or not base_url:
        return []

    use_model = model or settings.maas_chat_model or "qwen3.5-plus"
    taxonomy_text = _build_taxonomy_text()
    truncated = _truncate(text)

    prompt = f"""你是一个个人知识库的智能打标助手。请根据以下内容，从预定义的标签体系中为这段内容打标签。

## 标签体系
{taxonomy_text}

## 规则
1. 一级和二级标签只能从上面的标签体系中选择，不可自创
2. 三级标签可以使用上面的示例，也可以根据内容自行创建，但必须隶属于一个固定的二级标签
3. 每个内容可以关联多个三级标签，选择最相关的 3-8 个
4. 只返回与内容确实相关的标签，不要强行关联

## 输出格式
请严格返回 JSON 数组格式，不要包含任何其他文字或 markdown 标记：
[{{"level1": "一级标签", "level2": "二级标签", "level3": "三级标签"}}]

## 待分析内容
{truncated}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": use_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }

    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        choices = data.get("choices", [])
        if not choices:
            return []

        content = choices[0].get("message", {}).get("content", "")
        if not content:
            return []

        # 解析 JSON — 支持被 markdown 包裹的情况
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            # 去掉首尾的 ``` 行
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines).strip()

        tags = json.loads(content)
        if not isinstance(tags, list):
            return []

        # 验证标签格式
        valid_tags = []
        valid_l1 = set(TAG_TAXONOMY.keys())
        for tag in tags:
            if not isinstance(tag, dict):
                continue
            l1 = tag.get("level1", "").strip()
            l2 = tag.get("level2", "").strip()
            l3 = tag.get("level3", "").strip()
            if l1 and l2 and l3 and l1 in valid_l1:
                # 验证 l2 是否属于 l1
                if l2 in TAG_TAXONOMY.get(l1, {}):
                    valid_tags.append({"level1": l1, "level2": l2, "level3": l3})

        return valid_tags

    except json.JSONDecodeError as e:
        logger.warning("AI 打标结果 JSON 解析失败: %s", e)
        return []
    except Exception as e:
        logger.warning("AI 打标调用失败 (model=%s): %s", use_model, e)
        return []


def tag_document(db, doc_id: int, model: Optional[str] = None) -> List[Dict[str, str]]:
    """获取文档内容并调用 AI 打标，结果写入数据库。"""
    # 获取文档内容
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return []

    content_obj = (
        db.query(DocumentContent)
        .filter(DocumentContent.document_id == doc_id)
        .order_by(DocumentContent.version.desc())
        .first()
    )
    if not content_obj:
        return []

    text = content_obj.cleaned_text or content_obj.raw_text or ""
    if not text.strip():
        return []

    use_model = model or settings.maas_chat_model or "qwen3.5-plus"

    # 调用 AI 生成标签
    tags = generate_tags(text, model=use_model)
    if not tags:
        return []

    # 清除旧标签（同模型的）
    db.query(DocumentTag).filter(
        DocumentTag.document_id == doc_id,
        DocumentTag.model_used == use_model,
    ).delete()

    # 写入新标签
    for tag in tags:
        db_tag = DocumentTag(
            document_id=doc_id,
            level1=tag["level1"],
            level2=tag["level2"],
            level3=tag["level3"],
            model_used=use_model,
        )
        db.add(db_tag)

    db.commit()
    logger.info("文档 %d 已打标 %d 个标签 (model=%s)", doc_id, len(tags), use_model)
    return tags
