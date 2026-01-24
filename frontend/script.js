import * as THREE from 'three';
import { CONFIG } from './config.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- Radial Brain Visualization Class ---
class RadialBrainViz {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;
        this.rootGroup = null;
        this.nodes = [];
        this.edges = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isInteracting = false;
        this.targetRotation = new THREE.Euler(0, 0, 0);
        this.currentRotation = new THREE.Euler(0, 0, 0);
        this.zoom = 1;
        this.selectedId = null;
        this.levelColors = [
            0x312E81, // Indigo
            0x3B82F6, // Blue
            0x10B981, // Green
            0xF59E0B, // Amber
            0xF97316, // Orange
            0xD1D5DB  // Light Gray
        ];
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        this.camera.position.z = 800;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.className = 'node-label-container';
        this.container.appendChild(this.labelRenderer.domElement);

        this.rootGroup = new THREE.Group();
        this.scene.add(this.rootGroup);

        // Ambient Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(100, 100, 100);
        this.scene.add(pointLight);

        this.setupBackground();
        this.animate();
        this.setupEvents();
    }

    setupBackground() {
        const loader = new THREE.TextureLoader();
        loader.load('./assets/brain_bg.png', (texture) => {
            const geometry = new THREE.PlaneGeometry(1200, 1200);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.15,
                depthWrite: false
            });
            const bg = new THREE.Mesh(geometry, material);
            bg.position.z = -100;
            this.scene.add(bg);
            this.brainBg = bg;
        });
    }

    render(treeData) {
        this.clear();
        this.buildTree(treeData, 0, 0, Math.PI * 2);
    }

    clear() {
        while (this.rootGroup.children.length > 0) {
            this.rootGroup.remove(this.rootGroup.children[0]);
        }
        this.nodes = [];
        this.edges = [];
        this.zoom = 1;
        this.rootGroup.rotation.set(0, 0, 0);
        this.selectedId = null;
    }

    buildTree(node, depth, angleStart, angleEnd) {
        const radius = depth * 150;
        const angle = (angleStart + angleEnd) / 2;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const levelColor = this.levelColors[Math.min(depth, this.levelColors.length - 1)];

        const nodeObj = this.createNodeMesh(node, x, y, levelColor, depth);
        nodeObj.userData = { node, depth, x, y };
        this.rootGroup.add(nodeObj);
        this.nodes.push(nodeObj);

        if (node.children && node.children.length > 0) {
            const count = node.children.length;
            const slice = (angleEnd - angleStart) || (Math.PI * 2);

            node.children.forEach((child, i) => {
                const cAngleStart = angleStart + (slice / count) * i;
                const cAngleEnd = angleStart + (slice / count) * (i + 1);

                const childNode = this.buildTree(child, depth + 1, cAngleStart, cAngleEnd);
                this.createEdge(nodeObj, childNode);
            });
        }
        return nodeObj;
    }

    createNodeMesh(node, x, y, color, depth) {
        const size = Math.max(20 - depth * 2, 8);
        const geometry = new THREE.CircleGeometry(size, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);

        // Status Border / Icon (using a RingGeometry)
        if (node.status === 'completed' || Math.random() > 0.8) {
            const ringGeo = new THREE.RingGeometry(size * 1.1, size * 1.3, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x10B981, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            mesh.add(ring);
        }

        // Inner Glow effect (subtle)
        const glowGeo = new THREE.CircleGeometry(size * 1.2, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.z = -1;
        mesh.add(glow);

        // Label
        const div = document.createElement('div');
        div.className = 'node-label-item';
        div.textContent = node.title || node.current_node;
        const label = new CSS2DObject(div);
        label.position.set(0, size + 15, 0);
        mesh.add(label);

        return mesh;
    }

    createEdge(parent, child) {
        const points = [
            new THREE.Vector3(parent.position.x, parent.position.y, 0),
            new THREE.Vector3(child.position.x, child.position.y, 0)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: 0x94a3b8, // Slately blue-gray
            transparent: true,
            opacity: 0.4,
            dashSize: 10,
            gapSize: 5,
        });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances(); // Required for dashed material
        this.rootGroup.add(line);
        this.edges.push({ line, parent, child });
    }

    setupEvents() {
        let isMouseDown = false;
        let prevX, prevY;

        this.container.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            prevX = e.clientX;
            prevY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            const deltaX = e.clientX - prevX;
            const deltaY = e.clientY - prevY;

            this.rootGroup.rotation.z += deltaX * 0.005;
            prevX = e.clientX;
            prevY = e.clientY;

            // Stop labels from rotating
            this.nodes.forEach(n => {
                n.children.forEach(c => {
                    if (c instanceof CSS2DObject) c.rotation.z = -this.rootGroup.rotation.z;
                });
            });
        });

        window.addEventListener('mouseup', () => isMouseDown = false);

        this.container.addEventListener('click', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.nodes);

            if (intersects.length > 0) {
                const clicked = intersects[0].object;
                this.handleNodeSelect(clicked);
            }
        });

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.setZoom(this.zoom * delta);
        }, { passive: false });
    }

    handleNodeSelect(nodeMesh) {
        this.selectedId = nodeMesh.id;
        const nodeData = nodeMesh.userData.node;

        // Highlight logic
        const lineage = this.getLineage(nodeMesh);
        const children = this.getChildren(nodeMesh);
        const activeIds = new Set([...lineage, ...children, nodeMesh.id]);

        this.nodes.forEach(n => {
            n.material.opacity = activeIds.has(n.id) ? 1 : 0.2;
            n.children.forEach(c => {
                if (c instanceof THREE.Mesh) c.material.opacity = activeIds.has(n.id) ? 0.2 : 0.05;
            });
        });

        this.edges.forEach(e => {
            const isActive = activeIds.has(e.parent.id) && activeIds.has(e.child.id);
            e.line.material.opacity = isActive ? 0.9 : 0.3;
            e.line.material.color.setHex(isActive ? 0x6366f1 : 0x94a3b8);
        });

        // Trigger App Logic
        if (window.appHandleNodeClick) window.appHandleNodeClick(nodeData);
    }

    getLineage(node) {
        const ids = [];
        let curr = node;
        while (curr) {
            const parentEdge = this.edges.find(e => e.child === curr);
            if (parentEdge) {
                ids.push(parentEdge.parent.id);
                curr = parentEdge.parent;
            } else {
                curr = null;
            }
        }
        return ids;
    }

    getChildren(node) {
        const ids = [];
        this.edges.forEach(e => {
            if (e.parent === node) {
                ids.push(e.child.id);
                // recursive if we want all descendants
            }
        });
        return ids;
    }

    setZoom(val) {
        this.zoom = Math.min(Math.max(val, 0.2), 3);
        this.camera.zoom = this.zoom;
        this.camera.updateProjectionMatrix();
    }

    reset() {
        this.setZoom(1);
        this.rootGroup.rotation.set(0, 0, 0);
        this.handleNodeSelect({ id: null, userData: { node: null } }); // Reset highlight
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        // Ambient motion for root group
        this.rootGroup.position.y = Math.sin(time) * 10;
        this.rootGroup.position.x = Math.cos(time * 0.5) * 5;

        // Flowing effect for edges
        this.edges.forEach(e => {
            if (e.line.material.dashOffset !== undefined) {
                e.line.material.dashOffset -= 0.5;
            }
        });

        // Pulsing for background
        if (this.brainBg) {
            const pulse = 0.15 + Math.sin(time * 0.5) * 0.05;
            this.brainBg.material.opacity = pulse;
            const scalePulse = 1 + Math.sin(time * 0.2) * 0.02;
            this.brainBg.scale.set(scalePulse, scalePulse, 1);
        }

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    resize() {
        if (!this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }
}

// --- State Management ---
const state = {
    currentTopic: "",
    pathData: null,
    selectedNode: null,
    isSidebarOpen: false,
    isInfoPanelOpen: false,
    isAssistantOpen: false,
    view: "dashboard", // dashboard, paths, nodes, progress
    visualizer: null
};

// --- DOM References ---
const dom = {
    // Layout
    app: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    infoPanel: document.getElementById('node-info-panel'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    mobileMenuClose: document.getElementById('mobile-menu-close'),

    // Views
    inputSection: document.getElementById('input-section'),
    vizSection: document.getElementById('visualization-section'),
    nodesSection: document.getElementById('nodes-section'),
    suggestedTopics: document.getElementById('suggested-topics'),
    comingSoonOverlay: document.getElementById('coming-soon-overlay'),
    comingSoonTitle: document.getElementById('coming-soon-title'),
    closeComingSoon: document.getElementById('close-coming-soon'),
    closeComingSoonBtn: document.getElementById('close-coming-soon-btn'),

    // Form
    userInput: document.getElementById('user-input'),
    userLevel: document.getElementById('user-level'),
    generateBtn: document.getElementById('generate-btn'),

    // Visualization
    treeCanvas: document.getElementById('tree-canvas'),
    pathTitle: document.getElementById('path-title'),

    // Node Info
    nodeTitle: document.getElementById('node-title'),
    nodeDetails: document.getElementById('node-details'),
    activeNodeContent: document.getElementById('active-node-content'),
    nodeStatus: document.getElementById('node-status'),
    nodeDesc: document.getElementById('node-desc'),
    taskContent: document.getElementById('task-content'),
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions: document.getElementById('quiz-options'),
    closeInfoPanel: document.getElementById('close-info-panel'),

    // AI Assistant
    assistantTrigger: document.getElementById('assistant-trigger'),
    assistantOverlay: document.getElementById('assistant-overlay'),
    closeAssistant: document.getElementById('close-assistant'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendChatBtn: document.getElementById('send-chat'),
    suggestedPrompts: document.getElementById('chat-suggested-prompts'),

    // Navigation
    navItems: document.querySelectorAll('.nav-item'),

    // Zoom Controls
    zoomIn: document.querySelector('.canvas-controls .icon-btn:nth-child(2)'),
    zoomOut: document.querySelector('.canvas-controls .icon-btn:nth-child(3)'),
    zoomReset: document.querySelector('.canvas-controls .icon-btn:nth-child(1)')
};

// --- Initialization ---
function init() {
    state.visualizer = new RadialBrainViz(dom.treeCanvas);
    state.visualizer.init();
    setupEventListeners();
    renderSuggestedTopics();
    window.appHandleNodeClick = handleNodeClick;
    window.addEventListener('resize', () => state.visualizer.resize());
}

// --- Event Listeners ---
function setupEventListeners() {
    // Generation
    dom.generateBtn.addEventListener('click', () => handleGenerate());

    // Mobile Menu
    dom.mobileMenuToggle.addEventListener('click', () => toggleSidebar(true));
    dom.mobileMenuClose.addEventListener('click', () => toggleSidebar(false));

    // Info Panel
    dom.closeInfoPanel.addEventListener('click', () => toggleInfoPanel(false));

    // Assistant
    dom.assistantTrigger.addEventListener('click', () => toggleAssistant(true));
    dom.closeAssistant.addEventListener('click', () => toggleAssistant(false));

    // New ones
    dom.closeComingSoon.addEventListener('click', () => toggleComingSoon(false));
    dom.closeComingSoonBtn.addEventListener('click', () => toggleComingSoon(false));

    dom.assistantOverlay.addEventListener('click', (e) => {
        if (e.target === dom.assistantOverlay) toggleAssistant(false);
    });

    // Chat
    dom.sendChatBtn.addEventListener('click', () => sendChatMessage());
    dom.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Navigation
    dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            const label = item.querySelector('span').textContent;

            if (label === 'Progress' || label === 'Resources') {
                showComingSoon(label);
                return;
            }

            if (view) switchView(view);
            if (window.innerWidth < 900) toggleSidebar(false);
        });
    });

    // Zoom Controls Implementation
    dom.zoomIn.addEventListener('click', () => state.visualizer.setZoom(state.visualizer.zoom * 1.2));
    dom.zoomOut.addEventListener('click', () => state.visualizer.setZoom(state.visualizer.zoom / 1.2));
    dom.zoomReset.addEventListener('click', () => state.visualizer.reset());
}

// --- UI Actions ---
function toggleSidebar(isOpen) {
    state.isSidebarOpen = isOpen;
    dom.sidebar.classList.toggle('active', isOpen);
}

function toggleInfoPanel(isOpen) {
    state.isInfoPanelOpen = isOpen;
    dom.infoPanel.classList.toggle('active', isOpen);
    if (!isOpen) {
        state.selectedNode = null;
        updateActiveNodeUI(null);
    }
}

function toggleAssistant(isOpen) {
    state.isAssistantOpen = isOpen;
    dom.assistantOverlay.classList.toggle('hidden', !isOpen);
    if (isOpen) dom.chatInput.focus();
}

function toggleComingSoon(isOpen) {
    dom.comingSoonOverlay.classList.toggle('hidden', !isOpen);
}

function showComingSoon(feature) {
    dom.comingSoonTitle.textContent = feature;
    toggleComingSoon(true);
}

function switchView(viewName) {
    state.view = viewName;
    dom.navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Hide all sections first
    dom.inputSection.classList.add('hidden');
    dom.vizSection.classList.add('hidden');
    dom.nodesSection.classList.add('hidden');

    if (viewName === 'dashboard') {
        dom.inputSection.classList.remove('hidden');
    } else if (viewName === 'paths') {
        if (state.pathData) {
            dom.vizSection.classList.remove('hidden');
            setTimeout(() => state.visualizer.resize(), 50);
        } else {
            switchView('dashboard');
        }
    } else if (viewName === 'nodes') {
        dom.nodesSection.classList.remove('hidden');
    }
}

function renderSuggestedTopics() {
    const suggestions = [
        { title: "Machine Learning Foundations", icon: "fa-brain", desc: "Linear Algebra, Calculus, and Statistics." },
        { title: "Quantum Computing 101", icon: "fa-atom", desc: "Qubits, Superposition, and Entanglement." },
        { title: "Advanced React Patterns", icon: "fa-code", desc: "Hooks, HOCs, and Performance Optimization." },
        { title: "DevOps for Startups", icon: "fa-server", desc: "Docker, Kubernetes, and CI/CD Pipelines." }
    ];

    dom.suggestedTopics.innerHTML = suggestions.map(topic => `
        <div class="suggested-item" onclick="document.getElementById('user-input').value = '${topic.title}'; switchView('dashboard');">
            <i class="fas ${topic.icon}"></i>
            <h4>${topic.title}</h4>
            <p>${topic.desc}</p>
        </div>
    `).join('');
}

async function handleGenerate() {
    const topic = dom.userInput.value.trim();
    if (!topic) return;

    state.currentTopic = topic;
    setLoading(true);

    try {
        const response = await fetch(`${CONFIG.API_URL}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: topic,
                level: dom.userLevel.value,
                selected_node: "root"
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        state.pathData = data.tree;
        state.visualizer.render(data.tree);
        updateChatbot(data.chatbot);
        switchView('paths');
    } catch (err) {
        console.error(err);
        appendChatMessage('ai', "I encountered an error. Please try again.");
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    dom.generateBtn.classList.toggle('loading', isLoading);
    dom.generateBtn.disabled = isLoading;
}

function handleNodeClick(node) {
    state.selectedNode = node;
    updateActiveNodeUI(node);
    toggleInfoPanel(true);
}

function updateActiveNodeUI(node) {
    if (!node) {
        dom.nodeDetails.classList.remove('hidden');
        dom.activeNodeContent.classList.add('hidden');
        return;
    }

    dom.nodeDetails.classList.add('hidden');
    dom.activeNodeContent.classList.remove('hidden');

    dom.nodeTitle.textContent = node.title || node.current_node;
    dom.nodeDesc.textContent = node.explanation || node.summary || "This node covers essential foundational concepts.";

    if (node.task) {
        document.getElementById('task-container').classList.remove('hidden');
        dom.taskContent.textContent = node.task;
        dom.quizQuestion.textContent = node.quiz || "Based on the content, what is the most important takeaway?";
        dom.quizOptions.innerHTML = '';
        const options = ["Conceptual Understanding", "Practical Application", "Syntax/Logic", "Optimization"];
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'secondary-btn full-width';
            btn.textContent = opt;
            btn.style.marginTop = '8px';
            btn.addEventListener('click', () => alert("Correct! Great job understanding this concept."));
            dom.quizOptions.appendChild(btn);
        });
    } else {
        document.getElementById('task-container').classList.add('hidden');
    }
}

// --- Chat Functions ---
async function sendChatMessage() {
    const message = dom.chatInput.value.trim();
    if (!message) return;

    appendChatMessage('user', message);
    dom.chatInput.value = '';

    try {
        const response = await fetch(`${CONFIG.API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                topic: state.currentTopic,
                level: dom.userLevel.value,
                node_context: state.selectedNode ? state.selectedNode.title : "root"
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        appendChatMessage('ai', data.response);
    } catch (err) {
        appendChatMessage('ai', "I'm having trouble connecting to my neural core. Please try again.");
    }
}

function appendChatMessage(type, text) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = text;
    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function updateChatbot(cb) {
    if (!cb) return;
    if (cb.message) appendChatMessage('ai', cb.message);

    dom.suggestedPrompts.innerHTML = '';
    if (cb.actions) {
        cb.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'secondary-btn';
            btn.style.fontSize = '0.75rem';
            btn.style.padding = '6px 12px';
            btn.textContent = action;
            btn.addEventListener('click', () => {
                dom.chatInput.value = action;
                sendChatMessage();
            });
            dom.suggestedPrompts.appendChild(btn);
        });
    }
}

// Start the app
init();
