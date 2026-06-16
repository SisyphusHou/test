# 五子棋 — 架构设计文档

版本: 1.0 | 日期: 2026-06-16

## 1. 架构概览

五子棋采用单文件 HTML 架构（已拆分为 HTML/CSS/JS 三文件），IIFE 模式封装。内部分为 6 个逻辑模块：配置常量、状态管理、渲染引擎、游戏逻辑、AI 引擎、UI 控制。

## 2. 数据流

```
用户输入 → placeStone() → board[][] (唯一真相源) → checkWin()/drawBoard()/updateUI()
                                     ↓ (PVC 模式)
                              scheduleAIMove() → getBestMove() → minimax()
```

## 3. 设计模式

| 模式 | 应用 |
|------|------|
| IIFE | 全局作用域隔离 |
| 状态机 | gameOver / aiThinking 标志位 |
| 策略模式 | DIFFICULTY 配置对象 |
| 命令模式 | moveHistory 栈 + undo() |
| 观察者模式 | addEventListener 事件绑定 |

## 4. 架构优缺点

**优点**: 零依赖部署、AI 设计实用 (AB剪枝+邻域过滤)、交互打磨到位
**缺点**: 全局可变状态、同步 AI 阻塞主线程、评估函数无增量计算、无置换表

## 5. 重构路线

- **短期**: var→const/let、抽取重复排序逻辑、魔法数字命名
- **中期**: ES6 模块拆分、AI 移入 Web Worker、增量评估
- **长期**: GameState 类、TypeScript、单元测试、i18n
