# GOATSim Shooting Simulator for REBUILT

[![Chief Delphi Thread](https://img.shields.io/badge/Chief%20Delphi-Thread-0b7285?logo=discourse&logoColor=white)](https://www.chiefdelphi.com/t/goatsim-interactive-shoot-on-move-solver-and-fuel-collision-demo/511490)

GOATSim shooting simulator for the FRC 2026 Season, REBUILT, with physics-based shoot-on-move simulation.

[中文版本](README.zh.md)

- Live demo: https://team-6907.github.io/u2026_Shooting_Visualizer/

<table>
  <tr>
    <td><img src="assets/shoot_on_the_move.gif" width="430" alt="Shoot on the move" /></td>
    <td><img src="assets/interaction.gif" width="360" alt="Interaction demo" /></td>
  </tr>
</table>

### Features

- 3D field visualization
- Physics-based solver with drag + gravity (ballistics)
- Shoot-on-move compensation using robot velocity + virtual target
- Live trajectory/impact prediction and target validation
- Rapier physics engine integration for ball flight
- Distance-based shot dispersion
- Tunable mechanism parameters, including Target point (m) sliders for impact target

### Quick start (local)

```bash
git clone https://github.com/Team-6907/u2026_Shooting_Visualizer.git
cd u2026_Shooting_Visualizer
npm install
```

Dev server:

```bash
npm run dev
```

Open: `http://localhost:5173`

Build + preview (optional):

```bash
npm run build
npm run preview
```

### Controls

- `WASD` - move robot
- `Space` - stop
- Mouse drag - orbit camera
- Scroll wheel - zoom

### Acknowledgements

- 3D models from Team 6328's AdvantageScope: https://docs.advantagescope.org/
