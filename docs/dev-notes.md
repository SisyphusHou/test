# 开发笔记 — 五子棋功能增强

## 日期
2026-06-16

## 文件变更概览

| 操作 | 文件 | 说明 |
|------|------|------|
| 拆分 | css/gomoku.css | 从 gomoku.html 的 <style> 提取，新增历史面板/平局弹窗/坐标相关样式 |
| 拆分 | js/gomoku.js | 从 gomoku.html 的 <script> 提取，新增 DPI/坐标/历史/平局 四项增强 |
| 修改 | gomoku.html | 移除内联 style/script，改用 link/script src 引入外部文件；新增 game-layout / history-panel DOM 结构 |
| 新建 | docs/dev-notes.md | 本文件 |

## 模块化拆分

**决策**: 将单文件 25910 字节的 gomoku.html 拆分为三个文件，分离关注点。

- CSS: 5036 字节原始样式 + 约 1800 字节新增样式 => 6847 字节
- JS: 18546 字节原始脚本 + 约 1700 字节新增逻辑 => 20278 字节
- HTML: 约 2100 字节原始 DOM + 约 500 字节新增结构 => 2615 字节

拆分原则：保持原始功能完全不变，只是在结构上做模块化抽离。CSS 和 JS 文件通过 link 和 script src 引入，IIFE 作用域隔离保持不变。

## 增强1: Canvas 高 DPI 渲染

**问题**: 在高 DPI 屏幕（Retina, 2x/3x 缩放）上，Canvas 绘制的棋盘线条和棋子边缘模糊。

**方案**: 使用 window.devicePixelRatio 缩放 Canvas 缓冲区。

    var dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = CANVAS_SIZE + "px";
    canvas.style.height = CANVAS_SIZE + "px";
    ctx.scale(dpr, dpr);

- Canvas 内部缓冲区按 dpr 倍数放大（CSS 尺寸不变）
- ctx.scale(dpr, dpr) 使所有绘制坐标保持逻辑像素不变
- getBoundingClientRect() 返回 CSS 像素，鼠标交集计算 scaleX = CANVAS_SIZE / rect.width 恒为 1，坐标映射不受影响

## 增强2: 棋盘坐标标注

**实现**: 在 drawBoard() 中，星标绘制之后、棋子绘制之前，添加坐标文字。

- 列标注 A-O: 棋盘底部，y = CANVAS_SIZE - MARGIN + 6（MARGIN=32 内），居中对齐
- 行标注 1-15: 棋盘左侧，x = MARGIN - 8，右对齐

字体: bold 10px sans-serif，颜色 rgba(0,0,0,0.45)。在现有 MARGIN（32px）内绘制，无需扩展现有棋盘尺寸。行列标注通过 String.fromCharCode(65 + i) 和 String(i + 1) 生成。

## 增强3: 走棋历史面板

**DOM 结构**: 在 board-wrapper 外新增 .game-layout 弹性容器，包含 .board-section（棋盘区域）和 .history-panel（历史侧栏）。

**面板内容**: 每条记录包含序号、棋子色标（CSS 渐变模拟黑白子）、棋盘坐标（如 H8）。

**更新时机**: 在 placeStone()、scheduleAIMove()、undo()、initBoard() 中调用 updateHistory()，DOM 重建后自动滚动到底部。

**响应式**: 屏幕宽度 <= 850px 时，.game-layout 切换为纵向排列，历史面板变为水平滚动布局。

## 增强4: 平局自动弹窗

**改动**: 复用现有的 .win-overlay / .win-card 弹窗机制。

- 新增 showDrawOverlay() 函数，设置 winStone 为 .draw-stone（CSS conic-gradient 实现半黑半白效果），显示"平局!"文字
- placeStone() 和 scheduleAIMove() 中的 isDraw() 分支：将原来的 turnText.textContent = "平局!" 替换为 showDrawOverlay() 调用
- 点击"再来一局"按钮（resetGame）关闭弹窗，与新游戏逻辑一致

## 兼容性修复

**Win overlay stone 渐变**: 原始代码中 showWinOverlay 使用 winStone.className = "win-stone black-stone"，但原始 CSS 中 .black-stone 选择器写为 .turn-stone.black-stone（需同时具有 .turn-stone 类），导致胜利弹窗中棋子无渐变背景。在拆分后的 CSS 中新增 .win-stone.black-stone 和 .win-stone.white-stone 选择器解决此问题。

## 未涉及的增强

- Web Audio API 落子音效: 未实现。选择的其他 4 项增强已覆盖核心需求。
- 走棋历史点击跳转: 未实现。面板为只读展示，不添加交互功能。

## 现有功能确认

所有原有功能保持不变：
- 15x15 棋盘渲染（Canvas 木纹背景、星标点、棋子渐变/阴影）
- 人人对战 / 人机对战模式切换
- 三档 AI 难度（简单/一般/困难），Minimax + Alpha-Beta 剪枝
- 悔棋（按钮 + Ctrl+Z 快捷键）
- 计分（跨局累计）
- 触摸支持（移动端）
- 最后落子标记（红色圆点）
- 悬停预览（半透明棋子）
- 胜利/平局弹窗