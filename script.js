/**
 * RETRO DEMOSCENE 3D TUNNEL ENGINE - DODGE GAME
 */

// Configuration & Global Settings
const CONFIG = {
    maxDepth: 2200,          // Distance far plane
    minDepth: 10,            // Distance near camera recycle plane
    ringCount: 50,           // Number of tunnel rings
    cubeCount: 35,           // Floating wireframe cubes
    starCount: 250,          // Speed lines/dust particles
    ringSegments: 24,        // Vertices per ring polygon
    ringRadius: 260          // Base tunnel ring radius
};

// Speed Style Profiles (Retro Classic is default; Worms is the new style option)
const SPEED_STYLES = {
    classic: {
        id: "classic",
        displayName: "RETRO CLASSIC",
        normalSpeed: 550,    // Default base speed
        hyperSpeed: 1375,    // Classic hyper speed (550 * 2.5)
        steerSpeed: 210
    },
    worms: {
        id: "worms",
        displayName: "WORMS (NEW)",
        normalSpeed: 180,    // Worms relaxed cruising speed
        hyperSpeed: 550,     // Worms hyper speed (matches old normal speed)
        steerSpeed: 175
    }
};

let currentStyle = 'classic'; // Retro Classic is default

const PALETTES = [
    { name: "NEON CYBER", rings: [0.83, 0.88, 0.5], cubes: [0.88, 0.14, 0.78], ship: 0.5 },
    { name: "AMIGA RAINBOW", dynamic: true },
    { name: "SYNTH WAVE", rings: [0.91, 0.77, 0.8], cubes: [0.12, 0.08, 0.14], ship: 0.8 },
    { name: "C64 MATRIX", rings: [0.33, 0.38, 0.28], cubes: [0.33, 0.3, 0.36], ship: 0.35 },
    { name: "RETRO AMBER", rings: [0.09, 0.11, 0.08], cubes: [0.12, 0.09, 0.06], ship: 0.12 }
];

let currentPaletteIdx = 0;
let hyperdrive = false;

// Game & Health State
let easyMode = true;
let isPaused = false;
let playerHealth = 100;
let invulnerableTimer = 0;
let isCrashed = false;
let score = 0;
let shipDepth = 250;
let cameraFov = 85;

// Input & Controls State
const keys = {};
let shipOffsetX = 0;
let shipOffsetY = 0;

// Three.js Fullscreen Scene Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030108, 0.0011);

const camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, 1, 3000);
camera.position.set(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030108, 1);
container.appendChild(renderer.domElement);

// -------------------------------------------------------------
// Floating Virtual Analog Joystick Module (Mouse & Touchscreen)
// -------------------------------------------------------------
const VirtualJoystick = (function () {
    let mode = 'joystick'; // 'joystick' (default) or 'dpad'
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    const maxRadius = 120; // Max thumb travel distance in px

    const vector = { x: 0, y: 0 };
    const joystickEl = document.getElementById('virtual-joystick');
    const thumbEl = joystickEl ? joystickEl.querySelector('.joystick-thumb') : null;

    function init() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        // Pointer events support both mouse clicks and touchscreen touches
        gameContainer.addEventListener('pointerdown', onPointerDown, { passive: false });
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { passive: false });
        window.addEventListener('pointercancel', onPointerUp, { passive: false });
    }

    function isInteractiveElement(target) {
        if (!target) return false;
        return !!target.closest('#hud, #mobile-btn, #restart-btn, #mobile-controls, select, input, button, label, a');
    }

    function onPointerDown(e) {
        if (mode !== 'joystick') return;
        if (activePointerId !== null) return; // Already tracking an active pointer
        if (isInteractiveElement(e.target)) return;

        if (e.cancelable) e.preventDefault();
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;

        // Appear centered at the exact touch / click location
        if (joystickEl) {
            joystickEl.style.left = `${startX}px`;
            joystickEl.style.top = `${startY}px`;
            joystickEl.classList.remove('hidden');
        }
        if (thumbEl) {
            thumbEl.style.transform = 'translate(0px, 0px)';
        }

        vector.x = 0;
        vector.y = 0;
    }

    function onPointerMove(e) {
        if (mode !== 'joystick' || activePointerId === null) return;
        if (e.pointerId !== activePointerId) return;

        if (e.cancelable) e.preventDefault();

        // Calculate offset vector relative to the touch press position
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance === 0) {
            vector.x = 0;
            vector.y = 0;
            if (thumbEl) thumbEl.style.transform = 'translate(0px, 0px)';
            return;
        }

        // Clamp travel within outer base circle
        const clampedDist = Math.min(distance, maxRadius);
        const angle = Math.atan2(deltaY, deltaX);

        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;

        if (thumbEl) {
            thumbEl.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
        }

        // Output normalized vector from -1.0 to 1.0
        const strength = clampedDist / maxRadius;
        vector.x = Math.cos(angle) * strength;
        // Invert Y so dragging upward steers ship upward
        vector.y = -(Math.sin(angle) * strength);
    }

    function onPointerUp(e) {
        if (mode !== 'joystick' || activePointerId === null) return;
        if (e.pointerId !== activePointerId) return;

        activePointerId = null;
        vector.x = 0;
        vector.y = 0;

        if (joystickEl) joystickEl.classList.add('hidden');
        if (thumbEl) thumbEl.style.transform = 'translate(0px, 0px)';
    }

    function setMode(newMode) {
        mode = newMode;
        activePointerId = null;
        vector.x = 0;
        vector.y = 0;

        if (joystickEl) joystickEl.classList.add('hidden');

        const dpadEl = document.getElementById('mobile-controls');
        if (dpadEl) {
            if (mode === 'dpad') {
                dpadEl.classList.remove('hidden');
            } else {
                dpadEl.classList.add('hidden');
            }
        }

        const touchVal = document.getElementById('touchVal');
        if (touchVal) {
            touchVal.innerText = mode === 'joystick' ? 'FLOATING JOYSTICK' : 'DPAD';
            touchVal.className = mode === 'joystick' ? 'touch-joystick' : 'touch-dpad';
        }

        const touchSelect = document.getElementById('touchSelect');
        if (touchSelect && touchSelect.value !== mode) {
            touchSelect.value = mode;
        }
    }

    function getVector() {
        return vector;
    }

    function getMode() {
        return mode;
    }

    return {
        init,
        setMode,
        getVector,
        getMode
    };
})();

VirtualJoystick.init();

// -------------------------------------------------------------
// Window Resize & Fullscreen Handling
// -------------------------------------------------------------
function handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener('resize', handleResize);

function updateFullscreenState() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const mobileToggleBtn = document.getElementById('mobile-btn');
    if (isFullscreen) {
        document.body.classList.add('mobile-mode');
        mobileToggleBtn.innerText = "✖ EXIT FULLSCREEN";
    } else {
        document.body.classList.remove('mobile-mode');
        mobileToggleBtn.innerText = "📱 FULLSCREEN / TOUCH MODE";
    }
    handleResize();
}

function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

document.getElementById('mobile-btn').addEventListener('click', toggleFullscreen);
window.addEventListener('fullscreenchange', updateFullscreenState);
window.addEventListener('webkitfullscreenchange', updateFullscreenState);

// -------------------------------------------------------------
// Multi-Touch Screen Controls (Old Style DPad)
// -------------------------------------------------------------
function setupMobileControls() {
    const mobileLeft = document.getElementById('mobile-left');
    const mobileRight = document.getElementById('mobile-right');
    const mobileUp = document.getElementById('mobile-up');
    const mobileDown = document.getElementById('mobile-down');

    const addControlListener = (element, keyCodes) => {
        if (!element) return;
        const press = (e) => {
            if (e.cancelable) e.preventDefault();
            keyCodes.forEach(k => keys[k] = true);
        };
        const release = (e) => {
            if (e.cancelable) e.preventDefault();
            keyCodes.forEach(k => keys[k] = false);
        };

        // Touch events
        element.addEventListener('touchstart', press, { passive: false });
        element.addEventListener('touchend', release, { passive: false });
        element.addEventListener('touchcancel', release, { passive: false });

        // Mouse events for testing
        element.addEventListener('mousedown', press);
        element.addEventListener('mouseup', release);
        element.addEventListener('mouseleave', () => {
            keyCodes.forEach(k => keys[k] = false);
        });
    };

    // Bottom Left: Left / Right
    addControlListener(mobileLeft, ['KeyA', 'ArrowLeft']);
    addControlListener(mobileRight, ['KeyD', 'ArrowRight']);

    // Bottom Right: Up / Down
    addControlListener(mobileUp, ['KeyW', 'ArrowUp']);
    addControlListener(mobileDown, ['KeyS', 'ArrowDown']);
}

setupMobileControls();

// -------------------------------------------------------------
// HUD Options & Speed Style Switcher
// -------------------------------------------------------------
function setSpeedStyle(styleKey) {
    if (!SPEED_STYLES[styleKey]) return;
    currentStyle = styleKey;

    const styleEl = document.getElementById('styleVal');
    const styleSelectEl = document.getElementById('styleSelect');

    if (styleEl) {
        styleEl.innerText = SPEED_STYLES[currentStyle].displayName;
        styleEl.className = currentStyle === 'classic' ? 'style-classic' : 'style-worms';
    }
    if (styleSelectEl && styleSelectEl.value !== currentStyle) {
        styleSelectEl.value = currentStyle;
    }
}

const styleSelect = document.getElementById('styleSelect');
if (styleSelect) {
    styleSelect.addEventListener('change', (e) => {
        setSpeedStyle(e.target.value);
    });
}

const touchSelect = document.getElementById('touchSelect');
if (touchSelect) {
    touchSelect.addEventListener('change', (e) => {
        VirtualJoystick.setMode(e.target.value);
    });
}

// FOV Slider Listener
const fovSlider = document.getElementById('fovSlider');
const fovVal = document.getElementById('fovVal');
fovSlider.addEventListener('input', (e) => {
    cameraFov = parseFloat(e.target.value);
    fovVal.innerText = cameraFov;
    camera.fov = cameraFov;
    camera.updateProjectionMatrix();
});

// Depth Slider Listener
const depthSlider = document.getElementById('depthSlider');
depthSlider.addEventListener('input', (e) => {
    shipDepth = parseFloat(e.target.value);
});

// Restart button listener for mobile / click
document.getElementById('restart-btn').addEventListener('click', () => {
    if (isCrashed) restartGame();
});

// Time Tracking
let time = 0;
let lastTime = performance.now();
let fps = 60;
let frameCount = 0;
let fpsTimer = 0;

// -------------------------------------------------------------
// Tunnel Path Mathematics
// -------------------------------------------------------------
function getTunnelCenter(z, t) {
    const absZ = Math.abs(z);
    const waveX = Math.sin(t * 1.2 + absZ * 0.0012) * 220 + Math.cos(t * 0.5 + absZ * 0.0006) * 120;
    const waveY = Math.cos(t * 1.0 + absZ * 0.0015) * 160 + Math.sin(t * 0.7 + absZ * 0.0008) * 90;
    return { x: waveX, y: waveY };
}

// -------------------------------------------------------------
// Player Spaceship Class
// -------------------------------------------------------------
class PlayerShip {
    constructor() {
        this.baseSize = 22;
        this.size = this.baseSize;
        this.group = new THREE.Group();

        const shipGeo = new THREE.ConeGeometry(this.baseSize * 0.8, this.baseSize * 2.2, 4);
        shipGeo.rotateX(-Math.PI / 2);

        const edgesGeo = new THREE.EdgesGeometry(shipGeo);
        this.material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 2,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        this.wireframe = new THREE.LineSegments(edgesGeo, this.material);
        this.group.add(this.wireframe);

        const wingGeo = new THREE.BufferGeometry();
        const wingVertices = new Float32Array([
            0, 0, 0,   -this.baseSize * 1.8, 0, this.baseSize * 0.8,   0, 0, this.baseSize * 0.5,
            0, 0, 0,    this.baseSize * 1.8, 0, this.baseSize * 0.8,   0, 0, this.baseSize * 0.5
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        const wingEdges = new THREE.EdgesGeometry(wingGeo);
        this.wings = new THREE.LineSegments(wingEdges, this.material);
        this.group.add(this.wings);

        const coreGeo = new THREE.SphereGeometry(this.baseSize * 0.25, 8, 8);
        this.coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xff007f,
            transparent: true,
            opacity: 0.9
        });
        this.core = new THREE.Mesh(coreGeo, this.coreMaterial);
        this.group.add(this.core);

        scene.add(this.group);
    }

    update(time, shipX, shipY, shipZ, dx, dy) {
        const center = getTunnelCenter(-shipZ, time);

        this.group.position.x = center.x + shipX;
        this.group.position.y = center.y + shipY;
        this.group.position.z = -shipZ;

        this.group.rotation.z = -dx * 0.002;
        this.group.rotation.x = dy * 0.002;
        this.group.rotation.y = -dx * 0.001;

        const palette = PALETTES[currentPaletteIdx];
        if (palette.dynamic) {
            this.material.color.setHSL((time * 0.2) % 1.0, 1.0, 0.6);
        } else {
            this.material.color.setHSL(palette.ship, 1.0, 0.6);
        }
    }
}

// -------------------------------------------------------------
// Tunnel Ring Class
// -------------------------------------------------------------
class TunnelRing {
    constructor(z) {
        this.z = z;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.8;
        this.hueOffset = Math.random();

        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(CONFIG.ringSegments * 3);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        this.material = new THREE.LineBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });

        this.line = new THREE.LineLoop(this.geometry, this.material);
        scene.add(this.line);
    }

    update(dt, speed, time) {
        this.z += speed * dt;
        this.rotation += this.rotSpeed * dt;

        if (this.z > -CONFIG.minDepth) {
            this.z -= (CONFIG.maxDepth - CONFIG.minDepth);
            this.rotation = Math.random() * Math.PI * 2;
        }

        const center = getTunnelCenter(this.z, time);
        const pulse = Math.sin(time * 3 + Math.abs(this.z) * 0.01) * 25;
        const radius = CONFIG.ringRadius + pulse;

        const posAttr = this.geometry.attributes.position;
        for (let i = 0; i < CONFIG.ringSegments; i++) {
            const angle = (i / CONFIG.ringSegments) * Math.PI * 2 + this.rotation;
            const deform = Math.sin(angle * 4 + time * 5) * 8;
            const r = radius + deform;

            const x = center.x + Math.cos(angle) * r;
            const y = center.y + Math.sin(angle) * r;

            posAttr.setXYZ(i, x, y, this.z);
        }
        posAttr.needsUpdate = true;

        const depthRatio = Math.abs(this.z) / CONFIG.maxDepth;
        const fogOpacity = Math.pow(1 - Math.min(1, Math.max(0, depthRatio)), 1.5);
        this.material.opacity = fogOpacity;

        const palette = PALETTES[currentPaletteIdx];
        if (palette.dynamic) {
            const h = (time * 0.1 + Math.abs(this.z) * 0.0005 + this.hueOffset) % 1.0;
            this.material.color.setHSL(h, 1.0, 0.6);
        } else {
            const hArr = palette.rings;
            const h = hArr[Math.floor((Math.abs(this.z) * 0.05) % hArr.length)];
            this.material.color.setHSL(h, 1.0, 0.6);
        }
    }
}

// -------------------------------------------------------------
// Floating Obstacle Cube Class
// -------------------------------------------------------------
class FloatingCube {
    constructor(z) {
        this.baseSize = 20 + Math.random() * 25;
        this.size = this.baseSize;

        const boxGeo = new THREE.BoxGeometry(this.baseSize, this.baseSize, this.baseSize);
        const edgesGeo = new THREE.EdgesGeometry(boxGeo);

        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff007f,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });

        this.group = new THREE.Group();
        this.wireframe = new THREE.LineSegments(edgesGeo, this.lineMaterial);
        this.group.add(this.wireframe);

        const coreGeo = new THREE.SphereGeometry(this.baseSize * 0.25, 8, 8);
        this.coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        this.core = new THREE.Mesh(coreGeo, this.coreMaterial);
        this.group.add(this.core);

        scene.add(this.group);
        this.reset(z);
    }

    reset(z = -CONFIG.maxDepth) {
        this.z = z;

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (CONFIG.ringRadius * 0.7);
        this.offsetX = Math.cos(angle) * dist;
        this.offsetY = Math.sin(angle) * dist;

        this.rotSpeedX = (Math.random() - 0.5) * 2.5;
        this.rotSpeedY = (Math.random() - 0.5) * 2.5;
        this.rotSpeedZ = (Math.random() - 0.5) * 2.5;

        this.group.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
    }

    update(dt, speed, time) {
        this.z += speed * dt;

        if (this.z > -CONFIG.minDepth) {
            this.reset(-CONFIG.maxDepth);
        }

        this.group.rotation.x += this.rotSpeedX * dt;
        this.group.rotation.y += this.rotSpeedY * dt;
        this.group.rotation.z += this.rotSpeedZ * dt;

        const center = getTunnelCenter(this.z, time);
        this.group.position.set(center.x + this.offsetX, center.y + this.offsetY, this.z);

        const depthRatio = Math.abs(this.z) / CONFIG.maxDepth;
        const fogOpacity = Math.pow(1 - Math.min(1, Math.max(0, depthRatio)), 1.2);

        this.lineMaterial.opacity = fogOpacity;
        this.coreMaterial.opacity = fogOpacity * 0.7;

        const palette = PALETTES[currentPaletteIdx];
        if (palette.dynamic) {
            const h = (time * 0.15 + Math.abs(this.z) * 0.001) % 1.0;
            this.lineMaterial.color.setHSL(h, 1.0, 0.65);
        } else {
            const hArr = palette.cubes;
            const h = hArr[Math.floor((Math.abs(this.z) * 0.08) % hArr.length)];
            this.lineMaterial.color.setHSL(h, 1.0, 0.65);
        }
    }
}

// -------------------------------------------------------------
// Speed Particles / Lines
// -------------------------------------------------------------
class SpeedParticles {
    constructor() {
        this.count = CONFIG.starCount;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 2 * 3);
        this.zData = new Float32Array(this.count);
        this.angleData = new Float32Array(this.count);
        this.distData = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            this.zData[i] = -Math.random() * CONFIG.maxDepth;
            this.angleData[i] = Math.random() * Math.PI * 2;
            this.distData[i] = 50 + Math.random() * 380;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.lines = new THREE.LineSegments(this.geometry, this.material);
        scene.add(this.lines);
    }

    update(dt, speed, time) {
        const posAttr = this.geometry.attributes.position;

        for (let i = 0; i < this.count; i++) {
            this.zData[i] += speed * 1.6 * dt;
            if (this.zData[i] > -CONFIG.minDepth) {
                this.zData[i] = -CONFIG.maxDepth;
                this.angleData[i] = Math.random() * Math.PI * 2;
                this.distData[i] = 50 + Math.random() * 380;
            }

            const z = this.zData[i];
            const center = getTunnelCenter(z, time);
            const x = center.x + Math.cos(this.angleData[i]) * this.distData[i];
            const y = center.y + Math.sin(this.angleData[i]) * this.distData[i];

            posAttr.setXYZ(i * 2, x, y, z);

            const tailZ = z - 50;
            const tailCenter = getTunnelCenter(tailZ, time);
            const tailX = tailCenter.x + Math.cos(this.angleData[i]) * this.distData[i];
            const tailY = tailCenter.y + Math.sin(this.angleData[i]) * this.distData[i];

            posAttr.setXYZ(i * 2 + 1, tailX, tailY, tailZ);
        }
        posAttr.needsUpdate = true;
    }
}

// -------------------------------------------------------------
// Instantiate Objects
// -------------------------------------------------------------
const playerShip = new PlayerShip();

const rings = [];
const ringStep = (CONFIG.maxDepth - CONFIG.minDepth) / CONFIG.ringCount;
for (let i = 0; i < CONFIG.ringCount; i++) {
    rings.push(new TunnelRing(-(CONFIG.minDepth + i * ringStep)));
}

const cubes = [];
for (let i = 0; i < CONFIG.cubeCount; i++) {
    const z = -(CONFIG.minDepth + Math.random() * (CONFIG.maxDepth - CONFIG.minDepth));
    cubes.push(new FloatingCube(z));
}

const particleSystem = new SpeedParticles();

function applyDifficultySettings() {
    const scaleFactor = easyMode ? 0.6 : 1.0;

    playerShip.group.scale.set(scaleFactor, scaleFactor, scaleFactor);
    playerShip.size = playerShip.baseSize * scaleFactor;

    cubes.forEach(cube => {
        cube.group.scale.set(scaleFactor, scaleFactor, scaleFactor);
        cube.size = cube.baseSize * scaleFactor;
    });

    const modeEl = document.getElementById('modeVal');
    if (modeEl) {
        modeEl.innerText = easyMode ? "EASY" : "HARD";
        modeEl.className = easyMode ? "mode-easy" : "mode-hard";
    }
}

applyDifficultySettings();

// -------------------------------------------------------------
// Controls & Keyboard Inputs
// -------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'KeyT') {
        // Toggle between Classic and Worms speed styles
        const nextStyle = currentStyle === 'classic' ? 'worms' : 'classic';
        setSpeedStyle(nextStyle);
    }
    if (e.code === 'KeyJ') {
        // Toggle between Floating Joystick and DPad
        const nextMode = VirtualJoystick.getMode() === 'joystick' ? 'dpad' : 'joystick';
        VirtualJoystick.setMode(nextMode);
    }
    if (e.code === 'KeyP') {
        if (!isCrashed) {
            isPaused = !isPaused;
            const statusEl = document.getElementById('statusVal');
            if (isPaused) {
                statusEl.innerText = "PAUSED";
                statusEl.className = "status-paused";
            } else {
                statusEl.innerText = "SURVIVING";
                statusEl.className = "status-alive";
            }
        }
    }
    if (e.code === 'KeyE') {
        easyMode = !easyMode;
        applyDifficultySettings();
    }
    if (e.code === 'KeyC') {
        currentPaletteIdx = (currentPaletteIdx + 1) % PALETTES.length;
        document.getElementById('paletteName').innerText = PALETTES[currentPaletteIdx].name;
    }
    if (e.code === 'KeyH') {
        document.getElementById('hud').classList.toggle('hidden');
    }
    if (e.code === 'KeyR' && isCrashed) {
        restartGame();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function handleShipInput(dt) {
    if (isCrashed || isPaused) return { speed: 0, dx: 0, dy: 0 };

    const style = SPEED_STYLES[currentStyle];
    hyperdrive = !!keys['Space'];

    const steerSpeed = (hyperdrive ? style.steerSpeed * 1.35 : style.steerSpeed) * dt;
    let dx = 0;
    let dy = 0;

    // Keyboard / DPad Discrete Inputs
    if (keys['KeyA'] || keys['ArrowLeft']) { dx -= steerSpeed; }
    if (keys['KeyD'] || keys['ArrowRight']) { dx += steerSpeed; }
    if (keys['KeyW'] || keys['ArrowUp']) { dy += steerSpeed; }
    if (keys['KeyS'] || keys['ArrowDown']) { dy -= steerSpeed; }

    // Floating Analog Joystick (Mouse / Touch) Input
    const joyVec = VirtualJoystick.getVector();
    if (joyVec.x !== 0 || joyVec.y !== 0) {
        dx += joyVec.x * steerSpeed;
        dy += joyVec.y * steerSpeed;
    }

    shipOffsetX += dx;
    shipOffsetY += dy;

    const speed = hyperdrive ? style.hyperSpeed : style.normalSpeed;

    return { speed, dx, dy };
}

// -------------------------------------------------------------
// Damage & Collision Handling
// -------------------------------------------------------------
function takeDamage(amount, scorePenalty, reason) {
    if (invulnerableTimer > 0) return;

    if (easyMode) {
        playerHealth -= amount;
        score = Math.max(0, score - scorePenalty);
        invulnerableTimer = 1.2;

        const vignette = document.querySelector('.vignette');
        vignette.classList.add('red-flash');
        setTimeout(() => {
            if (!isCrashed) vignette.classList.remove('red-flash');
        }, 250);

        updateHUDHealth();

        if (playerHealth <= 0) {
            triggerCrash(reason);
        }
    } else {
        playerHealth = 0;
        updateHUDHealth();
        triggerCrash(reason);
    }
}

function updateHUDHealth() {
    const healthEl = document.getElementById('healthVal');
    healthEl.innerText = Math.max(0, playerHealth) + "%";

    if (playerHealth > 60) {
        healthEl.className = "health-high";
    } else if (playerHealth > 25) {
        healthEl.className = "health-medium";
    } else {
        healthEl.className = "health-low";
    }
}

function checkCollisions(time) {
    if (isCrashed || isPaused) return;

    const shipZ = -shipDepth;
    const shipCenter = getTunnelCenter(shipZ, time);
    const shipWorldX = shipCenter.x + shipOffsetX;
    const shipWorldY = shipCenter.y + shipOffsetY;

    // 1. Tunnel Wall Collision
    const pulse = Math.sin(time * 3 + Math.abs(shipZ) * 0.01) * 25;
    const maxRadius = CONFIG.ringRadius + pulse - playerShip.size;
    const distFromCenter = Math.hypot(shipOffsetX, shipOffsetY);

    if (distFromCenter > maxRadius) {
        takeDamage(25, 150, "HIT TUNNEL WALL");
        return;
    }

    // 2. Cube Obstacle Collision
    for (let cube of cubes) {
        const depthDiff = Math.abs(cube.z - shipZ);
        if (depthDiff < (cube.size + playerShip.size)) {
            const cubeCenter = getTunnelCenter(cube.z, time);
            const cubeWorldX = cubeCenter.x + cube.offsetX;
            const cubeWorldY = cubeCenter.y + cube.offsetY;

            const dist3D = Math.hypot(
                shipWorldX - cubeWorldX,
                shipWorldY - cubeWorldY,
                shipZ - cube.z
            );

            if (dist3D < (cube.size * 0.65 + playerShip.size * 0.65)) {
                takeDamage(25, 150, "HIT OBSTACLE CUBE");
                return;
            }
        }
    }
}

function triggerCrash(reason) {
    isCrashed = true;
    document.querySelector('.vignette').classList.add('red-flash');
    document.getElementById('statusVal').innerText = "CRASHED";
    document.getElementById('statusVal').className = "status-crashed";

    document.getElementById('finalScore').innerText = Math.floor(score);
    document.getElementById('crash-overlay').classList.remove('hidden');
}

function restartGame() {
    isCrashed = false;
    isPaused = false;
    score = 0;
    playerHealth = 100;
    invulnerableTimer = 0;
    shipOffsetX = 0;
    shipOffsetY = 0;

    playerShip.group.visible = true;
    updateHUDHealth();

    document.querySelector('.vignette').classList.remove('red-flash');
    document.getElementById('statusVal').innerText = "SURVIVING";
    document.getElementById('statusVal').className = "status-alive";
    document.getElementById('crash-overlay').classList.add('hidden');

    cubes.forEach((cube) => {
        const z = -(CONFIG.minDepth + Math.random() * (CONFIG.maxDepth - CONFIG.minDepth));
        cube.reset(z);
    });
}

// -------------------------------------------------------------
// Main Render Loop
// -------------------------------------------------------------
function animate(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (isPaused) {
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        return;
    }

    time += dt;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
        fps = Math.round(frameCount / fpsTimer);
        frameCount = 0;
        fpsTimer = 0;
        document.getElementById('fps').innerText = fps;
    }

    if (invulnerableTimer > 0) {
        invulnerableTimer -= dt;
        playerShip.group.visible = Math.floor(time * 25) % 2 === 0;
    } else {
        playerShip.group.visible = true;
    }

    const { speed, dx, dy } = handleShipInput(dt);

    if (!isCrashed) {
        score += dt * (speed / 10);
        document.getElementById('scoreVal').innerText = Math.floor(score);
    }

    let shakeX = 0;
    let shakeY = 0;
    if (hyperdrive || isCrashed) {
        shakeX = (Math.random() - 0.5) * 12;
        shakeY = (Math.random() - 0.5) * 12;
    }

    const baseCam = getTunnelCenter(0, time);
    camera.position.x = baseCam.x + shakeX;
    camera.position.y = baseCam.y + shakeY;
    camera.position.z = 0;

    const targetCenter = getTunnelCenter(-200, time);
    camera.lookAt(targetCenter.x, targetCenter.y, -200);

    rings.forEach(ring => ring.update(dt, speed, time));
    cubes.forEach(cube => cube.update(dt, speed, time));
    particleSystem.update(dt, speed, time);

    playerShip.update(time, shipOffsetX, shipOffsetY, shipDepth, dx, dy);
    checkCollisions(time);

    document.getElementById('speedVal').innerText = Math.round(speed);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Initialise with Retro Classic speed style and Floating Joystick mode
setSpeedStyle('classic');
VirtualJoystick.setMode('joystick');
requestAnimationFrame(animate);
