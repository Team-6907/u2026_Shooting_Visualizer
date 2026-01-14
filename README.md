# FRC 动态射球可视化

FRC 2026 Shoot-on-Move 可视化工具，基于物理模型模拟动态射球补偿。

## 功能

- 3D 场景可视化
- 实时弹道轨迹
- 动态补偿算法 (shoot-on-move)
- 可调机构参数：发射高度、Hood 角度范围、入射角、飞轮速度

## 使用

在线访问：https://team-6907.github.io/u2026_Shooting_Visualizer/

### 本地部署

由于项目使用了 ES6 模块和相对路径导入，需要通过 HTTP 服务器运行，不能直接打开 `index.html` 文件。

#### 使用 Python HTTP 服务器

1. 在项目根目录打开终端
2. 运行以下命令启动本地服务器：

```bash
python3 -m http.server 5173
```

3. 在浏览器中访问：`http://localhost:5173`

## 控制

- `WASD` - 移动机器人
- `Space` - 停止
- 鼠标拖拽 - 旋转视角
- 滚轮 - 缩放
