"""AI 增值功能服务：摘要提取、思维导图生成、关键信息提取。

使用 OpenAI 兼容协议调用百炼平台模型（默认 qwen3.5-plus），失败时退化为本地简单处理。
"""
import logging
from typing import List, Optional

import httpx

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# 默认模型
DEFAULT_MODEL = "qwen3.5-plus"


def _call_llm(prompt: str, model: Optional[str] = None) -> Optional[str]:
    """通过 OpenAI 兼容协议调用百炼模型，返回文本结果或 None。"""
    api_key = settings.maas_api_key
    base_url = settings.maas_base_url
    if not api_key or not base_url:
        return None

    use_model = model or settings.maas_chat_model or DEFAULT_MODEL

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": use_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
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
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content", "")
            if content:
                return content
    except Exception as e:
        logger.warning("LLM 调用失败 (model=%s): %s", use_model, e)

    return None


def _truncate_for_prompt(text: str, max_bytes: int = 200000) -> str:
    """截断文本以适配 LLM 上下文长度（约200KB）。"""
    encoded = text.encode("utf-8")
    if len(encoded) <= max_bytes:
        return text
    # 截断到最大字节数，并确保不截断在多字节字符中间
    truncated = encoded[:max_bytes].decode("utf-8", errors="ignore")
    return truncated + "\n...(内容过长已截断)"


# ---------------------------------------------------------------------------
# 摘要提取
# ---------------------------------------------------------------------------

def generate_summary(text: str, model: Optional[str] = None) -> str:
    """生成文档摘要。"""
    if not text.strip():
        return "（内容为空）"

    truncated = _truncate_for_prompt(text)
    prompt = (
        "请为以下文本生成一份简洁的中文摘要，包括主要内容和核心观点，"
        "不超过300字：\n\n"
        f"{truncated}"
    )

    result = _call_llm(prompt, model=model)
    if result:
        return result

    # 退化：取前500字作为摘要
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    summary_lines = []
    total = 0
    for l in lines:
        if total + len(l) > 500:
            break
        summary_lines.append(l)
        total += len(l)
    return "\n".join(summary_lines) if summary_lines else text[:500]


# ---------------------------------------------------------------------------
# 思维导图（Markdown 格式）
# ---------------------------------------------------------------------------

def generate_mindmap(text: str, model: Optional[str] = None) -> str:
    """生成 Markdown 格式的思维导图结构。"""
    if not text.strip():
        return "- （内容为空）"

    truncated = _truncate_for_prompt(text)
    prompt = (
        "请将以下文本内容整理为思维导图结构，使用 Markdown 无序列表格式，"
        "层级不超过4层，使用 `- ` 缩进表示层级关系：\n\n"
        f"{truncated}"
    )

    result = _call_llm(prompt, model=model)
    if result:
        return result

    # 退化：按行提取标题式结构
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    md_lines = []
    for i, l in enumerate(lines[:30]):
        if len(l) < 50:
            md_lines.append(f"- {l}")
        else:
            md_lines.append(f"  - {l[:80]}...")
    return "\n".join(md_lines) if md_lines else f"- {text[:200]}"


# ---------------------------------------------------------------------------
# 关键信息提取
# ---------------------------------------------------------------------------

def extract_key_info(text: str, model: Optional[str] = None) -> List[str]:
    """提取文档中的关键信息条目。"""
    if not text.strip():
        return []

    truncated = _truncate_for_prompt(text)
    prompt = (
        "请从以下文本中提取5-10条关键信息，每条信息独占一行，"
        "以数字编号开头（如 1. 2. 3.），简洁明确：\n\n"
        f"{truncated}"
    )

    result = _call_llm(prompt, model=model)
    if result:
        items = []
        for line in result.splitlines():
            line = line.strip()
            if not line:
                continue
            # 去掉编号前缀
            cleaned = line.lstrip("0123456789.、）) ").strip()
            if cleaned:
                items.append(cleaned)
        return items if items else [result]

    # 退化：取前10个非空行
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return lines[:10]


# ---------------------------------------------------------------------------
# 商品信息与标签提取
# ---------------------------------------------------------------------------

def extract_product_info_and_tags(text: str, model: Optional[str] = None) -> dict:
    """提取商品详细信息及自动生成一二三级标签，返回 JSON 结构。"""
    if not text.strip():
        return {}

    truncated = _truncate_for_prompt(text, 6000)
    prompt = (
        "你是一个电商数据提取与结构化分类专家。请仔细阅读以下商品网页的抓取文本内容。\n"
        "你需要从中提取出关键信息，并自动为该商品生成合理的电商三级分类体系。\n\n"
        "请严格只返回一份合法的 JSON 数据，不要包含任何额外的描述、思考过程或 Markdown 代码块标记（如 ```json）。"
        "要求的 JSON 结构和字段如下：\n"
        "{\n"
        "  \"title\": \"商品名称/标题，简洁准确\",\n"
        "  \"price\": \"商品价格，只保留数字和小数点，如'299.00'，未找到则填空字符串\",\n"
        "  \"main_image_url\": \"商品主图的完整URL链接，未找到则填空字符串\",\n"
        "  \"actual_platform\": \"商品所属的实际电商平台，只能从以下选项中选择：taobao/tmall/jd/pdd/vip/douyin/bieyang/unknown。根据网页内容中出现的平台信息判断\",\n"
        "  \"level1_tag\": \"商品所属的一级大类行业，如'服饰鞋包'、'3C数码'、'生鲜食品'、'家居百货'等（简短）\",\n"
        "  \"level2_tag\": \"二级细分类目，如'女装'、'智能设备'、'卧室家具'等（简短）\",\n"
        "  \"level3_tag\": \"三级具体品类标签，如'风衣'、'智能手表'、'双人床'等（简短代表商品本质）\",\n"
        "  \"specs\": \"提取到的商品规格参数，请用简洁的字符串或JSON字符串表达，如'颜色：红，尺码：L'\",\n"
        "  \"other_info\": \"提取其他值得注意的商品维度的简练总结，比如卖点、发货地、材质等特色说明。以一两句短语完成。\"\n"
        "}\n\n"
        f"商品原网页内容如下：\n{truncated}"
    )

    result = _call_llm(prompt, model=model)
    if result:
        # 清理可能存在的 markdowns
        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        
        try:
            import json
            data = json.loads(cleaned.strip())
            return {
                "title": data.get("title", ""),
                "price": data.get("price", ""),
                "main_image_url": data.get("main_image_url", ""),
                "actual_platform": data.get("actual_platform", "unknown"),
                "level1_tag": data.get("level1_tag", "未分类"),
                "level2_tag": data.get("level2_tag", "未分类"),
                "level3_tag": data.get("level3_tag", "未分类"),
                "specs": data.get("specs", ""),
                "other_info": data.get("other_info", "")
            }
        except Exception as e:
            logger.warning("解析提取的商品 JSON 失败: %s. Raw: %s", e, result)

    return {}


def generate_product_intro(title: str, scraped_text: str, model: Optional[str] = None) -> str:
    """连网搜索商品名称，结合原网页正文，提炼出一份竞品评价及综合介绍(Markdown格式)。"""
    if not title:
        return "未能提取到商品标题，无法进行全网搜索。"
        
    # 1. 执行全网搜索
    from . import web_service
    search_results = web_service.web_search(title)
    
    # 将搜索结果拼接为可读文本
    search_context = ""
    if search_results and "data" in search_results:
        # 阿里云 search_results "data" 应该是一个列表
        data_list = search_results["data"] if isinstance(search_results["data"], list) else []
        for i, item in enumerate(data_list[:8]): # 取前8条
            snippet = item.get("mainText") or item.get("snippet") or item.get("title") or ""
            if snippet:
                search_context += f"【搜索片段 {i+1}】\n{snippet}\n\n"
                
    if not search_context.strip():
        search_context = "未搜索到相关的外部竞品、评价等资料。"

    # 2. 拼接截断文本与 Prompt
    truncated_scraped = _truncate_for_prompt(scraped_text, 8000)
    truncated_search = _truncate_for_prompt(search_context, 5000)
    
    prompt = (
        "你是一个深谙市场的选品分析专家。用户提供了一个商品的主页原内容记录，以及该商品在外网上的相关搜索信息资料（可能包含评测、竞品或历史评价）。\n"
        "请你出一份专业、客观、有深度的 Markdown 格式【商品调研与介绍报告】。\n\n"
        "报告需要包含如下基本模块（但不仅限于此）：\n"
        "1. **商品基本面**：总结该商品究竟是什么、核心卖点和规格结论。\n"
        "2. **全网风向与评价**：根据外部搜索资料总结人们对它的评价走势、口碑。\n"
        "3. **竞品对比分析**：搜索资料中是否提及了其竞对（或你自己基于常识推荐相近的竞品位），它的优劣势是什么。\n"
        "4. **AI 选品建议**：给消费者的购买总结。\n\n"
        f"== 目标商品当前网页抓取摘要 ==\n{truncated_scraped}\n\n"
        f"== 同步通过全网搜索取得的关联资料 ==\n{truncated_search}\n\n"
        "请忽略无关乱码和无意义的导航文本，直接输出 Markdown 报告文本，不要有多余的话外音。"
    )
    
    result = _call_llm(prompt, model=model)
    return result.strip() if result else "无法生成商品介绍。"

# ---------------------------------------------------------------------------
# 语音转写 (ASR)
# ---------------------------------------------------------------------------

async def transcribe_audio(audio_path: str) -> Optional[str]:
    """使用 DashScope ASR 模型转写语音。"""
    if not settings.maas_api_key or settings.maas_provider != "dashscope":
        return None

    try:
        import dashscope
        from dashscope.audio.asr import Recognition

        dashscope.api_key = settings.maas_api_key

        recognition = Recognition(
            model="paraformer-realtime-v2",
            format="mp3",
            sample_rate=16000,
            callback=None,
        )

        result = recognition.call(audio_path)
        if result.output and result.output.get("sentence"):
            sentences = result.output["sentence"]
            return " ".join([s.get("text", "") for s in sentences])
        return None

    except Exception as e:
        logger.warning("ASR 转写失败: %s", e)
        return None
