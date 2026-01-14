# GOATSim-Shooting (Rebuilt)

面向 FRC 2026 Rebuilt 的射球可视化工具，用物理模型模拟动态射球补偿。

[English Version](README.md)

- 在线体验: https://team-6907.github.io/u2026_Shooting_Visualizer/

<table>
  <tr>
    <td><img src="assets/shoot_on_the_move.gif" width="430" alt="Shoot on the move" /></td>
    <td><img src="assets/interaction.gif" width="360" alt="Interaction demo" /></td>
  </tr>
</table>

### 功能

- 3D 场景可视化
- 实时弹道轨迹与落点
- 动态补偿 (shoot-on-move)
- 可调机构参数

### 快速开始

```bash
npm install
npm run dev
```

浏览器打开: `http://localhost:5173`

```bash
npm run build
npm run preview
```

### 控制

- `WASD` - 移动机器人
- `Space` - 停止
- 鼠标拖拽 - 旋转视角
- 滚轮 - 缩放

### 致谢

- 3D 模型来自 Team 6328 的 AdvantageScope: https://docs.advantagescope.org/
