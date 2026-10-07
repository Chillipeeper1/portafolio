import * as THREE from 'three';
import { createPixelScreen, MENU_ITEMS } from './pixelScreen.js';
import { FACTS } from './facts.js';
import { PROJECTS } from './projects.js';

export function createRobot(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.9, 11.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Luces
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x1a1c24, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fc3ff, 2);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  // Materiales
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.8, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262f, metalness: 0.6, roughness: 0.5 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xff6b3d, metalness: 0.4, roughness: 0.4 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0a2a33, emissive: 0x1fb5d6, emissiveIntensity: 0.6, roughness: 0.2,
  });

  const mesh = (geo, mat, pos = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const rbox = (w, h, d, r = 0.08) => {
    // caja con bordes redondeados vía extrusión
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 0.1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 });
    g.translate(0, 0, -(d - 0.1) / 2);
    return g;
  };

  const robot = new THREE.Group();
  scene.add(robot);

  // Torso
  const torso = mesh(rbox(1.6, 1.7, 1.0, 0.2), metal, [0, 0, 0]);
  robot.add(torso);
  const chest = mesh(rbox(0.7, 0.5, 0.1, 0.1), dark, [0, 0.2, 0.55]);
  torso.add(chest);
  const light = mesh(new THREE.SphereGeometry(0.09, 16, 16), accent, [0, 0.2, 0.62]);
  light.material = new THREE.MeshStandardMaterial({ color: 0xff6b3d, emissive: 0xff6b3d, emissiveIntensity: 1.2 });
  torso.add(light);
  torso.add(mesh(rbox(1.2, 0.18, 0.1, 0.05), dark, [0, -0.45, 0.55]));

  // Cuello
  const neck = mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 24), dark, [0, 1.0, 0]);
  robot.add(neck);

  // Cabeza TV
  const head = new THREE.Group();
  head.position.set(0, 2.05, 0);
  robot.add(head);
  head.add(mesh(rbox(2.0, 1.6, 1.3, 0.25), dark));
  head.add(mesh(rbox(1.75, 1.35, 0.1, 0.2), metal, [0, 0, 0.62]));
  const pixelScreen = createPixelScreen();
  const screen = mesh(new THREE.PlaneGeometry(1.55, 1.15), new THREE.MeshBasicMaterial({ map: pixelScreen.texture }), [0, 0, 0.72]);
  screen.castShadow = false;
  head.add(screen);
  // Antena
  head.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), metal, [0.5, 1.05, 0]));
  const bulb = mesh(new THREE.SphereGeometry(0.1, 16, 16), accent, [0.5, 1.33, 0]);
  bulb.material = new THREE.MeshStandardMaterial({ color: 0xff6b3d, emissive: 0xff6b3d, emissiveIntensity: 1 });
  head.add(bulb);
  // Orejas
  head.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 24).rotateZ(Math.PI / 2), metal, [-1.1, 0, 0]));
  head.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 24).rotateZ(Math.PI / 2), metal, [1.1, 0, 0]));

  // Brazos
  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 1.1, 0.55, 0);
    arm.add(mesh(new THREE.SphereGeometry(0.28, 20, 20), dark));
    arm.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 20), metal, [side * 0.1, -0.6, 0]));
    arm.add(mesh(new THREE.SphereGeometry(0.22, 20, 20), accent, [side * 0.1, -1.2, 0]));
    robot.add(arm);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Piernas
  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.45, -1.0, 0);
    leg.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 20), metal, [0, -0.3, 0]));
    leg.add(mesh(rbox(0.6, 0.3, 0.9, 0.1), dark, [0, -0.8, 0.12]));
    robot.add(leg);
    return leg;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Suelo: la planta de los pies está en y = -1.8
  const FLOOR_Y = -1.8;
  const radial = (stops, size = 256) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const flat = (mesh, y) => { mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; scene.add(mesh); return mesh; };
  // plataforma tenue que difumina hacia el fondo
  flat(new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({
      map: radial([[0, 'rgba(60,80,110,0.55)'], [0.5, 'rgba(35,48,70,0.3)'], [1, 'rgba(11,13,18,0)']]),
      transparent: true, depthWrite: false,
    }),
  ), FLOOR_Y - 0.01);
  // sombra de contacto suave bajo los pies
  const contact = flat(new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: radial([[0, 'rgba(0,0,0,0.75)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false,
    }),
  ), FLOOR_Y + 0.005);
  contact.position.z = 0.1;
  // sombra proyectada por las luces
  const ground = flat(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.4 })), FLOOR_Y + 0.01);
  ground.receiveShadow = true;

  robot.position.y = 0.2;

  // Interacción: la cabeza sigue el mouse
  const mouseTarget = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    mouseTarget.x = (e.clientX / innerWidth) * 2 - 1;
    mouseTarget.y = (e.clientY / innerHeight) * 2 - 1;
  });

  // --- Zoom + menú ---
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const cam = {
    pos: new THREE.Vector3(0, 0.9, 11.5), look: new THREE.Vector3(0, 0.8, 0),
  };
  const camHome = { pos: new THREE.Vector3(0, 0.9, 11.5), look: new THREE.Vector3(0, 0.8, 0) };
  const camZoom = { pos: new THREE.Vector3(0, 2.3, 4.0), look: new THREE.Vector3(0, 2.3, 0.8) };
  let zoomed = false;

  const setPointer = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };
  const screenHit = () => {
    const hit = raycaster.intersectObject(screen)[0];
    return hit ? { x: hit.uv.x * pixelScreen.size.W, y: (1 - hit.uv.y) * pixelScreen.size.H } : null;
  };
  function setZoom(on) {
    zoomed = on;
    pixelScreen.setMode(on ? 'menu' : 'face');
    document.body.classList.toggle('zoomed', on);
  }

  renderer.domElement.addEventListener('pointermove', (e) => {
    setPointer(e);
    if (zoomed) {
      const p = screenHit();
      const idx = p ? pixelScreen.hitTest(p.x, p.y) : -1;
      pixelScreen.state.hover = idx;
      renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : zoomed ? 'zoom-out' : '';
    } else {
      renderer.domElement.style.cursor = raycaster.intersectObject(robot, true).length ? 'pointer' : '';
    }
  });
  renderer.domElement.addEventListener('click', (e) => {
    setPointer(e);
    if (!zoomed) {
      if (raycaster.intersectObject(robot, true).length) setZoom(true);
      return;
    }
    const p = screenHit();
    const idx = p ? pixelScreen.hitTest(p.x, p.y) : -1;
    const { mode } = pixelScreen.state;
    if (!p) { setZoom(false); return; } // clic fuera de la pantalla: salir
    if (mode === 'menu' && idx >= 0) {
      const { key } = MENU_ITEMS[idx];
      if (key === 'proyectos') pixelScreen.setMode('projects');
      else pixelScreen.setMode('page', key);
    } else if (mode === 'page' && idx === 100) {
      pixelScreen.setMode('menu');
    } else if (mode === 'projects') {
      if (idx === 100) pixelScreen.setMode('menu');
      else if (idx >= 0) pixelScreen.setMode('project', null, PROJECTS[idx].key);
    } else if (mode === 'project') {
      if (idx === 100) pixelScreen.setMode('projects');
      else if (idx === 101) window.open(pixelScreen.currentProject().url, '_blank', 'noopener');
      else if (idx >= 200) pixelScreen.setTab(idx - 200);
    }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomed) setZoom(false); });

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Encuadre según la proporción de la ventana
    const k = 1 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
    camHome.pos.z = Math.max(11.5, 3.9 * k);
    camZoom.pos.z = camZoom.look.z + Math.max(3.0, 1.75 * k);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const clock = new THREE.Clock();
  let blink = 0;
  let yaw = 0;

  // Globo "¿Sabías que...?" cada 30 s, junto a la cabeza
  const bubble = document.getElementById('bubble');
  const bubbleText = bubble.querySelector('.bubble-text');
  const FACT_EVERY = 30, FACT_HOLD = 6, TYPE_SPEED = 28; // segundos, segundos, letras/s
  let nextFact = FACT_EVERY, fact = null, bag = [];
  const anchor = new THREE.Vector3();
  const toScreen = (dx) => {
    head.getWorldPosition(anchor);
    anchor.x += dx;
    anchor.y += 0.3;
    anchor.project(camera);
    return [(anchor.x * 0.5 + 0.5) * container.clientWidth, (-anchor.y * 0.5 + 0.5) * container.clientHeight];
  };
  function updateBubble(t) {
    if (!fact && !zoomed && t > nextFact) {
      if (!bag.length) bag = [...FACTS].sort(() => Math.random() - 0.5);
      const text = bag.pop();
      fact = { text, start: t, end: t + text.length / TYPE_SPEED + FACT_HOLD };
    }
    if (fact && (zoomed || t > fact.end)) {
      fact = null;
      nextFact = t + FACT_EVERY;
      bubble.classList.remove('show');
      return;
    }
    if (!fact) return;
    const n = Math.min(fact.text.length, Math.floor((t - fact.start) * TYPE_SPEED));
    bubbleText.innerHTML = '';
    bubbleText.append(fact.text.slice(0, n));
    const ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.textContent = fact.text.slice(n);
    bubbleText.append(ghost);

    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const W = container.clientWidth, H = container.clientHeight;
    let [x, y] = toScreen(1.6);
    const flip = x + w + 24 > W;
    if (flip) [x, y] = toScreen(-1.6);
    const fitsSide = flip ? x - w - 14 >= 8 : true;
    // En pantallas angostas no cabe al lado: se ancla abajo, centrado
    const dock = !fitsSide;
    bubble.classList.toggle('flip', flip && !dock);
    bubble.classList.toggle('dock', dock);
    const px = dock ? (W - w) / 2 : flip ? x - w - 14 : x + 14;
    const py = dock ? H - h - 20 : Math.min(Math.max(8, y - h / 2), H - h - 8);
    bubble.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)`;
    bubble.classList.add('show');
  }

  // Acciones esporádicas: caminar o bailar cada 20-25 s
  const ACTIONS = { walk: 8, dance: 6.5 };
  let action = null, env = 0, nextAction = 20 + Math.random() * 5, lastType = null;
  const mix = (a, b) => a + (b - a) * env;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (x) => x * x * (3 - 2 * x);
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    const mx = zoomed ? 0 : mouseTarget.x, my = zoomed ? 0 : mouseTarget.y;
    head.rotation.y += (mx * 0.6 - head.rotation.y) * 0.08;
    head.rotation.x += (my * 0.3 - head.rotation.x) * 0.08;
    yaw += (mx * 0.25 - yaw) * 0.04;
    // Cámara: zoom suave hacia la cara
    const target = zoomed ? camZoom : camHome;
    cam.pos.lerp(target.pos, 0.07);
    cam.look.lerp(target.look, 0.07);
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
    let armLz = Math.sin(t * 1.5) * 0.06 + 0.05;
    let armRz = -Math.sin(t * 1.5) * 0.06 - 0.05;
    let armLx = 0, armRx = 0, legLx = 0, legRx = 0;
    let offX = 0, offY = 0, extraYaw = 0, tiltZ = 0, headZ = 0;

    // Planificador de acciones
    if (!action && !zoomed && t > nextAction) {
      const type = lastType === 'walk' ? 'dance' : lastType === 'dance' ? 'walk' : (Math.random() < 0.5 ? 'walk' : 'dance');
      action = { type, t0: t, dur: ACTIONS[type], ending: false };
      lastType = type;
      pixelScreen.setOverride('happy');
    }
    if (action && !action.ending && (zoomed || t - action.t0 > action.dur)) action.ending = true;
    env += ((action && !action.ending ? 1 : 0) - env) * 0.07;
    if (action && action.ending && env < 0.01) {
      action = null;
      env = 0;
      nextAction = t + 20 + Math.random() * 5;
      pixelScreen.setOverride(null);
    }

    if (action) {
      const tau = Math.min(1, (t - action.t0) / action.dur);
      if (action.type === 'walk') {
        // camina a la derecha y regresa, mirando hacia donde va
        const ph = t * 7;
        offX = 1.8 * Math.sin(Math.PI * tau);
        extraYaw = 0.75 * Math.tanh(5 * Math.cos(Math.PI * tau));
        legLx = Math.sin(ph) * 0.55;
        legRx = -Math.sin(ph) * 0.55;
        armLx = -Math.sin(ph) * 0.5;
        armRx = Math.sin(ph) * 0.5;
        offY = Math.abs(Math.sin(ph)) * 0.05;
        tiltZ = Math.sin(ph) * 0.02;
      } else {
        // baila: rebota, brazos arriba alternados, patadas, giro
        const q = t * 4.2;
        offY = Math.abs(Math.sin(q)) * 0.18;
        armLz = -(1.5 + 0.7 * Math.sin(q));
        armRz = 1.5 - 0.7 * Math.sin(q);
        legLx = Math.max(0, Math.sin(q)) * 0.6;
        legRx = Math.max(0, -Math.sin(q)) * 0.6;
        tiltZ = Math.sin(q) * 0.07;
        headZ = Math.sin(q) * 0.25;
        extraYaw = Math.PI * 2 * smooth(clamp01((tau - 0.45) / 0.3));
      }
    }
    robot.rotation.y = yaw + extraYaw * env;
    robot.rotation.z = tiltZ * env;
    robot.position.x = offX * env;
    robot.position.y = 0.2 + offY * env;
    contact.position.x = robot.position.x;
    head.rotation.z = headZ * env;
    armL.rotation.z = mix(Math.sin(t * 1.5) * 0.06 + 0.05, armLz);
    armR.rotation.z = mix(-Math.sin(t * 1.5) * 0.06 - 0.05, armRz);
    armL.rotation.x = armLx * env;
    armR.rotation.x = armRx * env;
    legL.rotation.x = legLx * env;
    legR.rotation.x = legRx * env;
    bulb.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.4;
    // parpadeo
    blink = (t % 4) < 0.12 ? 0.1 : 1;
    pixelScreen.draw(t, blink);
    updateBubble(t);
    renderer.render(scene, camera);
  });
}
