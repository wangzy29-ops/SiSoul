import logging
import os
from typing import Dict, Any, List

import httpx

logger = logging.getLogger(__name__)

# 从环境变量中获取，如果未配置则使用默认值
ALIYUN_IQS_API_KEY = os.getenv("ALIYUN_IQS_API_KEY", "j-ejlJpgGvq33yM_6UlSSZG10ZgY6wA2OTY0ZWI0ZA")


def web_search(query: str, top_k: int = 5) -> Dict[str, Any]:
    """
    调用阿里云搜索 API 进行联网搜索。
    
    Args:
        query: 搜索关键词
        top_k: 无特定作用于该底层API，但保留接口供将来扩展
        
    Returns:
        包含搜索结果的字典
    """
    url = "https://cloud-iqs.aliyuncs.com/search/unified"
    headers = {
        "Authorization": f"Bearer {ALIYUN_IQS_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "query": query,
        "engineType": "Generic",
        "contents": {
            "mainText": True,
            "markdownText": False,
            "summary": False,
            "rerankScore": True
        }
    }

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"联网搜索调用失败: {e}")
        return {}


def scrape_page(url: str, max_age: int = 0, stealth: bool = False) -> str:
    """
    调用阿里云网页解析 API，获取高质量的网页内容。
    
    Args:
        url: 目标网页URL
        max_age: 缓存时间
        stealth: 是否开启 stealthMode 以绕过反爬虫
        
    Returns:
        获取到的文本内容
    """
    api_url = "https://cloud-iqs.aliyuncs.com/readpage/scrape"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": ALIYUN_IQS_API_KEY
    }
    payload = {
        "url": url,
        "maxAge": max_age,
        "formats": ["html", "markdown", "text"],
        "timeout": 120000,
        "pageTimeout": 30000,
    }
    if stealth:
        payload["stealthMode"] = 1

    try:
        with httpx.Client(timeout=90) as client:
            resp = client.post(api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            # 从返回结果中提取 markdownText 或者 mainText
            if data and "data" in data:
                page_data = data["data"]
                return page_data.get("markdownText") or page_data.get("mainText") or page_data.get("text") or ""
            return ""
            
    except Exception as e:
        logger.error(f"网页智能解析失败 ({url}): {e}")
        return ""


def scrape_via_search(query: str, target_url: str = "") -> str:
    """
    通过搜索 API 获取目标页面的缓存内容作为抓取失败时的回退方案。
    
    Args:
        query: 搜索关键词（通常为商品标题或URL）
        target_url: 目标URL，用于在搜索结果中优先匹配
        
    Returns:
        拼接后的搜索结果文本
    """
    results = web_search(query)
    if not results:
        return ""
    
    # 搜索结果在 pageItems 字段中
    data_list = results.get("pageItems") or results.get("data") or []
    if not isinstance(data_list, list) or not data_list:
        return ""
    
    # 优先返回与目标URL匹配的结果
    collected = []
    for item in data_list[:10]:
        item_url = item.get("link") or item.get("url") or ""
        main_text = item.get("mainText") or item.get("snippet") or ""
        title = item.get("title") or ""
        if not main_text:
            continue
        # 匹配目标URL的结果放在最前面
        entry = f"【{title}】\n{main_text}"
        if target_url and target_url.split("?")[0].rstrip("/") in item_url:
            collected.insert(0, entry)
        else:
            collected.append(entry)
    
    return "\n\n".join(collected[:5])


def scrape_smzdm_via_baidu(article_id: str, original_url: str = "") -> str:
    """
    通过 IQS 抓取百度搜索结果页面来获取 smzdm 商品信息。
    当直接抓取 smzdm 被反爬拦截时的终极回退方案。
    
    Args:
        article_id: smzdm 文章 ID（如 169062213）
        original_url: 原始 smzdm URL
        
    Returns:
        百度搜索结果中的商品描述文本
    """
    import urllib.parse
    baidu_query = f"site:smzdm.com {article_id}"
    baidu_url = f"https://www.baidu.com/s?wd={urllib.parse.quote(baidu_query)}&rn=5"
    
    logger.info("通过百度搜索回退抓取 smzdm 内容: %s", baidu_query)
    
    # 用 IQS scrape API 抓取百度搜索结果页
    content = scrape_page(baidu_url, stealth=True)
    if not content or len(content) < 200:
        content = scrape_page(baidu_url)
    
    if not content:
        return ""
    
    # 清理百度搜索页面中的无关内容，只保留搜索结果部分
    # 去掉热搜榜等干扰内容
    lines = content.split("\n")
    useful_lines = []
    skip_section = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # 跳过热搜榜区域
        if "热搜榜" in stripped or "换一换" in stripped:
            skip_section = True
            continue
        if skip_section and (stripped.startswith("###") or "什么值得买" in stripped):
            skip_section = False
        if skip_section:
            continue
        # 跳过无关的页面元素
        if any(kw in stripped for kw in [
            "百度一下", "百度首页", "登录", "设置", "开放平台",
            "帮助举报", "用户反馈", "企业推广", "退出", "朗读音色",
            "抗击肺炎", "图片搜索", "输入法", "文心助手",
            "hao123", "快捷输入", "百度信誉", "官网认证",
            "搜索工具", "时间不限", "所有网页", "百度为您找到",
            "百度开放计划", "框计算", "您确定要退出",
            "手写", "拼音", "关闭", "深度合作", "去AI搜索",
            "成熟女声", "成熟男声", "磁性男声", "年轻女声", "情感男声",
            "支持多选", "交替朗读", "00:00",
        ]):
            continue
        # 跳过纯 site: 搜索词行
        if stripped.startswith("site:"):
            continue
        if stripped:
            useful_lines.append(stripped)
    
    result = "\n".join(useful_lines)
    return result if len(result) > 50 else ""
