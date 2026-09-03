# js_tunneli_game_threejs

## Play it now: https://pemmyz.github.io/js_tunneli_game_threejs/

# Retro Demoscene 3D Tunnel – Spaceship Dodge

A browser-based retro demoscene-inspired 3D tunnel dodge game built with **HTML, CSS, JavaScript, and Three.js**.

The game combines a wireframe tunnel, floating obstacles, speed particles, CRT effects, neon palettes, keyboard controls, mouse/touch joystick controls, and an automatic demo mode.

## Features

- 🌀 Procedurally animated 3D tunnel
- 🚀 Wireframe spaceship controlled by the player
- 💥 Collision detection with tunnel walls and obstacle cubes
- ❤️ Health / shield system
- 🎯 Score system
- ⚡ Hyperdrive speed mode
- 🕹️ Floating virtual analog joystick
- 📱 Fullscreen / touch mode
- 🎮 Optional fixed D-pad touch controls
- ⌨️ Keyboard controls
- 🖥️ Collapsible retro-style HUD
- 📺 CRT scanline and vignette effects
- 🌈 Multiple visual palettes
- 🚗 Two engine-speed profiles
- 🟢 Easy and Hard difficulty modes
- 🤖 Automatic demo/autopilot mode after inactivity
- 📷 Adjustable camera field of view
- 📐 Adjustable spaceship depth
- 📊 Live FPS and speed display

## Requirements

A modern web browser with WebGL support is required.

The project uses Three.js from the CDN:

```html
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```

No build system, package manager, or server-side code is required.

## Project Structure

```text
project/
├── index.html
├── style.css
├── script.js
└── README.md
```

### `index.html`

Contains the game page structure, HUD, overlays, touch controls, and Three.js CDN reference.

### `style.css`

Contains the complete visual styling, including:

- Neon retro color scheme
- CRT scanlines
- Screen vignette
- HUD
- Demo-mode overlay
- Crash screen
- Virtual joystick
- Mobile D-pad
- Animations
- Fullscreen/mobile layout

### `script.js`

Contains the game engine and gameplay logic, including:

- Three.js scene initialization
- Tunnel generation
- Tunnel movement
- Spaceship rendering
- Obstacle generation
- Speed particles
- Collision detection
- Health and scoring
- Input handling
- Demo mode
- Fullscreen handling
- HUD controls
- Palettes and speed profiles

## Running the Game

Because this is a client-side web project, it can usually be started simply by opening:

```text
index.html
```

in a modern browser.

For local development, you can also use a simple HTTP server.

For example, with Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

### Keyboard

| Key | Action |
|---|---|
| `W` / `↑` | Move up |
| `A` / `←` | Move left |
| `S` / `↓` | Move down |
| `D` / `→` | Move right |
| `SPACE` | Hyperdrive |
| `T` | Toggle engine speed style |
| `J` | Toggle joystick / D-pad |
| `E` | Toggle Easy / Hard difficulty |
| `P` | Pause / resume |
| `C` | Change visual palette |
| `H` | Toggle HUD |
| `R` | Restart after crash |

### Mouse / Touch

The default input mode is a **floating virtual analog joystick**.

Click/touch the game area and drag in the direction you want the spaceship to move.

The joystick appears at the location where the pointer/touch starts.

### D-Pad Mode

Press `J`, or select:

```text
FIXED DPAD BUTTONS (OLD STYLE)
```

from the HUD.

The four on-screen buttons control:

- ◀ Left
- ▶ Right
- ▲ Up
- ▼ Down

## Game Modes

### Demo Mode

The game starts in Demo Mode.

The spaceship automatically flies through the tunnel using an autopilot maneuver.

Demo Mode is also activated after **7 seconds of inactivity**.

While in Demo Mode:

- The ship is controlled automatically.
- The player cannot take collision damage.
- Score does not increase.
- The demo overlay is displayed.
- A countdown is shown when the game is in active player mode.

Any keyboard, mouse, or touch activity exits Demo Mode.

## Difficulty

### Easy

Easy mode is the default.

- Player and obstacles are scaled to 60%.
- Collisions reduce health.
- Each hit removes 25 health.
- Temporary invulnerability is provided after a hit.
- Score is reduced by 150 points after a collision.
- The game ends when health reaches zero.

### Hard

Hard mode provides a much less forgiving experience.

A collision immediately sets health to zero and causes a crash.

Toggle difficulty with:

```text
E
```

or through the HUD.

## Speed Styles

The game includes two engine-speed profiles.

### Retro Classic

```text
Normal speed: 550
Hyperdrive:   1375
Steering:     210
```

### Worms (New)

```text
Normal speed: 180
Hyperdrive:   550
Steering:     175
```

Switch between them with:

```text
T
```

or the HUD selector.

## Visual Palettes

Press `C` to cycle through the available palettes.

### NEON CYBER

The default palette, using bright cyan, pink, and neon tones.

### AMIGA RAINBOW

Uses dynamic rainbow hue cycling.

### SYNTH WAVE

Uses a synthwave-inspired palette.

### C64 MATRIX

Uses a darker Commodore 64-inspired palette.

### RETRO AMBER

Uses warm amber/orange tones.

## HUD

The collapsible HUD displays:

- Current visual style
- Input control mode
- Difficulty
- Game status
- Shield / HP
- Score
- FPS
- Speed
- Current palette

It also provides controls for:

- Input mode
- Engine speed style
- Camera FOV
- Ship depth

The HUD can be collapsed using its arrow button or:

```text
H
```

## Camera Settings

### Camera FOV

The field of view can be adjusted from:

```text
45° – 125°
```

The default value is:

```text
85°
```

A higher FOV produces a wider view of the tunnel.

### Ship Depth

The spaceship depth can be adjusted from:

```text
30 – 500
```

The default value is:

```text
250
```

## Technical Details

The game uses **Three.js r128** and renders the scene using WebGL.

### Tunnel

The tunnel consists of:

- 50 polygonal rings
- 24 segments per ring
- Procedurally calculated tunnel-center movement
- Pulsating ring radius
- Individual ring rotation
- Depth-based opacity/fog effect

Main tunnel configuration:

```javascript
maxDepth: 2200
minDepth: 10
ringCount: 50
ringSegments: 24
ringRadius: 260
```

### Obstacles

The tunnel contains:

```text
35 floating wireframe cubes
```

Each cube:

- Has a randomized size
- Rotates around all three axes
- Moves toward the camera
- Is recycled after passing the player
- Is positioned within the tunnel
- Uses depth-based fading

### Speed Particles

The game contains:

```text
250
```

speed particles.

Each particle is rendered as a line segment to create the impression of fast movement through the tunnel.

## Tunnel Movement

The tunnel center is generated procedurally using combinations of sine and cosine waves.

This produces continuously changing horizontal and vertical movement rather than a straight tunnel.

The spaceship follows the moving tunnel center while its own offset is controlled by the player.

## Collision System

The game checks two primary collision types.

### Tunnel Wall

The player's distance from the tunnel center is compared with the current tunnel radius.

If the ship moves outside the available tunnel area, it receives damage.

### Obstacle Cube

The game compares:

1. Difference in Z depth
2. World-space distance between the ship and cube

If the distance is below the collision threshold, the ship takes damage.

## Damage System

In Easy Mode:

```text
25 HP damage
150 point score penalty
1.2 second invulnerability
```

The screen briefly flashes red when damage is received.

During invulnerability, the spaceship flashes on and off.

In Hard Mode, a collision immediately causes a crash.

## Scoring

While actively playing:

```text
score += dt * (speed / 10)
```

Score does not increase while:

- In Demo Mode
- Crashed
- Paused

## Crash / Restart

When the player's health reaches zero, the game displays:

```text
SYSTEM CRASH!
SHIP DESTROYED
```

The final score is shown.

Restart with:

```text
R
```

or press the restart button.

Restarting resets:

- Score
- Health
- Ship position
- Invulnerability
- Crash state
- Pause state
- Obstacles

## Fullscreen / Touch Mode

The button in the upper-left corner toggles browser fullscreen mode.

When fullscreen is active:

```text
✖ EXIT FULLSCREEN
```

is displayed.

The interface adjusts the virtual joystick for fullscreen/mobile use.

## Browser Compatibility

The project relies on standard browser APIs including:

- WebGL
- Pointer Events
- Touch Events
- Fullscreen API
- `requestAnimationFrame`
- CSS gradients and backdrop filters

A current version of Chrome, Firefox, Edge, Safari, or another WebGL-capable browser is recommended.

## Customization

Most gameplay parameters can be modified near the beginning of `script.js`.

For example:

```javascript
const CONFIG = {
    maxDepth: 2200,
    minDepth: 10,
    ringCount: 50,
    cubeCount: 35,
    starCount: 250,
    ringSegments: 24,
    ringRadius: 260
};
```

Changing these values allows you to experiment with:

- Tunnel length
- Number of rings
- Number of obstacles
- Particle density
- Tunnel size
- Polygon complexity

Speed profiles can also be modified in:

```javascript
const SPEED_STYLES = {
    classic: {
        normalSpeed: 550,
        hyperSpeed: 1375,
        steerSpeed: 210
    },
    worms: {
        normalSpeed: 180,
        hyperSpeed: 550,
        steerSpeed: 175
    }
};
```

## Credits / Technology

Built with:

- HTML5
- CSS3
- JavaScript
- Three.js r128
- WebGL

The visual direction is inspired by classic **retro demoscene**, wireframe graphics, CRT displays, neon arcade games, and early 3D computer graphics.

---

## License

MIT License – free to use, modify, and redistribute.

---
