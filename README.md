# GOATSim-Shooting 模拟器 for Rebuilt

FRC 2026 Rebuilt 射球可视化工具，基于物理模型模拟动态射球补偿。

## 功能

- 3D 场景可视化
- 实时弹道轨迹
- 动态补偿算法 (shoot-on-move)
- 可调机构参数：发射高度、Hood 角度范围、入射角、飞轮速度

## 使用

在线访问：https://team-6907.github.io/u2026_Shooting_Visualizer/

### 本地开发（Vite）

本项目使用 Vite 进行构建与开发。首次运行需要安装依赖。

```bash
npm install
npm run dev
```

浏览器访问：`http://localhost:5173`

#### 构建与预览

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`，用于 GitHub Pages 部署。

> GitHub Pages 部署需要正确设置 `vite.config.js` 的 `base` 为仓库名路径。

## 控制

- `WASD` - 移动机器人
- `Space` - 停止
- 鼠标拖拽 - 旋转视角
- 滚轮 - 缩放
