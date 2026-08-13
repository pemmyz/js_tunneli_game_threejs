/**
 * RETRO DEMOSCENE 3D TUNNEL ENGINE - DODGE GAME
 */

// Configuration & Global Settings
const CONFIG = {
    maxDepth: 2200,          // Distance far plane
    minDepth: 10,            // Distance near camera recycle plane
    baseSpeed: 550,          // Travel speed
    ringCount: 50,           // Number of tunnel rings
    cubeCount: 35,           // Floating wireframe cubes
    starCount: 250,          // Speed lines/dust particles
    ringSegments: 24,        // Vertices per ring polygon
    ringRadius: 260          // Base tunnel ring radius
};

const PALETTES = [
    { name: "NEON CYBER", rings: [0.83, 0.88, 0.5], cubes: [0.88, 0.14, 0.78], ship: 0.5 },
    { name: "AMIGA RAINBOW", dynamic: true },
    { name: "SYNTH WAVE", rings: [0.91, 0.77, 0.8], cubes: [0.12, 0.08, 0.14], ship: 0.8 },
    { name: "C64 MATRIX", rings: [0.33, 0.38, 0.28], cubes: [0.33, 0.3, 0.36], ship: 0.35 },
    { name: "RETRO AMBER", rings: [0.09, 0.11, 0.08], cubes: [0.12, 0.09, 0.06], ship: 0.12 }
];

let currentPaletteIdx = 0;
let speedMultiplier = 1.0;
let hyperdrive = false;

// Game State
let isCrashed = false;
let score = 0;
let shipDepth = 90; // Default distance inside tunnel from camera

// Input & Controls State
const keys = {};
let shipOffsetX = 0;
let shipOffsetY = 0;

// Three.js Scene Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030108, 0.0011);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
camera.position.set(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030108, 1);
container.appendChild(renderer.domElement);

// Depth Slider Listener
const depthSlider = document.getElementById('depthSlider');
depthSlider.addEventListener('input', (e) => {
    shipDepth = parseFloat(e.target.value);
});

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
        this.size = 22;
        this.group = new THREE.Group();

        // Ship Low-Poly Wireframe Geometry (Nose pointing along -Z)
        const shipGeo = new THREE.ConeGeometry(this.size * 0.8, this.size * 2.2, 4);
        shipGeo.rotateX(-Math.PI / 2); // Point apex down the tunnel (-Z)

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

        // Wings
        const wingGeo = new THREE.BufferGeometry();
        const wingVertices = new Float32Array([
            // Left wing
            0, 0, 0,   -this.size * 1.8, 0, this.size * 0.8,   0, 0, this.size * 0.5,
            // Right wing
            0, 0, 0,    this.size * 1.8, 0, this.size * 0.8,   0, 0, this.size * 0.5
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        const wingEdges = new THREE.EdgesGeometry(wingGeo);
        this.wings = new THREE.LineSegments(wingEdges, this.material);
        this.group.add(this.wings);

        // Core Glowing Mesh
        const coreGeo = new THREE.SphereGeometry(this.size * 0.25, 8, 8);
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
        // Find tunnel center offset at current depth Z
        const center = getTunnelCenter(-shipZ, time);

        this.group.position.x = center.x + shipX;
        this.group.position.y = center.y + shipY;
        this.group.position.z = -shipZ;

        // Dynamic Banking/Tilting when steering
        this.group.rotation.z = -dx * 0.002;
        this.group.rotation.x = dy * 0.002;
        this.group.rotation.y = -dx * 0.001;

        // Color update based on palette
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
        this.size = 20 + Math.random() * 25;

        const boxGeo = new THREE.BoxGeometry(this.size, this.size, this.size);
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

        const coreGeo = new THREE.SphereGeometry(this.size * 0.25, 8, 8);
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

        // Place obstacle within playable tunnel cross-section radius
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

// -------------------------------------------------------------
// Controls & User Inputs
// -------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

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
    if (isCrashed) return { speed: 0, dx: 0, dy: 0 };

    // Halved steering speed (was 420 * dt)
    const steerSpeed = 210 * dt;
    let dx = 0;
    let dy = 0;

    if (keys['KeyA'] || keys['ArrowLeft']) { shipOffsetX -= steerSpeed; dx -= steerSpeed; }
    if (keys['KeyD'] || keys['ArrowRight']) { shipOffsetX += steerSpeed; dx += steerSpeed; }
    if (keys['KeyW'] || keys['ArrowUp']) { shipOffsetY += steerSpeed; dy += steerSpeed; }
    if (keys['KeyS'] || keys['ArrowDown']) { shipOffsetY -= steerSpeed; dy -= steerSpeed; }

    hyperdrive = !!keys['Space'];
    speedMultiplier = hyperdrive ? 2.5 : 1.0;

    return { speed: CONFIG.baseSpeed * speedMultiplier, dx, dy };
}

// -------------------------------------------------------------
// Collision Detection
// -------------------------------------------------------------
function checkCollisions(time) {
    if (isCrashed) return;

    const shipZ = -shipDepth;
    const shipCenter = getTunnelCenter(shipZ, time);
    const shipWorldX = shipCenter.x + shipOffsetX;
    const shipWorldY = shipCenter.y + shipOffsetY;

    // 1. Tunnel Wall Collision
    const pulse = Math.sin(time * 3 + Math.abs(shipZ) * 0.01) * 25;
    const maxRadius = CONFIG.ringRadius + pulse - playerShip.size;
    const distFromCenter = Math.hypot(shipOffsetX, shipOffsetY);

    if (distFromCenter > maxRadius) {
        triggerCrash("HIT TUNNEL WALL");
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

            if (dist3D < (cube.size * 0.6 + playerShip.size * 0.6)) {
                triggerCrash("HIT OBSTACLE");
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
    score = 0;
    shipOffsetX = 0;
    shipOffsetY = 0;

    document.querySelector('.vignette').classList.remove('red-flash');
    document.getElementById('statusVal').innerText = "SURVIVING";
    document.getElementById('statusVal').className = "status-alive";
    document.getElementById('crash-overlay').classList.add('hidden');

    // Reset obstacle cubes
    cubes.forEach((cube, i) => {
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
    time += dt;

    // FPS Counter
    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
        fps = Math.round(frameCount / fpsTimer);
        frameCount = 0;
        fpsTimer = 0;
        document.getElementById('fps').innerText = fps;
    }

    // Player controls and movement
    const { speed, dx, dy } = handleShipInput(dt);

    if (!isCrashed) {
        score += dt * (speed / 10);
        document.getElementById('scoreVal').innerText = Math.floor(score);
    }

    // Camera follow tunnel
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

    // Update Objects
    rings.forEach(ring => ring.update(dt, speed, time));
    cubes.forEach(cube => cube.update(dt, speed, time));
    particleSystem.update(dt, speed, time);

    // Update Player Ship Position & Check Collisions
    playerShip.update(time, shipOffsetX, shipOffsetY, shipDepth, dx, dy);
    checkCollisions(time);

    // Update HUD Stats
    document.getElementById('speedVal').innerText = Math.round(speed);

    // Render WebGL Scene
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

// Start Animation Loop
requestAnimationFrame(animate);
