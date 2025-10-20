// renderer.js
import * as THREE from 'three';

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

// Create a canvas2D to draw time + date
const canvas = document.createElement('canvas');
// choose a texture size that keeps crisp text
canvas.width = 2048;
canvas.height = 512;
const ctx = canvas.getContext('2d');

function drawTimeToCanvas(date = new Date()) {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background gradient
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, '#0f1724');
  g.addColorStop(1, '#071126');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // build time + date strings
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = date.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  // shadow + text styles
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw big time
  ctx.font = 'bold 160px system-ui, -apple-system, "Segoe UI", Roboto';
  ctx.fillStyle = '#e5f6ff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 30;
  ctx.fillText(timeStr, canvas.width / 2, canvas.height / 2 - 30);

  // Draw smaller date
  ctx.font = '36px system-ui, -apple-system, "Segoe UI", Roboto';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#cfeeff';
  ctx.fillText(dateStr, canvas.width / 2, canvas.height / 2 + 80);

  // small subtle gloss
  const gloss = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gloss.addColorStop(0, 'rgba(255,255,255,0.06)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// initial draw
drawTimeToCanvas(new Date());

// Create a texture from the canvas
const texture = new THREE.CanvasTexture(canvas);
texture.needsUpdate = true;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.anisotropy = 4;

// Create a slightly extruded-looking object: use a plane for the face and small box for the depth
const planeGeo = new THREE.PlaneGeometry(6, 1.5);
const planeMat = new THREE.MeshStandardMaterial({
  map: texture,
  metalness: 0.1,
  roughness: 0.6,
  side: THREE.FrontSide
});
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.castShadow = true;
planeMesh.position.y = 0;
scene.add(planeMesh);

// Add a thin backing to emulate thickness (a thin box)
const depth = 0.15;
const backMat = new THREE.MeshStandardMaterial({ color: 0x071428, metalness: 0.2, roughness: 0.8 });
const backGeo = new THREE.BoxGeometry(6, 1.5, depth);
const backMesh = new THREE.Mesh(backGeo, backMat);
backMesh.position.z = -depth/2 - 0.01;
backMesh.castShadow = true;
planeMesh.add(backMesh);

// subtle bevel (a rounded edge look is harder without geometry libraries; this is a simple illusion)
planeMesh.rotation.x = -0.05;
planeMesh.rotation.y = 0.03;

// Ambient fill for more 3D look
const fillLight = new THREE.PointLight(0x88aaff, 0.6, 20);
fillLight.position.set(-6, 2, 6);
scene.add(fillLight);

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

// update loop: update canvas every second
let lastSecond = -1;
function updateClock() {
  const now = new Date();
  const sec = now.getSeconds();
  if (sec !== lastSecond) {
    lastSecond = sec;
    drawTimeToCanvas(now);
    texture.needsUpdate = true;
  }
}

// animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  updateClock();

  const t = clock.getElapsedTime();
  if (rotate) {
    planeMesh.rotation.z = Math.sin(t * 0.3) * 0.08;
    planeMesh.rotation.y = Math.sin(t * 0.15) * 0.12;
    planeMesh.position.x = Math.sin(t * 0.12) * 0.08;
  }

  // subtle camera bob
  camera.position.x = Math.sin(t * 0.07) * 0.2;
  camera.position.y = Math.sin(t * 0.05) * 0.06;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
animate();
