#!/bin/bash
cd /Users/wangziyu/Documents/Qoder/memoryhub/backend
# DASHSCOPE_API_KEY 使用 config.py 中的默认值（sk-sp-...）
/usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8899
