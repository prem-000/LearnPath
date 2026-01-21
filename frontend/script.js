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
    isChatOpen: false,
    expandedNodes: new Set(),
    currentTopic: ""
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

    // Task & Quiz
    taskSection: document.getElementById('task-section'),
    taskContent: document.getElementById('task-content'),
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions: document.getElementById('quiz-options'),

    // Chat
    chatToggle: document.getElementById('chat-toggle'),
    chatWindow: document.getElementById('chat-window'),
    chatMessages: document.getElementById('chat-messages'),
    chatSuggestedOptions: document.getElementById('chat-suggested-options'),
    chatInput: document.getElementById('chat-input'),
    sendChatBtn: document.getElementById('send-chat'),
    closeChatBtn: document.getElementById('close-chat')
};

// --- API Interaction ---
import { CONFIG } from './config.js';

dom.generateBtn.addEventListener('click', async () => {
    const text = dom.userInput.value.trim();
    if (!text) return;
    state.currentTopic = text;
    await processEngine("root", true);
});

async function processEngine(nodeName, isInitial = false) {
    setLoading(true);
    try {
        const response = await fetch(`${CONFIG.API_URL}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: state.currentTopic,
                level: dom.userLevel.value,
                selected_node: nodeName
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (isInitial) {
            transitionToViz();
            if (!state.renderer) initThreeJS();

            // Clear existing state
            state.nodes.forEach(n => state.scene.remove(n));
            state.edges.forEach(e => state.scene.remove(e.line));
            state.nodes = [];
            state.edges = [];

            if (data.tree) {
                renderTree(data.tree, new THREE.Vector3(0, 20, 0), 0);
            } else {
                console.error("AI Error: No tree structure in response", data);
                appendMessage('ai', "I couldn't generate the full path. Let's try another topic!");
            }
        }

        updateChatbot(data.chatbot);

    } catch (err) {
        console.error(err);
        appendMessage('system', err.message || 'Neural Link Interrupted. Check connection.');
    } finally {
        setLoading(false);
    }
}

function updateChatbot(cb) {
    if (!cb || !cb.message) return;
    appendMessage('ai', cb.message);
    dom.chatSuggestedOptions.innerHTML = '';
    if (cb.actions) {
        cb.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'opt-btn';
            btn.textContent = action;
            btn.onclick = () => {
                appendMessage('user', action);
                // Simple feedback loop for common actions
                if (action === "Show example") appendMessage('ai', "Here is a concrete example based on this topic...");
                else if (action === "Explain simpler") appendMessage('ai', "In essence, this is like...");
                else if (action === "Start quiz") appendMessage('ai', "Let's test your knowledge! Check the panel for the quiz.");
            };
            dom.chatSuggestedOptions.appendChild(btn);
        });
    }
}

// Chat UI Toggle
dom.chatToggle.addEventListener('click', () => {
    state.isChatOpen = !state.isChatOpen;
    dom.chatWindow.classList.toggle('hidden', !state.isChatOpen);
});

dom.closeChatBtn.addEventListener('click', () => {
    state.isChatOpen = false;
    dom.chatWindow.classList.add('hidden');
});

dom.sendChatBtn.addEventListener('click', () => sendChatMessage());
dom.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
    const q = dom.chatInput.value.trim();
    if (!q) return;

    appendMessage('user', q);
    dom.chatInput.value = '';

    try {
        const response = await fetch(`${CONFIG.API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: q,
                topic: state.currentTopic,
                level: dom.userLevel.value,
                node_context: state.selectedNode ? (state.selectedNode.userData.data.title || state.selectedNode.userData.data.current_node) : "root"
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        appendMessage('ai', data.response);

    } catch (err) {
        console.error(err);
        appendMessage('ai', "Learning Link Fault: " + (err.message || "Connection lost."));
    }
}

function appendMessage(type, text) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = text;
    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function setLoading(isLoading) {
    dom.generateBtn.classList.toggle('loading', isLoading);
    dom.generateBtn.disabled = isLoading;
}

function transitionToViz() {
    dom.inputSection.classList.add('hidden');
    dom.vizSection.classList.remove('hidden');
    setTimeout(() => dom.vizSection.classList.add('active'), 100);
}

// --- Three.js Logic ---
function initThreeJS() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x020205);
    state.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 10, 60);

    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    dom.canvasContainer.appendChild(state.renderer.domElement);

    state.labelRenderer = new CSS2DRenderer();
    state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    state.labelRenderer.domElement.style.position = 'absolute';
    state.labelRenderer.domElement.style.top = '0';
    state.labelRenderer.domElement.style.pointerEvents = 'none';
    dom.canvasContainer.appendChild(state.labelRenderer.domElement);

    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;

    const hemiLight = new THREE.HemisphereLight(0x00f2ff, 0x000000, 1);
    state.scene.add(hemiLight);

    createBrainParticles();
    animate();

    window.addEventListener('resize', onWindowResize);
}

function createBrainParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 3000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 100;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    state.particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x004488, size: 0.1, transparent: true, opacity: 0.4 }));
    state.scene.add(state.particles);
}

function renderTree(nodeData, position, level = 0) {
    if (!nodeData) return null;
    const node = createNode(nodeData, position);
    if (!node) return null;

    if (level === 0) {
        state.selectedNode = node;
        showNodeDetails(node);
    }

    if (nodeData.children && Array.isArray(nodeData.children)) {
        const childrenCount = nodeData.children.length;
        const radius = 25 - (level * 5); // Radius shrinks as we go deeper
        const verticalGap = 15;

        nodeData.children.forEach((childData, idx) => {
            const angle = (idx / childrenCount) * Math.PI * 2;
            const childPos = new THREE.Vector3(
                position.x + Math.cos(angle) * radius,
                position.y - verticalGap,
                position.z + Math.sin(angle) * radius
            );

            if (childData) {
                const childNode = renderTree(childData, childPos, level + 1);
                if (childNode) createNeuralEdge(node, childNode);
            }
        });
    }
    return node;
}

function createNode(data, position) {
    if (!data) return null;
    let size = 0.6;
    let color = 0x3b82f6; // Tertiary / blue

    if (data.role === 'root' || data.color === 'dominant') { size = 2.0; color = 0x00f2ff; }
    else if (data.role === 'parent' || data.color === 'secondary') { size = 1.2; color = 0x4ade80; }

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { isNode: true, data, pulseSpeed: 1 + Math.random(), pulsePhase: Math.random() * Math.PI * 2 };

    const div = document.createElement('div');
    div.className = 'node-label';
    div.innerHTML = `<span>${data.title || data.current_node}</span>`;
    const label = new CSS2DObject(div);
    label.position.set(0, size + 1.2, 0);
    mesh.add(label);

    state.scene.add(mesh);
    state.nodes.push(mesh);
    return mesh;
}

function createNeuralEdge(source, target) {
    const material = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.4 });
    const points = [
        source.position,
        new THREE.Vector3().lerpVectors(source.position, target.position, 0.5).add(new THREE.Vector3(5, -5, 0)),
        target.position
    ];
    const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), material);
    state.scene.add(line);
    state.edges.push({ line, source, target });
}

function onPointerClick(event) {
    state.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const hits = state.raycaster.intersectObjects(state.nodes);
    if (hits.length > 0) {
        const node = hits[0].object;
        state.selectedNode = node;
        showNodeDetails(node);
    } else {
        dom.infoPanel.classList.remove('visible');
    }
}

function showNodeDetails(node) {
    const d = node.userData.data;
    dom.nodeTitle.textContent = d.title || d.current_node;
    dom.nodeDesc.textContent = d.explanation || d.summary || "Cognitive Pillar";

    // Task & Quiz
    if (d.task) {
        dom.taskSection.classList.remove('hidden');
        dom.taskContent.textContent = d.task;
        dom.quizQuestion.textContent = d.quiz || "What is a core part of this topic?";
        dom.quizOptions.innerHTML = '<button class="opt-btn">Answer A</button><button class="opt-btn">Answer B</button>';
    } else {
        dom.taskSection.classList.add('hidden');
    }

    dom.infoPanel.classList.add('visible');
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = state.clock.getElapsedTime();
    if (state.controls) state.controls.update();
    if (state.particles) state.particles.rotation.y += 0.0003;
    state.nodes.forEach(n => {
        const p = Math.sin(time * n.userData.pulseSpeed + n.userData.pulsePhase) * 0.05 + 1;
        n.scale.set(p, p, p);
    });
    state.labelRenderer.render(state.scene, state.camera);
    state.renderer.render(state.scene, state.camera);
}

window.addEventListener('click', onPointerClick);
initThreeJS();
