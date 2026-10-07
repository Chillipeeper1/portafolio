import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;

function lerpStops(stops, t) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return new THREE.Color(c0).lerp(new THREE.Color(c1), (t - t0) / (t1 - t0 || 1));
    }
  }
  return new THREE.Color(stops[stops.length - 1][1]);
}

function paintVertices(geo, fn) {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// Tubo cónico siguiendo una curva (sombrero doblado)
function taperedTube(curve, r0, r1, tubular = 48, radial = 28) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const verts = [], idx = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const p = curve.getPointAt(t);
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 1.3));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a))
        .addScaledVector(frames.binormals[i], Math.sin(a));
      verts.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createMaga(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.4, 11.8);
  camera.lookAt(0, 0.2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Luces
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7fb0, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fb8ff, 1.2);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, ...opts });
  const add = (parent, geo, mat, pos = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const blackMat = std({ color: 0x0a0a0d, roughness: 0.6 });
  const blueMat = std({ color: 0x3d4ec4, roughness: 0.5 });

  const maga = new THREE.Group();
  scene.add(maga);

  // --- Capa rosa con degradado, ondea detrás ---
  const capeStops = [
    [0, '#e9ea7d'], [0.26, '#e99f7d'], [0.52, '#e95b7d'], [0.74, '#e9297d'], [0.91, '#e90b7d'], [1, '#e9007d'],
  ];
  const SEG_U = 10, SEG_V = 24;
  const capeGeo = new THREE.PlaneGeometry(1, 1, SEG_U, SEG_V);
  const capeBase = [];
  {
    const pos = capeGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) * 2;           // -1..1
      const v = 0.5 - pos.getY(i);          // 0 arriba .. 1 abajo
      const half = 0.55 + v * 0.95;
      const x = u * half, y = 0.75 - v * 3.0;
      capeBase.push([x, y, u, v]);
      pos.setXYZ(i, x, y, -0.55);
      const c = lerpStops(capeStops, v);
      col.set([c.r, c.g, c.b], i * 3);
    }
    capeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const cape = add(maga, capeGeo, std({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  cape.castShadow = false;

  // --- Piernas y pies ---
  const legs = [-1, 1].map((s) => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.33, -1.0, 0);
    add(leg, new THREE.CapsuleGeometry(0.14, 0.9, 8, 16), blackMat, [0, -0.6, 0]);
    const foot = add(leg, new THREE.SphereGeometry(1, 24, 16), blackMat, [0, -1.3, 0.12]);
    foot.scale.set(0.26, 0.15, 0.42);
    maga.add(leg);
    return leg;
  });

  // --- Túnica azul (lathe aplanada) ---
  const robeProfile = [
    [0.01, 0.8], [0.4, 0.78], [0.58, 0.55], [0.62, 0.2], [0.72, -0.4], [0.92, -1.1], [0.01, -1.1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const robeGeo = new THREE.LatheGeometry(robeProfile, 48);
  const bodyStops = [[0, '#3d4ec4'], [1, '#1cb3f5']];
  paintVertices(robeGeo, (x, y) => lerpStops(bodyStops, (0.8 - y) / 1.9 + x * 0.1));
  const torso = new THREE.Group();
  maga.add(torso);
  const robe = add(torso, robeGeo, std({ vertexColors: true }));
  robe.scale.z = 0.72;
  // Cinturón + hebilla
  const belt = add(torso, new THREE.TorusGeometry(0.64, 0.05, 12, 48), std({ color: 0xede0fb }), [0, 0.02, 0]);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1, 0.72, 1);
  add(torso, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24).rotateX(Math.PI / 2), std({ color: 0xc9c9c9 }), [0, 0.02, 0.5]);

  // --- Brazos ---
  const arms = [-1, 1].map((s) => {
    const arm = new THREE.Group();
    arm.position.set(s * 0.62, 0.5, 0);
    add(arm, new THREE.SphereGeometry(0.2, 20, 16), blueMat);
    const sleeve = add(arm, new THREE.CapsuleGeometry(0.17, 0.75, 8, 16), blueMat, [s * 0.04, -0.5, 0]);
    sleeve.rotation.z = s * 0.05;
    add(arm, new THREE.SphereGeometry(0.17, 20, 16), blackMat, [s * 0.08, -1.05, 0]);
    arm.rotation.z = s * 0.12;
    torso.add(arm);
    return arm;
  });

  // --- Cabeza + sombrero (todo rota hacia el cursor) ---
  const headR = 0.8;
  const head = new THREE.Group();
  head.position.set(0, 1.35, 0);
  maga.add(head);
  add(head, new THREE.SphereGeometry(headR, 48, 32, 0, Math.PI * 2, 1.0, Math.PI - 1.0), blackMat);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  [[-0.3, -0.18, -0.5], [0.3, -0.18, 0.5]].forEach(([dx, dy, tilt]) => {
    const dz = Math.sqrt(headR ** 2 - dx ** 2 - dy ** 2);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), eyeMat);
    eye.position.set(dx, dy, dz - 0.01);
    eye.lookAt(new THREE.Vector3(dx * 3, dy * 3, dz * 3));
    eye.rotateZ(tilt);
    head.add(eye);
    eyes.push(eye);
  });

  const hat = new THREE.Group();
  hat.position.set(0, 0.3, 0);
  hat.scale.setScalar(0.88);
  head.add(hat);
  const brim = add(hat, new THREE.CylinderGeometry(1, 1, 0.08, 64), blueMat);
  brim.scale.set(1.85, 1, 1.05);
  brim.rotation.x = 0.32;
  const brimRim = add(hat, new THREE.TorusGeometry(1, 0.045, 12, 64), blueMat);
  brimRim.rotation.x = Math.PI / 2 + 0.32;
  brimRim.scale.set(1.85, 1.05, 1);
  const coneStops = [[0, '#1cb3f5'], [1, '#3a58c9']];
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, -0.35, 0),
    new THREE.Vector3(-0.15, 0.45, 0),
    new THREE.Vector3(0.0, 1.15, 0),
    new THREE.Vector3(0.55, 1.5, 0),
    new THREE.Vector3(1.35, 1.35, 0),
  ]);
  const coneGeo = taperedTube(curve, 1.0, 0.03);
  paintVertices(coneGeo, (x) => lerpStops(coneStops, (x + 0.9) / 2.2));
  const hatTop = add(hat, coneGeo, std({ vertexColors: true, roughness: 0.45 }));

  // --- Estrella flotante ---
  const star = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? 0.085 : 0.2;
      s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
    g.translate(0, 0, -0.03);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffac33, emissive: 0xffac33, emissiveIntensity: 0.5, roughness: 0.4 }));
    m.castShadow = true;
    scene.add(m);
    return m;
  })();

  // Sombra en el suelo
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.58;
  ground.receiveShadow = true;
  scene.add(ground);
  maga.position.y = 0;

  // --- Cursor ---
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
  });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = 0; });

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const clock = new THREE.Clock();
  const ease = (cur, target, k) => cur + (target - cur) * k;
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();

    // Seguir el cursor: la cabeza gira más, el cuerpo la acompaña
    head.rotation.y = ease(head.rotation.y, clamp(mouse.x * 1.0, -0.9, 0.9), 0.1);
    head.rotation.x = ease(head.rotation.x, clamp(mouse.y * 0.5, -0.4, 0.4), 0.1);
    maga.rotation.y = ease(maga.rotation.y, mouse.x * 0.45, 0.05);
    torso.rotation.y = ease(torso.rotation.y, mouse.x * 0.1, 0.05);

    // Respiración y balanceo de brazos
    const breathe = Math.sin(t * 1.8);
    torso.scale.set(1 + breathe * 0.008, 1 + breathe * 0.012, 1);
    head.position.y = 1.35 + breathe * 0.015;
    arms[0].rotation.z = -0.12 - Math.sin(t * 1.8) * 0.02 - Math.max(0, -mouse.x) * 0.1;
    arms[1].rotation.z = 0.12 + Math.sin(t * 1.8) * 0.02 + Math.max(0, mouse.x) * 0.1;
    hat.rotation.z = Math.sin(t * 1.2) * 0.02;
    hatTop.rotation.z = Math.sin(t * 1.6) * 0.03;

    // Capa ondeando
    const pos = capeGeo.attributes.position;
    for (let i = 0; i < capeBase.length; i++) {
      const [x, y, u, v] = capeBase[i];
      pos.setZ(i, -0.55 - v * 0.05 + Math.sin(t * 1.6 + v * 4 + u * 2) * 0.1 * v);
      pos.setX(i, x + Math.sin(t * 1.2 + v * 3) * 0.04 * v);
    }
    pos.needsUpdate = true;
    capeGeo.computeVertexNormals();

    // Estrella orbitando junto al sombrero
    star.position.set(1.7 + Math.sin(t * 0.8) * 0.1, 2.3 + Math.sin(t * 2) * 0.08, 0.2);
    star.rotation.y = t * 1.5;
    star.rotation.z = Math.sin(t * 1.2) * 0.2;
    star.scale.setScalar(1 + Math.sin(t * 3) * 0.12);

    // Parpadeo
    const blink = (t % 4) < 0.12 ? 0.1 : 1;
    eyes.forEach((e) => (e.scale.y = blink));

    renderer.render(scene, camera);
  });
}
