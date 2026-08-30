import * as THREE from "three";

/* ============================================================
   Starship (upper stage) — modelo procedural a escala 1:1
   1 unidad = 1 metro · eje Y = eje longitudinal · base y=0, punta y=50
   ============================================================ */

export interface ShipBuild {
  group: THREE.Group;
  pickables: THREE.Object3D[];
  partMats: Record<string, THREE.MeshStandardMaterial[]>;
  clipPlane: THREE.Plane;
  cutVisual: THREE.Mesh;
  anchors: { id: string; pos: THREE.Vector3 }[];
  starLayers: THREE.Points[];
  dispose: () => void;
}

const R = 4.5; // radio del fuselaje
const EMISSIVE = new THREE.Color(0xf5a524);

/* RNG determinista */
let seed = 1337;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

/* ---------- texturas procedurales ---------- */

function brushedRoughnessTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8f8f8f";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(rnd() * 256);
    const w = 1 + Math.floor(rnd() * 2);
    const light = rnd() > 0.5;
    g.fillStyle = light ? `rgba(255,255,255,${0.04 + rnd() * 0.1})` : `rgba(0,0,0,${0.04 + rnd() * 0.1})`;
    g.fillRect(x, 0, w, 256);
  }
  // bandas horizontales de soldadura (variación leve)
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = "rgba(255,255,255,0.05)";
    g.fillRect(0, y, 256, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 3);
  return t;
}

function speckleTexture(base: string, speckA: string, speckB: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() > 0.5 ? speckA : speckB;
    const s = 1 + rnd() * 2.2;
    g.globalAlpha = 0.25 + rnd() * 0.5;
    g.fillRect(rnd() * 256, rnd() * 256, s, s);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

function starSprite(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.22)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* ---------- materiales ---------- */

interface MatCtx {
  partMats: Record<string, THREE.MeshStandardMaterial[]>;
  clip: THREE.Plane[];
  brush: THREE.CanvasTexture;
}

function reg(ctx: MatCtx, part: string, m: THREE.MeshStandardMaterial) {
  m.emissive = EMISSIVE.clone();
  m.emissiveIntensity = 0;
  (ctx.partMats[part] ||= []).push(m);
  return m;
}

function steel(
  ctx: MatCtx,
  part: string,
  color: number,
  rough: number,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {}
): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.94,
    roughness: rough,
    roughnessMap: ctx.brush,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
    ...opts,
  });
  return reg(ctx, part, m);
}

/* ---------- helpers ---------- */

function strut(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  mat: THREE.Material,
  partId?: string
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(dir.length(), 0.01);
  const geo = new THREE.CylinderGeometry(r, r, len, 12);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  if (partId) mesh.userData.partId = partId;
  parent.add(mesh);
  return mesh;
}

/* ============================================================
   CONSTRUCCIÓN
   ============================================================ */

export function buildStarship(): ShipBuild {
  const group = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const partMats: Record<string, THREE.MeshStandardMaterial[]> = {};

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 5.4);
  const clip = [clipPlane];
  const brush = brushedRoughnessTexture();
  const ctx: MatCtx = { partMats, clip, brush };

  const P = (mesh: THREE.Mesh, partId: string, pick = true, shadow = true): THREE.Mesh => {
    mesh.userData.partId = partId;
    if (pick) pickables.push(mesh);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    group.add(mesh);
    return mesh;
  };

  /* ---------- materiales del modelo ---------- */
  const hullMat = steel(ctx, "fuselaje", 0xcdd3d8, 0.3);
  const noseMat = steel(ctx, "cono", 0xc9cfd5, 0.28);
  const skirtMat = steel(ctx, "raptor", 0x9aa1a9, 0.42);
  const weldMat = steel(ctx, "fuselaje", 0x7d848c, 0.55, { roughnessMap: undefined });
  const doorMat = steel(ctx, "puerta", 0xb9c0c7, 0.36);
  const doorSeamMat = steel(ctx, "puerta", 0x565c64, 0.6, { roughnessMap: undefined });
  const tileMat = reg(
    ctx,
    "escudo",
    new THREE.MeshStandardMaterial({
      color: 0x11141a,
      metalness: 0.28,
      roughness: 0.5,
      envMapIntensity: 0.65,
    })
  );
  const aftTileMat = reg(
    ctx,
    "escudo",
    new THREE.MeshStandardMaterial({
      color: 0xded9cd,
      map: speckleTexture("#d8d3c7", "#8f8a7e", "#4a4a44"),
      metalness: 0.05,
      roughness: 0.82,
      envMapIntensity: 0.35,
    })
  );
  const flapFrontMat = reg(
    ctx,
    "flaps_del",
    new THREE.MeshStandardMaterial({
      color: 0x15181e,
      metalness: 0.35,
      roughness: 0.48,
      envMapIntensity: 0.7,
      side: THREE.DoubleSide,
    })
  );
  const flapRearMat = steel(ctx, "flaps_tra", 0xb6bdc4, 0.34);
  const flapTipMat = steel(ctx, "flaps_tra", 0x22262c, 0.5, { roughnessMap: undefined });
  const strutMatF = steel(ctx, "flaps_del", 0x82898f, 0.5, { roughnessMap: undefined });
  const strutMatR = steel(ctx, "flaps_tra", 0x82898f, 0.5, { roughnessMap: undefined });
  const raptorBodyMat = steel(ctx, "raptor", 0x6e757d, 0.45, { roughnessMap: undefined });
  const nozzleSLMat = steel(ctx, "raptor", 0xaeb6bd, 0.3, { roughnessMap: undefined });
  const nozzleVacMat = steel(ctx, "raptor", 0x7b828b, 0.44, { roughnessMap: undefined });
  const innerWallMat = steel(ctx, "fuselaje", 0xa8afb6, 0.52);
  const frameMat = steel(ctx, "fuselaje", 0x8d949c, 0.5, { roughnessMap: undefined });
  const domeMat = steel(ctx, "tanques", 0xb3bac1, 0.4, { roughnessMap: undefined });
  const foamMat = reg(
    ctx,
    "tanques",
    new THREE.MeshStandardMaterial({
      color: 0xb59a6b,
      metalness: 0.0,
      roughness: 0.95,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    })
  );
  const headerMat = steel(ctx, "tanques", 0xbfc6cd, 0.3, { roughnessMap: undefined });
  const puckMat = steel(ctx, "puck", 0x79818a, 0.46, { roughnessMap: undefined });
  const puckRibMat = steel(ctx, "puck", 0x8d949c, 0.5, { roughnessMap: undefined });
  const pipeMat = steel(ctx, "lineas", 0x9aa2aa, 0.38, { roughnessMap: undefined });
  const pipeMatB = steel(ctx, "lineas", 0x9aa2aa, 0.38, { roughnessMap: undefined });

  /* ---------- casco exterior ---------- */

  // Cilindro principal (piel presurizada)
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 40.8, 96, 1, true),
    hullMat
  );
  barrel.position.y = 22.6;
  P(barrel, "fuselaje");

  // Falda de motores
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R - 0.03, 2.2, 96, 1, true),
    skirtMat
  );
  skirt.position.y = 1.1;
  P(skirt, "raptor");

  // Cono de proa (lathe con perfil de ojiva)
  const nosePts = [
    [4.5, 43.0],
    [4.4, 44.2],
    [4.1, 45.4],
    [3.6, 46.5],
    [2.9, 47.5],
    [2.1, 48.3],
    [1.25, 49.0],
    [0.55, 49.55],
    [0.08, 49.95],
  ].map(([x, y]) => new THREE.Vector2(Math.max(x, 0.01), y));
  const nose = new THREE.Mesh(new THREE.LatheGeometry(nosePts, 96), noseMat);
  P(nose, "cono");
  const tipCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    noseMat
  );
  tipCap.position.y = 49.95;
  P(tipCap, "cono");

  // Anillos exteriores: hombro, base y soldaduras orbitales
  const weldGeo = new THREE.TorusGeometry(R + 0.012, 0.022, 6, 96);
  const weldCount = 25;
  const welds = new THREE.InstancedMesh(weldGeo, weldMat, weldCount);
  welds.frustumCulled = false;
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < weldCount; i++) {
      m4.compose(new THREE.Vector3(0, 3.4 + i * 1.63, 0), q, s);
      welds.setMatrixAt(i, m4);
    }
  }
  welds.userData.partId = "fuselaje";
  pickables.push(welds);
  group.add(welds);

  const ringGeoBig = new THREE.TorusGeometry(R + 0.02, 0.035, 8, 96);
  const q90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  for (const [y, part] of [
    [43.0, "cono"],
    [2.25, "raptor"],
    [0.12, "raptor"],
  ] as [number, string][]) {
    const ring = new THREE.Mesh(ringGeoBig, part === "cono" ? noseMat : skirtMat);
    ring.position.y = y;
    ring.quaternion.copy(q90);
    P(ring, part);
  }

  /* ---------- escudo térmico: tejas hexagonales ---------- */

  function hexTiles(
    yMin: number,
    yMax: number,
    radiusOf: (y: number) => number,
    normalOf: (y: number) => { r: number; y: number },
    arcCenter: number,
    arcHalf: number,
    rT: number,
    mat: THREE.Material,
    partId: string
  ) {
    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const rowStep = 1.5 * rT;
    const base = new THREE.Color(0x11141a);
    const up = new THREE.Vector3(0, 1, 0);
    let row = 0;
    for (let y = yMin; y <= yMax; y += rowStep, row++) {
      const r = radiusOf(y);
      if (r < 0.85) continue;
      const colStep = (Math.sqrt(3) * rT) / r;
      const offset = row % 2 === 0 ? 0 : colStep / 2;
      const n2 = normalOf(y);
      const nLen = Math.hypot(n2.r, n2.y) || 1;
      const nr = n2.r / nLen;
      const ny = n2.y / nLen;
      for (let phi = arcCenter - arcHalf + offset; phi <= arcCenter + arcHalf; phi += colStep) {
        if (rnd() < 0.014) continue; // tejas faltantes (realismo de mantenimiento)
        const normal = new THREE.Vector3(nr * Math.sin(phi), ny, nr * Math.cos(phi));
        const pos = new THREE.Vector3(
          (r + 0.035) * Math.sin(phi),
          y,
          (r + 0.035) * Math.cos(phi)
        );
        const q1 = new THREE.Quaternion().setFromUnitVectors(up, normal);
        const q2 = new THREE.Quaternion().setFromAxisAngle(normal, rnd() * Math.PI * 0.6);
        dummy.position.copy(pos);
        dummy.quaternion.copy(q2.multiply(q1));
        const s = 0.94 + rnd() * 0.09;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        const c = base.clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.055);
        colors.push(c);
      }
    }
    const geo = new THREE.CylinderGeometry(rT, rT, 0.075, 6);
    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    inst.frustumCulled = false;
    matrices.forEach((m, i) => inst.setMatrixAt(i, m));
    colors.forEach((c, i) => inst.setColorAt(i, c));
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.userData.partId = partId;
    pickables.push(inst);
    group.add(inst);
    return inst;
  }

  // Tejas del barrel (lado de barlovento, −Z)
  hexTiles(
    2.5,
    42.45,
    () => 4.5,
    () => ({ r: 1, y: 0 }),
    Math.PI,
    1.75,
    0.17,
    tileMat,
    "escudo"
  );

  // Tejas del cono (misma cara, siguiendo el perfil)
  const prof = nosePts.map((p) => [p.y, p.x] as [number, number]);
  function noseR(y: number): number {
    if (y <= prof[0][0]) return prof[0][1];
    for (let i = 1; i < prof.length; i++) {
      if (y <= prof[i][0]) {
        const [y0, r0] = prof[i - 1];
        const [y1, r1] = prof[i];
        return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
    }
    return prof[prof.length - 1][1];
  }
  hexTiles(
    43.4,
    49.1,
    (y) => noseR(y),
    (y) => {
      const dy = 0.12;
      const dr = noseR(Math.min(y + dy, 50)) - noseR(Math.max(y - dy, 43));
      return { r: 2 * dy, y: -dr };
    },
    Math.PI,
    1.5,
    0.15,
    tileMat,
    "escudo"
  );

  // Escudo trasero (disco cerámico blanco bajo los motores)
  const aftShield = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.06, R - 0.06, 0.1, 64),
    aftTileMat
  );
  aftShield.position.y = 0.05;
  P(aftShield, "escudo");

  /* ---------- compuerta de carga útil (+Z, sotavento) ---------- */
  {
    const seam = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.008, R + 0.008, 6.5, 48, 1, true, -0.63, 1.26),
      doorSeamMat
    );
    seam.position.y = 39.5;
    P(seam, "puerta");
    const panel = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.02, R + 0.02, 6.2, 48, 1, true, -0.6, 1.2),
      doorMat
    );
    panel.position.y = 39.5;
    P(panel, "puerta");
    // bisagras en los bordes longitudinales
    for (const s of [-1, 1]) {
      const phi = 0.62 * s;
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6.1, 0.3), doorSeamMat);
      hinge.position.set((R + 0.06) * Math.sin(phi), 39.5, (R + 0.06) * Math.cos(phi));
      hinge.rotation.y = phi;
      P(hinge, "puerta");
      for (let i = 0; i < 4; i++) {
        const latch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), doorSeamMat);
        latch.position.set(
          (R + 0.05) * Math.sin(phi * 0.55 * s * -1),
          37.1 + i * 1.6,
          (R + 0.05) * Math.cos(phi * 0.55 * s * -1)
        );
        latch.rotation.x = Math.PI / 2;
        P(latch, "puerta", false, false);
      }
    }
  }

  /* ---------- flaps ---------- */

  function makeFlap(
    root: number,
    tip: number,
    span: number,
    thick: number,
    sweep: number,
    mat: THREE.Material,
    partId: string,
    tipMat?: THREE.Material
  ): THREE.Group {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, -root / 2);
    shape.lineTo(0, root / 2);
    shape.lineTo(span, tip / 2 - sweep);
    shape.lineTo(span, -tip / 2 - sweep);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
      steps: 1,
    });
    geo.rotateX(Math.PI / 2); // planta XZ, espesor en Y
    geo.translate(0, -thick / 2, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.partId = partId;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    if (tipMat) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.14, thick + 0.1, tip + 0.1), tipMat);
      cap.position.set(span - 0.05, -thick / 2, -sweep);
      cap.userData.partId = partId;
      g.add(cap);
    }
    return g;
  }

  for (const side of [-1, 1]) {
    // delanteros (sección de proa) — recubiertos de TPS
    const outerF = new THREE.Group();
    outerF.position.set(side * 4.32, 41.7, -0.2);
    outerF.rotation.y = side < 0 ? Math.PI : 0;
    const innerF = makeFlap(2.6, 1.3, 2.35, 0.32, 0.7, flapFrontMat, "flaps_del");
    innerF.rotation.z = -0.15;
    outerF.add(innerF);
    group.add(outerF);
    pickables.push(...outerF.children.filter((c) => (c as THREE.Mesh).isMesh));

    const a1 = new THREE.Vector3(side * 4.15, 40.15, 0.65);
    const b1 = new THREE.Vector3(side * 4.85, 41.45, 0.1);
    P(strut(group, a1, b1, 0.09, strutMatF, "flaps_del"), "flaps_del");
    const a2 = new THREE.Vector3(side * 4.15, 40.35, -1.0);
    const b2 = new THREE.Vector3(side * 4.85, 41.45, -0.55);
    P(strut(group, a2, b2, 0.07, strutMatF, "flaps_del"), "flaps_del");

    // traseros (base) — acero, controlan el descenso
    const outerR = new THREE.Group();
    outerR.position.set(side * 4.28, 3.95, -0.3);
    outerR.rotation.y = side < 0 ? Math.PI : 0;
    const innerR = makeFlap(3.7, 1.9, 3.35, 0.5, 1.15, flapRearMat, "flaps_tra", flapTipMat);
    innerR.rotation.z = -0.1;
    outerR.add(innerR);
    group.add(outerR);
    pickables.push(...outerR.children.filter((c) => (c as THREE.Mesh).isMesh));

    const a3 = new THREE.Vector3(side * 4.1, 2.3, 0.85);
    const b3 = new THREE.Vector3(side * 5.1, 3.8, 0.35);
    P(strut(group, a3, b3, 0.13, strutMatR, "flaps_tra"), "flaps_tra");
  }

  /* ---------- motores Raptor (3 SL + 3 RVac) ---------- */

  function makeRaptor(vac: boolean): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.4, 0.78), raptorBodyMat);
    body.position.y = -0.1;
    g.add(body);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.8, 20), raptorBodyMat);
    pump.position.set(0.42, -0.15, 0.18);
    pump.rotation.z = 0.4;
    g.add(pump);
    const pump2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.65, 20), raptorBodyMat);
    pump2.position.set(-0.4, -0.18, -0.12);
    pump2.rotation.z = -0.35;
    g.add(pump2);
    const chamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.33, 0.5, 24),
      raptorBodyMat
    );
    chamber.position.y = -0.55;
    g.add(chamber);
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.3, 0.22, 24), raptorBodyMat);
    throat.position.y = -0.9;
    g.add(throat);

    const bellPts = vac
      ? [
          [0.3, -1.0],
          [0.34, -1.12],
          [0.4, -1.3],
          [0.47, -1.55],
        ]
      : [
          [0.3, -1.0],
          [0.33, -1.15],
          [0.38, -1.35],
          [0.45, -1.6],
          [0.54, -1.85],
          [0.62, -2.05],
          [0.68, -2.2],
          [0.72, -2.3],
        ];
    const bell = new THREE.Mesh(
      new THREE.LatheGeometry(
        bellPts.map(([x, y]) => new THREE.Vector2(x, y)),
        48
      ),
      vac ? nozzleVacMat : nozzleSLMat
    );
    g.add(bell);

    if (vac) {
      const extPts = [
        [0.5, -1.5],
        [0.6, -1.9],
        [0.78, -2.4],
        [1.0, -2.9],
        [1.22, -3.35],
        [1.38, -3.7],
        [1.45, -3.95],
      ];
      const ext = new THREE.Mesh(
        new THREE.LatheGeometry(
          extPts.map(([x, y]) => new THREE.Vector2(x, y)),
          64
        ),
        nozzleVacMat
      );
      g.add(ext);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 6, 64), raptorBodyMat);
      lip.position.y = -3.95;
      lip.rotation.x = Math.PI / 2;
      g.add(lip);
    } else {
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, 6, 48), raptorBodyMat);
      lip.position.y = -2.3;
      lip.rotation.x = Math.PI / 2;
      g.add(lip);
      // actuadores de cardán (TVC)
      for (const s of [-1, 1]) {
        const act = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.15, 12), raptorBodyMat);
        act.position.set(s * 0.55, 0.45, 0.1);
        act.rotation.z = s * 0.62;
        g.add(act);
        const joint = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), raptorBodyMat);
        joint.position.set(s * 0.24, -0.02, 0.1);
        g.add(joint);
      }
    }
    g.traverse((o) => {
      o.userData.partId = "raptor";
      o.castShadow = false;
    });
    return g;
  }

  for (let i = 0; i < 3; i++) {
    const phi = THREE.MathUtils.degToRad(90 + i * 120);
    const eng = makeRaptor(false);
    eng.position.set(2.0 * Math.sin(phi), 2.05, 2.0 * Math.cos(phi));
    group.add(eng);
    pickables.push(eng);
  }
  for (let i = 0; i < 3; i++) {
    const phi = THREE.MathUtils.degToRad(30 + i * 120);
    const eng = makeRaptor(true);
    eng.position.set(3.55 * Math.sin(phi), 2.05, 3.55 * Math.cos(phi));
    group.add(eng);
    pickables.push(eng);
  }

  /* ---------- estructura interna (visible en corte) ---------- */

  // Piel interior del tanque + anillos + stringers
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.08, R - 0.08, 40.8, 96, 1, true),
    innerWallMat
  );
  innerWall.position.y = 22.6;
  P(innerWall, "fuselaje", true, false);

  const frameGeo = new THREE.TorusGeometry(R - 0.16, 0.05, 8, 72);
  const frameCount = 27;
  const frames = new THREE.InstancedMesh(frameGeo, frameMat, frameCount);
  frames.frustumCulled = false;
  {
    const m4 = new THREE.Matrix4();
    const s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < frameCount; i++) {
      m4.compose(new THREE.Vector3(0, 3.1 + i * 1.5, 0), q90, s);
      frames.setMatrixAt(i, m4);
    }
  }
  frames.userData.partId = "fuselaje";
  pickables.push(frames);
  group.add(frames);

  const stringerCount = 28;
  const stringers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.06, 40.2, 0.1),
    frameMat,
    stringerCount
  );
  stringers.frustumCulled = false;
  {
    const m4 = new THREE.Matrix4();
    const qy = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i < stringerCount; i++) {
      const phi = (i / stringerCount) * Math.PI * 2;
      p.set((R - 0.14) * Math.sin(phi), 22.6, (R - 0.14) * Math.cos(phi));
      qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), phi - Math.PI / 2);
      m4.compose(p, qy, s);
      stringers.setMatrixAt(i, m4);
    }
  }
  stringers.userData.partId = "fuselaje";
  pickables.push(stringers);
  group.add(stringers);

  // Domos: trasero (CH4), común y delantero (LOX)
  const hemi = new THREE.SphereGeometry(R - 0.08, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const aftDome = new THREE.Mesh(hemi, domeMat);
  aftDome.scale.set(1, 0.36, 1);
  aftDome.position.y = 2.05;
  aftDome.rotation.x = Math.PI;
  P(aftDome, "tanques", true, false);

  const commonDome = new THREE.Mesh(hemi.clone(), domeMat);
  commonDome.scale.set(1, 0.5, 1);
  commonDome.position.y = 19.0;
  P(commonDome, "tanques", true, false);

  const foamDome = new THREE.Mesh(hemi.clone(), foamMat);
  foamDome.scale.set(0.985, 0.47, 0.985);
  foamDome.position.y = 18.94;
  foamDome.rotation.x = Math.PI;
  P(foamDome, "tanques", false, false);

  const fwdDome = new THREE.Mesh(hemi.clone(), domeMat);
  fwdDome.scale.set(1, 0.42, 1);
  fwdDome.position.y = 42.75;
  P(fwdDome, "tanques", true, false);

  // Tanques cabeceros (header)
  const loxHeader = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 24), headerMat);
  loxHeader.scale.set(1, 1.22, 1);
  loxHeader.position.y = 46.1;
  P(loxHeader, "tanques", true, false);
  const loxStand = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.04, 8, 32), frameMat);
  loxStand.position.y = 45.55;
  loxStand.rotation.x = Math.PI / 2;
  group.add(loxStand);

  const ch4Header = new THREE.Group();
  const ch4Body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.35, 32), headerMat);
  ch4Header.add(ch4Body);
  const ch4CapT = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), headerMat);
  ch4CapT.position.y = 0.675;
  ch4Header.add(ch4CapT);
  const ch4CapB = ch4CapT.clone();
  ch4CapB.rotation.x = Math.PI;
  ch4CapB.position.y = -0.675;
  ch4Header.add(ch4CapB);
  ch4Header.position.set(0, 3.15, 0.7);
  ch4Header.traverse((o) => (o.userData.partId = "tanques"));
  group.add(ch4Header);
  pickables.push(ch4Header);

  // Thrust puck + costillas radiales
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.12, R - 0.12, 0.55, 64), puckMat);
  puck.position.y = 1.55;
  P(puck, "puck", true, false);
  const ribCount = 24;
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(3.0, 0.5, 0.14), puckRibMat, ribCount);
  ribs.frustumCulled = false;
  {
    const m4 = new THREE.Matrix4();
    const qy = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i < ribCount; i++) {
      const phi = (i / ribCount) * Math.PI * 2;
      p.set(2.6 * Math.sin(phi), 1.55, 2.6 * Math.cos(phi));
      qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), phi - Math.PI / 2);
      m4.compose(p, qy, s);
      ribs.setMatrixAt(i, m4);
    }
  }
  ribs.userData.partId = "puck";
  pickables.push(ribs);
  group.add(ribs);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.95, 32), puckMat);
  hub.position.y = 1.55;
  hub.userData.partId = "puck";
  group.add(hub);

  /* ---------- líneas de propelente ---------- */

  // Bajante de LOX (exterior, desde el domo común hasta el puck)
  const loxPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 19.3, 0),
      new THREE.Vector3(1.9, 18.5, 2.9),
      new THREE.Vector3(3.43, 17.3, 3.43),
      new THREE.Vector3(3.55, 13.5, 3.55),
      new THREE.Vector3(3.5, 8.5, 3.5),
      new THREE.Vector3(3.35, 3.5, 3.35),
      new THREE.Vector3(2.6, 1.4, 2.6),
      new THREE.Vector3(1.2, 1.0, 1.2),
    ],
    false,
    "catmullrom",
    0.35
  );
  const loxTube = new THREE.Mesh(new THREE.TubeGeometry(loxPath, 110, 0.42, 18), pipeMat);
  P(loxTube, "lineas", true, false);
  const bandGeo = new THREE.TorusGeometry(0.47, 0.035, 8, 24);
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x2a6f86,
    metalness: 0.6,
    roughness: 0.35,
    emissive: new THREE.Color(0x6fd3e7),
    emissiveIntensity: 0.55,
  });
  for (const t of [0.16, 0.34, 0.52, 0.7, 0.86]) {
    const p = loxPath.getPointAt(t);
    const tan = loxPath.getTangentAt(t);
    const band = new THREE.Mesh(bandGeo, cyanMat);
    band.position.copy(p);
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.normalize());
    band.userData.partId = "lineas";
    group.add(band);
  }
  // soportes del bajante al casco
  for (const t of [0.3, 0.55, 0.78]) {
    const p = loxPath.getPointAt(t);
    const dir = new THREE.Vector3(p.x, 0, p.z).normalize();
    const hull = dir.clone().multiplyScalar(R - 0.05);
    hull.y = p.y;
    strut(group, hull, p, 0.06, frameMat);
  }

  // Alimentación de CH4 (central, del domo trasero al colector)
  const ch4Main = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 24), pipeMatB);
  ch4Main.position.set(0, 1.2, 0);
  P(ch4Main, "lineas", true, false);
  const manifold = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.18, 12, 48), pipeMatB);
  manifold.position.y = 0.95;
  manifold.rotation.x = Math.PI / 2;
  manifold.userData.partId = "lineas";
  group.add(manifold);
  pickables.push(manifold);
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0x8a5a1e,
    metalness: 0.6,
    roughness: 0.35,
    emissive: new THREE.Color(0xffb454),
    emissiveIntensity: 0.5,
  });
  for (let i = 0; i < 3; i++) {
    const phi = THREE.MathUtils.degToRad(90 + i * 120);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.85, 14), pipeMatB);
    branch.position.set(2.0 * Math.sin(phi), 1.45, 2.0 * Math.cos(phi));
    branch.userData.partId = "lineas";
    group.add(branch);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 24), amberMat);
    band.position.y = 1.55;
    band.rotation.x = Math.PI / 2;
    band.position.x = 0;
    band.userData.partId = "lineas";
    if (i === 0) group.add(band);
  }

  // Líneas de los tanques cabeceros
  const loxHdrPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 45.1, 0),
    new THREE.Vector3(1.1, 44.3, 1.1),
    new THREE.Vector3(1.9, 43.3, 1.9),
  ]);
  const loxHdr = new THREE.Mesh(new THREE.TubeGeometry(loxHdrPath, 24, 0.12, 12), pipeMat);
  loxHdr.userData.partId = "lineas";
  group.add(loxHdr);
  const ch4HdrPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.45, 0.7),
    new THREE.Vector3(0.35, 1.8, 1.0),
    new THREE.Vector3(0.9, 1.15, 1.15),
  ]);
  const ch4Hdr = new THREE.Mesh(new THREE.TubeGeometry(ch4HdrPath, 24, 0.12, 12), pipeMatB);
  ch4Hdr.userData.partId = "lineas";
  group.add(ch4Hdr);

  /* ---------- plano de corte (visual) ---------- */
  const cutVisual = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 64),
    new THREE.MeshBasicMaterial({
      color: 0xf5a524,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  cutVisual.position.set(0, 25, 5.4);
  cutVisual.renderOrder = 5;
  group.add(cutVisual);

  /* ---------- aplicar recorte a materiales estructurales ---------- */
  const clippedMats = [
    hullMat,
    noseMat,
    skirtMat,
    weldMat,
    doorMat,
    doorSeamMat,
    tileMat,
    flapFrontMat,
    flapRearMat,
    flapTipMat,
    strutMatF,
    strutMatR,
    innerWallMat,
    frameMat,
    domeMat,
    foamMat,
  ];
  for (const m of clippedMats) m.clippingPlanes = clip;

  /* ---------- anclas de etiquetas ---------- */
  const anchors = [
    { id: "cono", pos: new THREE.Vector3(0, 49.1, 0.9) },
    { id: "flaps_del", pos: new THREE.Vector3(6.6, 42.0, 0) },
    { id: "flaps_tra", pos: new THREE.Vector3(7.3, 4.4, 0) },
    { id: "escudo", pos: new THREE.Vector3(0, 24, -4.95) },
    { id: "fuselaje", pos: new THREE.Vector3(4.85, 13.5, 1.25) },
    { id: "tanques", pos: new THREE.Vector3(0, 24.5, 0) },
    { id: "puerta", pos: new THREE.Vector3(0, 39.5, 5.15) },
    { id: "raptor", pos: new THREE.Vector3(1.85, -1.6, 3.3) },
    { id: "puck", pos: new THREE.Vector3(0, 1.5, 3.5) },
    { id: "lineas", pos: new THREE.Vector3(3.6, 10.5, 3.55) },
  ];

  /* ---------- estrellas ---------- */
  const starLayers: THREE.Points[] = [];
  const sprite = starSprite();
  function makeStars(count: number, rMin: number, rMax: number, size: number, opacity: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (v.lengthSq() < 1e-4) v.set(0.3, 0.5, 0.2);
      v.normalize().multiplyScalar(rMin + rnd() * (rMax - rMin));
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      const roll = rnd();
      if (roll < 0.68) c.setRGB(0.95, 0.96, 1.0);
      else if (roll < 0.85) c.setRGB(1.0, 0.86, 0.66);
      else c.setRGB(0.66, 0.8, 1.0);
      const b = 0.5 + rnd() * 0.5;
      col[i * 3] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    starLayers.push(pts);
    return pts;
  }
  const layerGroup = new THREE.Group();
  layerGroup.add(makeStars(2400, 320, 560, 1.7, 0.95));
  layerGroup.add(makeStars(1500, 620, 900, 2.6, 0.7));
  group.add(layerGroup);

  /* ---------- dispose ---------- */
  const dispose = () => {
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh || (o as THREE.Points).isPoints) {
        mesh.geometry?.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      }
    });
    brush.dispose();
    sprite.dispose();
  };

  return { group, pickables, partMats, clipPlane, cutVisual, anchors, starLayers, dispose };
}
