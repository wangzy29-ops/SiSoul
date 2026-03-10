import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 将 Markdown 无序列表解析为树形数据。
 * 输入格式示例:
 *   - 根节点
 *     - 子节点1
 *       - 子子节点
 *     - 子节点2
 */
function parseMdToTree(md) {
    if (!md) return null;
    const lines = md.split('\n').filter(l => l.trim());
    const root = { text: '主题', children: [], _depth: -1 };
    const stack = [root];

    for (const line of lines) {
        const match = line.match(/^(\s*)[-*+]\s+(.+)/);
        if (!match) continue;

        const indent = match[1].length;
        const text = match[2].replace(/\*\*/g, '').trim();
        const depth = Math.floor(indent / 2);
        const node = { text, children: [], _depth: depth };

        // 找到合适的父节点
        while (stack.length > 1 && stack[stack.length - 1]._depth >= depth) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    }

    // 如果只有一个顶级子节点，提升为根
    if (root.children.length === 1) {
        return root.children[0];
    }
    if (root.children.length === 0) {
        return { text: md.slice(0, 50), children: [] };
    }
    return root;
}

// 节点颜色方案
const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#f97316', '#14b8a6',
];

function getColor(depth, index) {
    if (depth === 0) return '#6366f1';
    return COLORS[(index + depth) % COLORS.length];
}

// 布局计算
function layoutTree(node, x = 0, y = 0, depth = 0, index = 0) {
    const NODE_H = 36;
    const NODE_GAP_V = 12;
    const NODE_GAP_H = 180;

    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = depth === 0 ? 'bold 15px Inter, sans-serif' : '13px Inter, sans-serif';
    const textW = ctx.measureText(node.text).width;
    const nodeW = Math.min(Math.max(textW + 28, 80), 260);

    const layout = {
        text: node.text,
        x, y,
        w: nodeW,
        h: NODE_H,
        depth,
        color: getColor(depth, index),
        children: [],
    };

    if (node.children.length > 0) {
        const childX = x + nodeW + NODE_GAP_H;
        let totalH = 0;
        const childLayouts = [];

        // 先递归计算子树高度
        for (let i = 0; i < node.children.length; i++) {
            const child = layoutTree(node.children[i], childX, 0, depth + 1, i);
            const childH = getSubtreeHeight(child, NODE_H, NODE_GAP_V);
            childLayouts.push({ layout: child, height: childH });
            totalH += childH;
            if (i < node.children.length - 1) totalH += NODE_GAP_V;
        }

        // 垂直居中分布
        let curY = y - totalH / 2 + NODE_H / 2;
        for (const { layout: cl, height: ch } of childLayouts) {
            const offset = curY + ch / 2 - NODE_H / 2 - cl.y;
            offsetTree(cl, 0, offset);
            layout.children.push(cl);
            curY += ch + NODE_GAP_V;
        }
    }

    return layout;
}

function getSubtreeHeight(node, nodeH, gap) {
    if (node.children.length === 0) return nodeH;
    let total = 0;
    for (let i = 0; i < node.children.length; i++) {
        total += getSubtreeHeight(node.children[i], nodeH, gap);
        if (i < node.children.length - 1) total += gap;
    }
    return Math.max(nodeH, total);
}

function offsetTree(node, dx, dy) {
    node.x += dx;
    node.y += dy;
    for (const child of node.children) {
        offsetTree(child, dx, dy);
    }
}

// 获取整棵树的边界
function getTreeBounds(node) {
    let minX = node.x, maxX = node.x + node.w;
    let minY = node.y, maxY = node.y + node.h;
    for (const c of node.children) {
        const b = getTreeBounds(c);
        minX = Math.min(minX, b.minX);
        maxX = Math.max(maxX, b.maxX);
        minY = Math.min(minY, b.minY);
        maxY = Math.max(maxY, b.maxY);
    }
    return { minX, maxX, minY, maxY };
}

export default function MindmapCanvas({ markdown }) {
    const canvasRef = useRef(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [tree, setTree] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const wrapperRef = useRef(null);

    // 监听包裹层的实际渲染大小
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const updateSize = (width, height) => {
            if (width > 0 && height > 0) {
                setContainerSize({ w: width, h: height });
            }
        };

        // 立即获取一次尺寸
        const rect = wrapper.getBoundingClientRect();
        updateSize(rect.width, rect.height);

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                updateSize(width, height);
            }
        });

        observer.observe(wrapper);
        return () => observer.disconnect();
    }, []);

    // 解析 markdown → 树 → 布局
    useEffect(() => {
        const parsed = parseMdToTree(markdown);
        if (!parsed) return;
        const laid = layoutTree(parsed, 0, 300, 0, 0);
        setTree(laid);
        setInitialized(false); // markdown 变化时重新初始化
    }, [markdown]);

    // 初始化居中：计算缩放使思维导图内容占画布的 70%
    useEffect(() => {
        if (!tree || initialized || containerSize.w === 0) return;
        
        const bounds = getTreeBounds(tree);
        const treeW = bounds.maxX - bounds.minX;
        const treeH = bounds.maxY - bounds.minY;
        const padding = 60;

        // 计算使思维导图占画布 70% 的缩放比例
        const availableW = containerSize.w - padding * 2;
        const availableH = containerSize.h - padding * 2;
        
        // 防止除零
        if (treeW <= 0 || treeH <= 0 || availableW <= 0 || availableH <= 0) return;
        
        const scaleX = availableW / treeW;
        const scaleY = availableH / treeH;
        // 取较小值确保完整显示，再乘以 0.7 使内容占画布 70%
        const fitScale = Math.min(scaleX, scaleY) * 0.7;
        // 限制缩放范围
        const fixedScale = Math.max(0.3, Math.min(2, fitScale));

        setScale(fixedScale);
        // 居中显示
        setPan({
            x: padding - bounds.minX * fixedScale + (containerSize.w - padding * 2 - treeW * fixedScale) / 2,
            y: padding - bounds.minY * fixedScale + (containerSize.h - padding * 2 - treeH * fixedScale) / 2,
        });
        setInitialized(true);
    }, [tree, initialized, containerSize]);

    // 绘制
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !tree || containerSize.w === 0) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const w = containerSize.w;
        const h = containerSize.h;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 清背景
        ctx.fillStyle = '#f8f9fb';
        ctx.fillRect(0, 0, w, h);

        // 网格点
        ctx.fillStyle = '#e2e4e9';
        const gridSize = 24 * scale;
        const offX = pan.x % gridSize;
        const offY = pan.y % gridSize;
        for (let gx = offX; gx < w; gx += gridSize) {
            for (let gy = offY; gy < h; gy += gridSize) {
                ctx.beginPath();
                ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(scale, scale);

        drawNode(ctx, tree);

        ctx.restore();
    }, [tree, pan, scale, containerSize]);

    useEffect(() => {
        const id = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(id);
    }, [draw]);

    // 拖拽
    const onMouseDown = (e) => {
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    };
    const onMouseMove = (e) => {
        if (!dragging) return;
        setPan({
            x: dragStart.current.panX + (e.clientX - dragStart.current.x),
            y: dragStart.current.panY + (e.clientY - dragStart.current.y),
        });
    };
    const onMouseUp = () => setDragging(false);

    // 缩放
    const onWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.max(0.2, Math.min(3, s * delta)));
    };

    // 重置视图
    const resetView = () => setInitialized(false);

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'relative',
                width: '100%',
                height: 'calc(100vh - 280px)',
                minHeight: '500px',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid var(--color-border-light, #e5e7eb)'
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ cursor: dragging ? 'grabbing' : 'grab', display: 'block', width: '100%', height: '100%' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
            />
            {/* 控制按钮 */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 6 }}>
                <button onClick={() => setScale(s => Math.min(3, s * 1.2))} style={ctrlBtnStyle} title="放大">＋</button>
                <button onClick={() => setScale(s => Math.max(0.2, s * 0.8))} style={ctrlBtnStyle} title="缩小">－</button>
                <button onClick={resetView} style={ctrlBtnStyle} title="重置视图">⊙</button>
            </div>
            <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 11, color: '#999', userSelect: 'none' }}>
                {Math.round(scale * 100)}% · 拖拽移动 · 滚轮缩放
            </div>
        </div>
    );
}

const ctrlBtnStyle = {
    width: 32, height: 32, borderRadius: 2,
    border: '1px solid #ddd', background: 'rgba(255,255,255,0.9)',
    cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

function drawNode(ctx, node) {
    // 先画连线
    for (const child of node.children) {
        drawConnection(ctx, node, child);
    }

    // 画节点
    const r = node.depth === 0 ? 10 : 8;
    ctx.fillStyle = node.color + '18';
    ctx.strokeStyle = node.color + '60';
    ctx.lineWidth = 1.5;
    roundRect(ctx, node.x, node.y, node.w, node.h, r);
    ctx.fill();
    ctx.stroke();

    // 左侧色条
    if (node.depth > 0) {
        ctx.fillStyle = node.color;
        roundRect(ctx, node.x, node.y, 4, node.h, r / 2);
        ctx.fill();
    }

    // 文字
    ctx.fillStyle = node.depth === 0 ? '#fff' : '#333';
    if (node.depth === 0) {
        ctx.fillStyle = node.color;
        roundRect(ctx, node.x, node.y, node.w, node.h, r);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.fillStyle = '#fff';
    }
    ctx.font = node.depth === 0 ? 'bold 15px Inter, system-ui, sans-serif' : '13px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const textX = node.x + (node.depth > 0 ? 12 : 14);
    const maxTextW = node.w - (node.depth > 0 ? 20 : 28);
    let displayText = node.text;
    while (ctx.measureText(displayText).width > maxTextW && displayText.length > 3) {
        displayText = displayText.slice(0, -2) + '…';
    }
    ctx.fillText(displayText, textX, node.y + node.h / 2 + 1);

    // 递归子节点
    for (const child of node.children) {
        drawNode(ctx, child);
    }
}

function drawConnection(ctx, parent, child) {
    const startX = parent.x + parent.w;
    const startY = parent.y + parent.h / 2;
    const endX = child.x;
    const endY = child.y + child.h / 2;
    const midX = (startX + endX) / 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
    ctx.strokeStyle = child.color + '50';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
