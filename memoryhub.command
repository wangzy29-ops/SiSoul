#!/bin/bash
cd /Users/wangziyu/Documents/Qoder/memoryhub/backend
export DASHSCOPE_API_KEY="sk-c2bdc70e397d471289dbacd9a4c583b5"
/usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8899
