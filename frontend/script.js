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
    draggedNode: null,
    isDragging: false,
    particles: null,
    edgeParticles: [],
    clock: new THREE.Clock(),
    selectedNode: null,
    expandedNodes: new Set()
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
    insightsList: document.getElementById('insights-list'),
    exploreBtn: document.getElementById('explore-btn')
};

// --- API Interaction ---
import { CONFIG } from './config.js';

dom.generateBtn.addEventListener('click', async () => {
    const text = dom.userInput.value.trim();
    if (!text) return;

    setLoading(true);

    try {
        const response = await fetch(`${CONFIG.API_URL}/generate_path`, {
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
        renderHierarchicalGraph(data);
        if (data.ai_suggestions) renderInsights(data.ai_suggestions); else dom.insightsList.parentElement.classList.add('hidden');

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
    if (!suggestions) return;
    suggestions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = typeof s === 'string' ? s : s.id || 'Niche Skill';
        dom.insightsList.appendChild(li);
    });
}

// --- Three.js Logic ---
function initThreeJS() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x020205);
    state.scene.fog = new THREE.FogExp2(0x020205, 0.015);

    state.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 5, 60);

    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.domElement.style.position = 'absolute';
    state.renderer.domElement.style.top = '0';
    state.renderer.domElement.style.zIndex = '1';
    dom.canvasContainer.appendChild(state.renderer.domElement);

    state.labelRenderer = new CSS2DRenderer();
    state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    state.labelRenderer.domElement.style.position = 'absolute';
    state.labelRenderer.domElement.style.top = '0';
    state.labelRenderer.domElement.style.pointerEvents = 'none';
    state.labelRenderer.domElement.style.zIndex = '2';
    dom.canvasContainer.appendChild(state.labelRenderer.domElement);

    const renderScene = new RenderPass(state.scene, state.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.3;

    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(renderScene);
    state.composer.addPass(bloomPass);

    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    state.scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0x00f2ff, 0x000000, 0.5);
    state.scene.add(hemiLight);

    createBrainParticles();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('click', onPointerClick);

    animate();
}

function createBrainParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = 5000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 35 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi) * 0.4;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0x004488,
        size: 0.12,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    state.particles = new THREE.Points(geometry, material);
    state.scene.add(state.particles);
}

function renderHierarchicalGraph(data) {
    // Cleanup
    state.nodes.forEach(n => {
        state.scene.remove(n);
        if (n.userData.label) n.userData.label.element.remove();
    });
    state.edges.forEach(e => state.scene.remove(e.line));
    state.edgeParticles.forEach(p => state.scene.remove(p.mesh));

    state.nodes = [];
    state.edges = [];
    state.edgeParticles = [];

    // Main Topic Node
    const mainPos = new THREE.Vector3(0, 25, 0);
    const mainNode = createNode({
        id: 'main',
        title: data.title,
        description: data.description,
        level: 0,
        type: 'main'
    }, mainPos);

    // Render Modules
    if (data.modules) {
        data.modules.forEach((mod, idx) => {
            const angle = (idx / data.modules.length) * Math.PI * 2;
            const radius = 15;
            const pos = new THREE.Vector3(
                Math.cos(angle) * radius,
                10,
                Math.sin(angle) * radius
            );

            const modNode = createNode({
                ...mod,
                level: 1,
                type: 'module'
            }, pos);

            createNeuralEdge(mainNode, modNode);

            // Subtopics (Initially hidden, or rendered close and hidden)
            // For now, let's render them and we'll handle partial visibility later
            // Or only render on click. Let's start with rendering them but small?
            // User requested "expandable tree". 
        });
    }

    state.controls.target.set(0, 0, 0);
}

function expandNode(node) {
    const d = node.userData.data;
    if (d.type !== 'module' || !d.subtopics) return;
    if (state.expandedNodes.has(d.id)) return;

    state.expandedNodes.add(d.id);

    d.subtopics.forEach((sub, idx) => {
        const offsetAngle = (idx / d.subtopics.length) * Math.PI - (Math.PI / 2);
        const radius = 8;
        const pos = new THREE.Vector3(
            node.position.x + Math.cos(offsetAngle) * radius,
            node.position.y - 10,
            node.position.z + Math.sin(offsetAngle) * radius
        );

        const subNode = createNode({
            ...sub,
            level: 2,
            type: 'subtopic'
        }, pos);

        createNeuralEdge(node, subNode);
    });
}


function createNode(data, position) {
    let size = 0.5;
    if (data.level == 0) size = 1.6;
    else if (data.level == 1) size = 1.0;

    const color = data.level <= 1 ? 0x4ade80 : 0x3b82f6;

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { isNode: true, data, initialSize: size, pulseSpeed: 1 + Math.random(), pulsePhase: Math.random() * Math.PI * 2 };

    const spriteMat = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'),
        color: color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(size * 5, size * 5, 1);
    mesh.add(sprite);

    const div = document.createElement('div');
    div.className = 'node-label';
    div.style.color = '#fff';
    div.style.fontSize = data.level == 0 ? '20px' : '12px';
    div.style.fontWeight = '700';
    div.style.padding = '4px 12px';
    div.style.background = 'rgba(0,0,0,0.4)';
    div.style.borderRadius = '20px';
    const title = data.title || data.id.replace(/_/g, ' ');
    div.innerHTML = `<span>${title}</span>`;

    const label = new CSS2DObject(div);
    label.position.set(0, size + 1.0, 0);
    mesh.add(label);
    mesh.userData.label = label;

    state.scene.add(mesh);
    state.nodes.push(mesh);
    return mesh;
}

function createNeuralEdge(source, target) {
    const material = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.3 });
    const midPoint = new THREE.Vector3().lerpVectors(source.position, target.position, 0.5);
    midPoint.x += (Math.random() - 0.5) * 10;
    midPoint.z += (Math.random() - 0.5) * 10;

    const curve = new THREE.QuadraticBezierCurve3(source.position, midPoint, target.position);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)), material);
    state.scene.add(line);
    state.edges.push({ line, source, target, midPoint });

    const particleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
    state.scene.add(particleMesh);
    state.edgeParticles.push({ mesh: particleMesh, curve, progress: Math.random() });
}

function updateEdges() {
    state.edges.forEach(edge => {
        const curve = new THREE.QuadraticBezierCurve3(edge.source.position, edge.midPoint, edge.target.position);
        edge.line.geometry.setFromPoints(curve.getPoints(30));
        edge.line.geometry.attributes.position.needsUpdate = true;
    });
}

function onPointerMove(event) {
    state.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (state.isDragging && state.draggedNode) {
        state.raycaster.setFromCamera(state.pointer, state.camera);
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -state.draggedNode.position.z);
        const intersectPoint = new THREE.Vector3();
        state.raycaster.ray.intersectPlane(dragPlane, intersectPoint);
        state.draggedNode.position.copy(intersectPoint);
        updateEdges();
    }
}

function onPointerDown(event) {
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const intersects = state.raycaster.intersectObjects(state.nodes);
    if (intersects.length > 0) {
        state.isDragging = true;
        state.draggedNode = intersects[0].object;
        state.controls.enabled = false;
    }
}

function onPointerUp() {
    state.isDragging = false;
    state.draggedNode = null;
    state.controls.enabled = true;
}

function onPointerClick() {
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const intersects = state.raycaster.intersectObjects(state.nodes);
    if (intersects.length > 0) {
        const node = intersects[0].object;
        const d = node.userData.data;
        state.selectedNode = node;

        dom.nodeTitle.textContent = d.title || d.id;
        dom.nodeDesc.textContent = d.description || `Learning Node Level ${d.level}`;

        // Show/Hide expansion button
        if (d.type === 'module' && !state.expandedNodes.has(d.id)) {
            dom.exploreBtn.classList.remove('hidden');
            dom.exploreBtn.onclick = () => expandNode(node);
        } else {
            dom.exploreBtn.classList.add('hidden');
        }

        dom.infoPanel.classList.add('visible');
    } else {
        dom.infoPanel.classList.remove('visible');
    }
}


function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    state.composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = state.clock.getElapsedTime();
    if (state.controls) state.controls.update();
    if (state.particles) state.particles.rotation.y += 0.0005;

    state.nodes.forEach(node => {
        const pulse = Math.sin(time * node.userData.pulseSpeed + node.userData.pulsePhase) * 0.1 + 1;
        node.scale.set(pulse, pulse, pulse);
    });

    state.edgeParticles.forEach(p => {
        p.progress += 0.005;
        if (p.progress > 1) p.progress = 0;
        p.mesh.position.copy(p.curve.getPoint(p.progress));
    });

    state.labelRenderer.render(state.scene, state.camera);
    state.composer.render();
}

initThreeJS();
