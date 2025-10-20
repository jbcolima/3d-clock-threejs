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
const textGroup = new THREE.Group();
scene.add(textGroup);

// Use bundled helvetiker_regular.typeface.json from three/examples - we assume node_modules is present
loader.load('./node_modules/three/examples/fonts/helvetiker_regular.typeface.json', (fnt) => {
  font = fnt;
  createTextMeshes(new Date());
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

  const textMaterial = new THREE.MeshStandardMaterial({ color: 0xe5f6ff, metalness: 0.1, roughness: 0.4 });
  const dateMaterial = new THREE.MeshStandardMaterial({ color: 0xcfeeff, metalness: 0.05, roughness: 0.6 });

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
  dateMesh = new THREE.Mesh(dateGeo, dateMaterial);
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
