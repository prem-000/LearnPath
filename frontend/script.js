import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- State ---
const state = {
    data: null,
    scene: null,
    camera: null,
    renderer: null,
    labelRenderer: null,
    composer: null,
    controls: null,
    nodes: [],
    edges: [],
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    hoveredNode: null,
    particles: null
};

// --- DOM Elements ---
const dom = {
    inputSection: document.getElementById('input-section'),
    vizSection: document.getElementById('visualization-section'),
    userInput: document.getElementById('user-input'),
    userLevel: document.getElementById('user-level'),
    generateBtn: document.getElementById('generate-btn'),
    canvasContainer: document.getElementById('canvas-container'),
    infoPanel: document.getElementById('info-panel'),
    nodeTitle: document.getElementById('node-title'),
    nodeDesc: document.getElementById('node-desc'),
    insightsList: document.getElementById('insights-list')
};

// --- API Interaction ---
dom.generateBtn.addEventListener('click', async () => {
    const text = dom.userInput.value.trim();
    if (!text) return;

    setLoading(true);

    try {
        const response = await fetch('http://127.0.0.1:8000/generate_path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                level: dom.userLevel.value
            })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        state.data = data;

        transitionToViz();
        if (!state.renderer) initThreeJS();
        renderGraph(data);
        renderInsights(data.ai_suggestions);

    } catch (err) {
        console.error(err);
        alert('Failed to generate path. Please ensure backend is running.');
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        dom.generateBtn.classList.add('loading');
        dom.generateBtn.disabled = true;
    } else {
        dom.generateBtn.classList.remove('loading');
        dom.generateBtn.disabled = false;
    }
}

function transitionToViz() {
    dom.inputSection.classList.add('hidden');
    dom.vizSection.classList.remove('hidden');
    setTimeout(() => {
        dom.vizSection.classList.add('active');
    }, 100);
}

function renderInsights(suggestions) {
    dom.insightsList.innerHTML = '';
    suggestions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        dom.insightsList.appendChild(li);
    });
}

// --- Three.js Logic ---
function initThreeJS() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x020205);
    state.scene.fog = new THREE.FogExp2(0x020205, 0.015);

    state.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 0, 45); // Centered, further back

    // WebGL Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.domElement.style.position = 'absolute';
    state.renderer.domElement.style.top = '0';
    state.renderer.domElement.style.zIndex = '1';
    dom.canvasContainer.appendChild(state.renderer.domElement);

    // CSS2D Renderer (for clear text)
    state.labelRenderer = new CSS2DRenderer();
    state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    state.labelRenderer.domElement.style.position = 'absolute';
    state.labelRenderer.domElement.style.top = '0';
    state.labelRenderer.domElement.style.pointerEvents = 'none'; // Allow clicks to pass through
    state.labelRenderer.domElement.style.zIndex = '2'; // On top of WebGL
    dom.canvasContainer.appendChild(state.labelRenderer.domElement);

    // Post-processing
    const renderScene = new RenderPass(state.scene, state.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;

    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(renderScene);
    state.composer.addPass(bloomPass);

    state.controls = new OrbitControls(state.camera, state.renderer.domElement); // Control WebGL canvas
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.minDistance = 10;
    state.controls.maxDistance = 100;

    // lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    state.scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0x00f2ff, 0x000000, 0.4);
    state.scene.add(hemiLight);

    // Initial brain cloud
    createBrainParticles();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('click', onPointerClick);

    animate();
}

function createBrainParticles() {
    // Generate particles in a brain-like shape (two lobes, roughly ellipsoid)
    const geometry = new THREE.BufferGeometry();
    const count = 3000;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Brain shape approx: elliptical, two halves split by x=0
        // x: width, y: height, z: depth
        // Lobe separation
        const isRight = Math.random() > 0.5;
        const xOffset = isRight ? 2 : -2;

        // Random point in sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        let r = 18 + Math.random() * 2; // Base radius

        // Sculpting
        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        // Flatten z slightly
        z *= 0.8;
        // Stretch y slightly
        y *= 0.9;

        // Add lobe offset
        x += (xOffset * (Math.abs(y) / 20)); // separation increases near top/center? simplified:
        // Simple offset
        x += (isRight ? 1.5 : -1.5);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0x0044aa,
        size: 0.15,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    state.particles = new THREE.Points(geometry, material);
    state.scene.add(state.particles);
}

function renderGraph(data) {
    // Cleanup
    state.nodes.forEach(n => {
        state.scene.remove(n);
        if (n.userData.label) n.userData.label.element.remove(); // Remove CSS2DObject's DOM element
    });
    // Remove lines
    state.scene.children = state.scene.children.filter(c => c.type !== 'Line');

    state.nodes = [];
    state.edges = [];

    // Organize nodes within the Brain volume
    // We keep the vertical progression logic but center it effectively
    const levelMap = {};
    data.nodes.forEach(node => {
        if (!levelMap[node.level]) levelMap[node.level] = [];
        levelMap[node.level].push(node);
    });

    const levels = Object.keys(levelMap).sort((a, b) => a - b);
    const nodeObjects = {};

    // Vertical span
    const totalHeight = 25;
    const startY = totalHeight / 2;
    const yStep = totalHeight / (Math.max(levels.length, 1));

    levels.forEach((level, i) => {
        const nodesInLevel = levelMap[level];
        const y = startY - (i * yStep);

        nodesInLevel.forEach((node, j) => {
            // Horizontal spread based on count
            const width = Math.min(nodesInLevel.length * 5, 20); // max width 20
            const xStep = width / (nodesInLevel.length + 1);
            const x = -width / 2 + (xStep * (j + 1));

            // Curve z to follow brain surface roughly? 
            // Keep central nodes deep, outer nodes projected? 
            // Simple: z = 0 for core path visibility
            const z = 0;

            const pos = new THREE.Vector3(x, y, z);
            createNode(node, pos);
            nodeObjects[node.id] = pos;
        });
    });

    // AI Suggestions as peripheral thoughts
    const suggestions = data.ai_suggestions || [];
    suggestions.forEach((s, k) => {
        if (typeof s !== 'string') return;
        // Random placement in outer brain cortex
        const angle = (k / suggestions.length) * Math.PI * 2;
        const radius = 12 + Math.random() * 4;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.8; // Ellipsoid
        const z = (Math.random() - 0.5) * 5;

        const pos = new THREE.Vector3(x, y, z);
        const nodeData = { id: s, level: 'AI', type: 'suggestion' };
        createNode(nodeData, pos, true);

        // Connect to nearest core node
        // Simple: connect to a random node
        if (state.nodes.length > 0) {
            const target = state.nodes[Math.floor(Math.random() * (state.nodes.length / 2))]; // Prefer earlier/core nodes
            if (target) createCurvedEdge(pos, target.position, true);
        }
    });

    // Edges
    data.edges.forEach(edge => {
        if (nodeObjects[edge.from] && nodeObjects[edge.to]) {
            createCurvedEdge(nodeObjects[edge.from], nodeObjects[edge.to]);
        }
    });

    state.controls.target.set(0, 0, 0); // Center view
}

function createNode(data, position, isSide = false) {
    const color = isSide ? 0x00ffaa : 0x00f2ff;

    // 1. 3D Object (The Glowing Dot/Node)
    const geometry = new THREE.SphereGeometry(isSide ? 0.3 : 0.6, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { isNode: true, data: data };

    // Glow Sprite
    const spriteMat = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'),
        color: color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(isSide ? 2 : 4, isSide ? 2 : 4, 1);
    mesh.add(sprite);

    state.scene.add(mesh);
    state.nodes.push(mesh);

    // 2. CSS2D Label (The Clear Text + Symbol)
    const div = document.createElement('div');
    div.className = 'node-label';
    div.style.marginTop = '-1em'; // Center slightly
    div.style.color = isSide ? '#aaffba' : '#ffffff';
    div.style.fontSize = isSide ? '12px' : '16px';
    div.style.fontWeight = 'bold';
    div.style.textShadow = `0 0 10px ${isSide ? '#00ffaa' : '#00f2ff'}`;
    div.style.pointerEvents = 'auto'; // allow clicking text?
    div.style.cursor = 'pointer';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    div.style.whiteSpace = 'nowrap';

    // Icon Logic
    const iconClass = getIconForDomain(data.id, data.type);

    div.innerHTML = `<i class="${iconClass}"></i> <span>${data.id.replace(/_/g, ' ')}</span>`;

    const label = new CSS2DObject(div);
    label.position.set(0, isSide ? 0.8 : 1.2, 0);
    mesh.add(label);
    mesh.userData.label = label; // Store reference to label for cleanup
}

function getIconForDomain(name, type) {
    const n = name.toLowerCase();
    if (n.includes('python')) return 'fa-brands fa-python';
    if (n.includes('js') || n.includes('javascript')) return 'fa-brands fa-js';
    if (n.includes('html')) return 'fa-brands fa-html5';
    if (n.includes('css')) return 'fa-brands fa-css3';
    if (n.includes('react')) return 'fa-brands fa-react';
    if (n.includes('node')) return 'fa-brands fa-node';
    if (n.includes('database') || n.includes('sql')) return 'fa-solid fa-database';
    if (n.includes('statistics') || n.includes('math')) return 'fa-solid fa-square-root-variable';
    if (n.includes('regression') || n.includes('network')) return 'fa-solid fa-network-wired';
    if (n.includes('algo')) return 'fa-solid fa-microchip';
    if (type === 'suggestion') return 'fa-regular fa-lightbulb';
    return 'fa-solid fa-circle-nodes'; // Default
}

function createCurvedEdge(v1, v2, isSide = false) {
    // Bezier
    const mid = v1.clone().add(v2).multiplyScalar(0.5);
    // Add randomness for 'neural' look
    mid.x += (Math.random() - 0.5) * 5;
    mid.z += (Math.random() - 0.5) * 5;

    const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: isSide ? 0x00ffaa : 0x00f2ff,
        transparent: true,
        opacity: isSide ? 0.2 : 0.5
    });
    const line = new THREE.Line(geometry, material);
    state.scene.add(line);
}

// --- Interaction ---
function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    state.composer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
    state.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onPointerClick(event) {
    if (state.hoveredNode) {
        showNodeInfo(state.hoveredNode.userData.data);
    }
}

function showNodeInfo(data) {
    dom.nodeTitle.textContent = data.id.replace(/_/g, ' ');
    dom.nodeDesc.textContent = `${data.type || 'Suggestion'} • ${data.level === 'AI' ? 'AI Generated' : 'Level ' + data.level}`;
    dom.infoPanel.classList.add('visible');
}

function animate() {
    requestAnimationFrame(animate);
    if (state.controls) state.controls.update();

    // Rotate Brain Cloud slowly
    if (state.particles) {
        state.particles.rotation.y += 0.002;
    }

    // Raycaster
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const intersects = state.raycaster.intersectObjects(state.nodes);

    if (intersects.length > 0) {
        if (state.hoveredNode !== intersects[0].object) {
            state.hoveredNode = intersects[0].object;
            document.body.style.cursor = 'pointer';
        }
    } else {
        state.hoveredNode = null;
        document.body.style.cursor = 'default';
    }

    state.labelRenderer.render(state.scene, state.camera); // Render text
    state.composer.render(); // Render glow
}

// Init
initThreeJS();
