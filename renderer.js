// renderer.js
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080808);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// ground for shadow catch (subtle)
const groundMat = new THREE.ShadowMaterial({ opacity: 0.12 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.6;
ground.receiveShadow = true;
scene.add(ground);

// We'll render the time and date as real 3D extruded text using Helvetiker font
const fillLight = new THREE.PointLight(0x88aaff, 0.6, 20);
fillLight.position.set(-6, 2, 6);
scene.add(fillLight);

// OrbitControls for zoom/rotate/pan
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 30;

// Font loading and text objects
const loader = new FontLoader();
let font = null;
let timeMesh = null;
let dateMesh = null;
// persistent materials so textures/colors persist across text recreations
const timeMaterial = new THREE.MeshStandardMaterial({ color: 0xe5f6ff, metalness: 0.1, roughness: 0.4 });
const dateMaterial = new THREE.MeshStandardMaterial({ color: 0xcfeeff, metalness: 0.05, roughness: 0.6 });
let timeTexture = null;
let dateTexture = null;
const textGroup = new THREE.Group();
scene.add(textGroup);

// Use bundled helvetiker_regular.typeface.json from three/examples - we assume node_modules is present
loader.load('./node_modules/three/examples/fonts/helvetiker_regular.typeface.json', (fnt) => {
  font = fnt;
  createTextMeshes(new Date());
});

// UI elements
const timeColorInput = document.getElementById('time-color');
const dateColorInput = document.getElementById('date-color');
const timeTextureInput = document.getElementById('time-texture');
const dateTextureInput = document.getElementById('date-texture');
const timeUseTexture = document.getElementById('time-use-texture');
const dateUseTexture = document.getElementById('date-use-texture');
const bgColorInput = document.getElementById('bg-color');
const bgImageInput = document.getElementById('bg-image');
const bgUseImage = document.getElementById('bg-use-image');
const bgOpacity = document.getElementById('bg-opacity');
const fontSelect = document.getElementById('font-select');
const uiPanel = document.getElementById('ui');

// Add a button to toggle UI visibility if not present
let toggleUI = document.getElementById('toggle-ui');
if (!toggleUI && uiPanel) {
  toggleUI = document.createElement('button');
  toggleUI.id = 'toggle-ui';
  toggleUI.textContent = 'Hide UI';
  toggleUI.style.position = 'absolute';
  toggleUI.style.top = '10px';
  toggleUI.style.right = '10px';
  toggleUI.style.zIndex = 1000;
  document.body.appendChild(toggleUI);
}
if (toggleUI && uiPanel) {
  toggleUI.addEventListener('click', () => {
    const isHidden = uiPanel.classList.toggle('hidden');
    toggleUI.textContent = isHidden ? 'Show UI' : 'Hide UI';
  });
}

// helpers
function applyTimeColor(hex) {
  timeMaterial.map = null;
  if (timeTexture) {
    timeTexture.dispose();
    timeTexture = null;
  }
  timeMaterial.color.set(hex);
  timeMaterial.needsUpdate = true;
}

function applyDateColor(hex) {
  dateMaterial.map = null;
  if (dateTexture) {
    dateTexture.dispose();
    dateTexture = null;
  }
  dateMaterial.color.set(hex);
  dateMaterial.needsUpdate = true;
}

function loadTextureFromFile(file, cb) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const loader = new THREE.TextureLoader();
    loader.load(dataUrl, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      cb(null, tex);
    }, undefined, (err) => cb(err));
  };
  reader.readAsDataURL(file);
}

// background handling
let bgTexture = null;
let currentBgColor = new THREE.Color(0x080808);
let lastBgOpacity = 1;

function applyBackgroundColor(hex) {
  if (bgTexture) {
    bgTexture.dispose();
    bgTexture = null;
  }
  currentBgColor.set(hex);
  scene.background = currentBgColor;
}

bgColorInput.addEventListener('input', (e) => {
  applyBackgroundColor(e.target.value);
});

bgImageInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  loadTextureFromFile(f, (err, tex) => {
    if (err) return console.error('Background texture load failed', err);
    if (bgTexture) bgTexture.dispose();
    bgTexture = tex;
    if (bgUseImage.checked) {
      scene.background = bgTexture;
    }
  });
});

bgUseImage.addEventListener('change', (e) => {
  if (e.target.checked && bgTexture) {
    scene.background = bgTexture;
  } else {
    // fallback to color input
    scene.background = new THREE.Color(bgColorInput.value);
  }
});

// font selection
const builtinFonts = {
  helvetiker: './node_modules/three/examples/fonts/helvetiker_regular.typeface.json',
  optimer: './node_modules/three/examples/fonts/optimer_regular.typeface.json',
  gentilis: './node_modules/three/examples/fonts/gentilis_regular.typeface.json',
  droid: './node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json'
};

function loadFontFromPath(path, cb) {
  loader.load(path, (f) => cb(null, f), undefined, (err) => cb(err));
}

fontSelect.addEventListener('change', (e) => {
  const key = e.target.value;
  const path = builtinFonts[key];
  if (!path) return;
  loadFontFromPath(path, (err, f) => {
    if (err) return console.error('Font load error', err);
    font = f;
    createTextMeshes(new Date());
  });
});

timeColorInput.addEventListener('input', (e) => applyTimeColor(e.target.value));
dateColorInput.addEventListener('input', (e) => applyDateColor(e.target.value));

timeTextureInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  loadTextureFromFile(f, (err, tex) => {
    if (err) return console.error('Texture load failed', err);
    if (timeTexture) timeTexture.dispose();
    timeTexture = tex;
    if (timeUseTexture.checked) {
      timeMaterial.map = timeTexture;
      timeMaterial.color.setHex(0xffffff);
      timeMaterial.needsUpdate = true;
    }
  });
});

dateTextureInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  loadTextureFromFile(f, (err, tex) => {
    if (err) return console.error('Texture load failed', err);
    if (dateTexture) dateTexture.dispose();
    dateTexture = tex;
    if (dateUseTexture.checked) {
      dateMaterial.map = dateTexture;
      dateMaterial.color.setHex(0xffffff);
      dateMaterial.needsUpdate = true;
    }
  });
});

timeUseTexture.addEventListener('change', (e) => {
  if (e.target.checked && timeTexture) {
    timeMaterial.map = timeTexture;
    timeMaterial.color.setHex(0xffffff);
  } else {
    timeMaterial.map = null;
    // keep current color from color picker
    timeMaterial.color.set(timeColorInput.value);
  }
  timeMaterial.needsUpdate = true;
});

dateUseTexture.addEventListener('change', (e) => {
  if (e.target.checked && dateTexture) {
    dateMaterial.map = dateTexture;
    dateMaterial.color.setHex(0xffffff);
  } else {
    dateMaterial.map = null;
    dateMaterial.color.set(dateColorInput.value);
  }
  dateMaterial.needsUpdate = true;
});

function createTextMeshes(date) {
  // cleanup previous
  if (timeMesh) {
    timeMesh.geometry.dispose();
    timeMesh.material.dispose();
    textGroup.remove(timeMesh);
    timeMesh = null;
  }
  if (dateMesh) {
    dateMesh.geometry.dispose();
    dateMesh.material.dispose();
    textGroup.remove(dateMesh);
    dateMesh = null;
  }

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = date.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  // use persistent materials; geometry will be recreated but materials remain
  const textMaterial = timeMaterial;
  const dMaterial = dateMaterial;

  // time geometry (larger)
  const timeGeo = new TextGeometry(timeStr, {
    font: font,
    size: 0.9,
    height: 0.08,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelOffset: 0,
    bevelSegments: 3
  });
  timeGeo.computeBoundingBox();
  const timeWidth = timeGeo.boundingBox.max.x - timeGeo.boundingBox.min.x;
  timeGeo.translate(-timeWidth / 2, 0.15, 0);
  timeMesh = new THREE.Mesh(timeGeo, textMaterial);
  timeMesh.castShadow = true;
  timeMesh.receiveShadow = true;
  textGroup.add(timeMesh);

  // date geometry (smaller, below)
  const dateGeo = new TextGeometry(dateStr, {
    font: font,
    size: 0.35,
    height: 0.06,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelOffset: 0,
    bevelSegments: 2
  });
  dateGeo.computeBoundingBox();
  const dateWidth = dateGeo.boundingBox.max.x - dateGeo.boundingBox.min.x;
  dateGeo.translate(-dateWidth / 2, -0.6, 0);
  dateMesh = new THREE.Mesh(dateGeo, dMaterial);
  dateMesh.castShadow = true;
  dateMesh.receiveShadow = true;
  textGroup.add(dateMesh);

  // subtle tilt to match previous aesthetic
  timeMesh.rotation.x = -0.05;
  timeMesh.rotation.y = 0.03;
  dateMesh.rotation.x = -0.05;
  dateMesh.rotation.y = 0.03;
}

let rotate = true;
document.getElementById('toggle-rotate').addEventListener('click', () => rotate = !rotate);
const shadowCheckbox = document.getElementById('shadow');
shadowCheckbox.addEventListener('change', (e) => renderer.shadowMap.enabled = e.target.checked);

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// update loop: recreate 3D text each second
let lastSecond = -1;
function updateClock() {
  const now = new Date();
  const sec = now.getSeconds();
  if (sec !== lastSecond) {
    lastSecond = sec;
    if (font) createTextMeshes(now);
  }
}

// animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  updateClock();

  const t = clock.getElapsedTime();
  if (rotate) {
    textGroup.rotation.z = Math.sin(t * 0.3) * 0.08;
    textGroup.rotation.y = Math.sin(t * 0.15) * 0.12;
    textGroup.position.x = Math.sin(t * 0.12) * 0.08;
  }

  // subtle camera bob
  camera.position.x = Math.sin(t * 0.07) * 0.2;
  camera.position.y = Math.sin(t * 0.05) * 0.06;
  camera.lookAt(0, 0, 0);

  controls.update();
  renderer.render(scene, camera);
}
animate();
