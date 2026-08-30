import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildStarship, type ShipBuild } from "./three/starship";
import { PARTS, PART_BY_ID, type PartSpec } from "./data/parts";

const CAM0 = new THREE.Vector3(-38, 10, -40);
const TGT0 = new THREE.Vector3(0, 0.5, 0);

type Mode = "ext" | "cut";

/* ---------- audio ---------- */
function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  };
  const blip = (f0: number, f1: number, dur = 0.14, gain = 0.05, type: OscillatorType = "triangle") => {
    try {
      const ctx = ensure();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), ctx.currentTime + dur);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    } catch {
      /* sin audio */
    }
  };
  return { blip };
}

/* ---------- iconos ---------- */
const I = {
  reset: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  ),
  orbit: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M20.3 8.5c1.6 2.8-2.6 7.4-9.3 10.2S-1 21 1.7 15.5" transform="rotate(-18 12 12)" />
    </svg>
  ),
  tag: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  ),
  snd: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  ),
  cut: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 8.1M14.5 14.5 20 20M8.1 15.9l3-1.1" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelBoxRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const [mode, setMode] = useState<Mode>("ext");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cutTarget, setCutTarget] = useState(0.8);

  const distRef = useRef<HTMLSpanElement>(null);
  const azRef = useRef<HTMLSpanElement>(null);
  const elRef = useRef<HTMLSpanElement>(null);
  const cutRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const selRef = useRef<HTMLSpanElement>(null);

  const buildRef = useRef<ShipBuild | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCRef = useRef(5.4);
  const selRefState = useRef<string | null>(null);
  const hovRefState = useRef<string | null>(null);
  const modeRef = useRef<Mode>("ext");
  const showLabelsRef = useRef(true);
  const tweenRef = useRef<{ p0: THREE.Vector3; t0: THREE.Vector3; start: number } | null>(null);
  const { blip } = useAudio();
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const sound = (kind: "sel" | "mode" | "ui") => {
    if (mutedRef.current) return;
    if (kind === "sel") blip(680, 320, 0.16, 0.05);
    else if (kind === "mode") blip(300, 640, 0.18, 0.045, "sine");
    else blip(520, 520, 0.06, 0.03, "sine");
  };

  /* ============ escena ============ */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x04050a, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 3000);
    camera.position.copy(CAM0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(TGT0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 9;
    controls.maxDistance = 320;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    /* entorno (reflejos del acero) */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
    scene.environment = envTex;

    /* iluminación: el Sol como fuente principal */
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
    sun.position.set(-65, 40, -80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -17;
    sun.shadow.camera.right = 17;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 30;
    sun.shadow.camera.far = 280;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9db4d8, 0.16);
    fill.position.set(70, -20, 65);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight(0x2a3242, 0x05060a, 0.55));

    /* modelo */
    const build = buildStarship();
    build.group.position.y = -25;
    scene.add(build.group);
    buildRef.current = build;

    /* interacción */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let dragging = false;

    const partAt = (cx: number, cy: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(build.pickables, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (o.userData.partId) return o.userData.partId as string;
          o = o.parent;
        }
      }
      return null;
    };

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) dragging = true;
        renderer.domElement.style.cursor = "grabbing";
        return;
      }
      const id = partAt(e.clientX, e.clientY);
      renderer.domElement.style.cursor = id ? "pointer" : "grab";
      if (id !== hovRefState.current) {
        hovRefState.current = id;
        setHovered(id);
      }
    };
    const onUp = (e: PointerEvent) => {
      renderer.domElement.style.cursor = "grab";
      if (dragging || e.button !== 0) return;
      const id = partAt(e.clientX, e.clientY);
      if (id) {
        if (selRefState.current !== id) sound("sel");
        selRefState.current = id;
        setSelected(id);
      } else if (selRefState.current) {
        selRefState.current = null;
        setSelected(null);
      }
    };
    const onLeave = () => {
      hovRefState.current = null;
      setHovered(null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.style.cursor = "grab";

    /* bucle */
    const vTmp = new THREE.Vector3();
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let fpsT = last;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = now / 1000;

      /* tween de reset */
      const tw = tweenRef.current;
      if (tw) {
        const k = Math.min((now - tw.start) / 900, 1);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(tw.p0, CAM0, e);
        controls.target.lerpVectors(tw.t0, TGT0, e);
        if (k >= 1) tweenRef.current = null;
      }
      controls.update();

      /* plano de corte */
      const plane = build.clipPlane;
      plane.constant += (targetCRef.current - plane.constant) * Math.min(dt * 5, 1);
      build.cutVisual.position.z = plane.constant;
      build.cutVisual.visible = modeRef.current === "cut";
      if (cutRef.current) cutRef.current.textContent = `Z ${plane.constant.toFixed(2)} m`;

      /* pulso de selección */
      for (const [pid, mats] of Object.entries(build.partMats)) {
        const target =
          pid === selRefState.current
            ? 0.3 + 0.16 * Math.sin(t * 4.2)
            : pid === hovRefState.current
              ? 0.15
              : 0;
        for (const m of mats) m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(dt * 10, 1);
      }

      /* deriva de estrellas */
      build.starLayers.forEach((s, i) => {
        s.rotation.y += dt * (i === 0 ? 0.0045 : 0.002);
      });

      /* etiquetas */
      if (labelBoxRef.current) {
        const w = host.clientWidth;
        const h = host.clientHeight;
        for (const a of build.anchors) {
          const el = labelEls.current.get(a.id);
          if (!el) continue;
          const spec = PART_BY_ID[a.id];
          const hiddenByMode = spec?.interno && modeRef.current !== "cut";
          if (hiddenByMode) {
            el.style.opacity = "0";
            continue;
          }
          vTmp.copy(a.pos).add(build.group.position);
          vTmp.project(camera);
          if (vTmp.z > 1) {
            el.style.opacity = "0";
            continue;
          }
          const x = (vTmp.x * 0.5 + 0.5) * w;
          const y = (-vTmp.y * 0.5 + 0.5) * h;
          el.style.opacity = showLabelsRef.current ? "1" : "0";
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        }
      }

      /* telemetría */
      frames++;
      if (now - fpsT > 500) {
        if (fpsRef.current) fpsRef.current.textContent = `${Math.round((frames * 1000) / (now - fpsT))}`;
        frames = 0;
        fpsT = now;
        if (distRef.current) distRef.current.textContent = `${camera.position.distanceTo(controls.target).toFixed(1)} m`;
        if (azRef.current) azRef.current.textContent = `${THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()).toFixed(0)}°`;
        if (elRef.current) elRef.current.textContent = `${THREE.MathUtils.radToDeg(controls.getPolarAngle()).toFixed(0)}°`;
        if (selRef.current) selRef.current.textContent = selRefState.current ? PART_BY_ID[selRefState.current].num : "——";
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      controls.dispose();
      pmrem.dispose();
      envTex.dispose();
      build.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* sincronizar estado → refs del bucle */
  useEffect(() => {
    modeRef.current = mode;
    targetCRef.current = mode === "cut" ? cutTarget : 5.4;
  }, [mode, cutTarget]);
  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const selectPart = (id: string | null) => {
    if (id && id !== selRefState.current) sound("sel");
    selRefState.current = id;
    setSelected(id);
  };

  const changeMode = (m: Mode) => {
    if (m === mode) return;
    sound("mode");
    setMode(m);
  };

  const resetView = () => {
    sound("ui");
    tweenRef.current = {
      p0: cameraRef.current!.position.clone(),
      t0: controlsRef.current!.target.clone(),
      start: performance.now(),
    };
  };

  const spec: PartSpec | null = selected ? PART_BY_ID[selected] : null;
  const cutPct = ((cutTarget - 0.2) / (4.5 - 0.2)) * 100;

  return (
    <div className="relative h-full w-full overflow-hidden bg-void text-ink select-none">
      {/* viewport 3D */}
      <div ref={hostRef} className="absolute inset-0" />

      {/* etiquetas de componentes */}
      <div ref={labelBoxRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTS.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) labelEls.current.set(p.id, el);
              else labelEls.current.delete(p.id);
            }}
            className="label-tag absolute left-0 top-0 flex items-stretch gap-1.5"
            style={{ opacity: 0 }}
          >
            <span
              className="flex h-[18px] w-[26px] items-center justify-center border font-mono text-[10px] font-semibold tracking-wider"
              style={{
                color: selected === p.id ? "#04050a" : p.accent,
                background: selected === p.id ? p.accent : "rgba(4,5,10,0.72)",
                borderColor: `${p.accent}66`,
              }}
            >
              {p.num}
            </span>
            <span
              className="flex flex-col justify-center gap-px border border-line/70 bg-void/75 px-1.5 py-0.5 backdrop-blur-[2px]"
              style={{ borderColor: selected === p.id ? `${p.accent}88` : undefined }}
            >
              <span className="whitespace-nowrap font-mono text-[10px] uppercase leading-[1.25] tracking-wide text-dim">
                {p.nombre.split("—")[0].trim()}
              </span>
              <span className="whitespace-nowrap font-mono text-[8.5px] uppercase leading-[1.25] tracking-wide text-cryo/90">
                <i className="mr-1 not-italic opacity-60">EN</i>
                {p.en}
              </span>
              <span className="whitespace-nowrap font-mono text-[8.5px] uppercase leading-[1.25] tracking-wide text-hot/90">
                <i className="mr-1 not-italic opacity-60">DE</i>
                {p.de}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* cabecera */}
      <header className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber/90">
          Revisión de ingeniería · MEC-3D
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-none tracking-tight md:text-[34px]">
          STARSHIP <span className="text-dim font-medium">/</span>{" "}
          <span className="text-amber">UPPER STAGE</span>
        </h1>
        <p className="mt-1.5 hidden font-mono text-[11px] text-dim sm:block">
          Ø 9.0 m · 50 m · ≈1 200 t prop · 6 × Raptor 3 · acero 304L
        </p>
      </header>

      {/* panel de control */}
      <aside className="absolute left-4 top-[104px] z-10 w-[228px] md:left-6 md:top-[122px]">
        <div className="border border-line bg-panel/85 p-3 backdrop-blur-sm">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">Vista</p>
          <div className="grid grid-cols-2 border border-line">
            <button
              onClick={() => changeMode("ext")}
              className={`px-2 py-2 font-mono text-[10.5px] uppercase tracking-wider transition-colors ${
                mode === "ext" ? "bg-amber text-[#160f02]" : "text-dim hover:text-ink"
              }`}
            >
              Exterior
            </button>
            <button
              onClick={() => changeMode("cut")}
              className={`flex items-center justify-center gap-1 border-l border-line px-2 py-2 font-mono text-[10.5px] uppercase tracking-wider transition-colors ${
                mode === "cut" ? "bg-amber text-[#160f02]" : "text-dim hover:text-ink"
              }`}
            >
              {I.cut} Corte
            </button>
          </div>

          <div className={`mt-3 ${mode === "cut" ? "" : "pointer-events-none"}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-dim">Plano de corte</span>
              <span className="font-mono text-[10px] text-cryo">
                {mode === "cut" ? `Z ${cutTarget.toFixed(2)} m` : "inactivo"}
              </span>
            </div>
            <input
              type="range"
              className="cut-slider mt-2"
              min={0.2}
              max={4.5}
              step={0.05}
              value={cutTarget}
              disabled={mode !== "cut"}
              onChange={(e) => setCutTarget(Math.min(4.5, Math.max(0.2, Number(e.target.value))))}
              style={{ ["--fill" as string]: `${cutPct}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              onClick={resetView}
              className="flex items-center justify-center gap-1.5 border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-dim transition-colors hover:border-amber/60 hover:text-amber"
            >
              {I.reset} Reset
            </button>
            <button
              onClick={() => {
                sound("ui");
                setAutoRotate((v) => !v);
              }}
              className={`flex items-center justify-center gap-1.5 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                autoRotate ? "border-amber/70 text-amber" : "border-line text-dim hover:border-amber/60 hover:text-amber"
              }`}
            >
              {I.orbit} Órbita
            </button>
            <button
              onClick={() => {
                sound("ui");
                setShowLabels((v) => !v);
              }}
              className={`flex items-center justify-center gap-1.5 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showLabels ? "border-amber/70 text-amber" : "border-line text-dim hover:border-amber/60 hover:text-amber"
              }`}
            >
              {I.tag} Etiquetas
            </button>
            <button
              onClick={() => setMuted((v) => !v)}
              className={`flex items-center justify-center gap-1.5 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                !muted ? "border-amber/70 text-amber" : "border-line text-dim hover:border-amber/60 hover:text-amber"
              }`}
            >
              {I.snd} Sonido
            </button>
          </div>
        </div>

        {/* lista de componentes */}
        <div className="mt-2 hidden max-h-[calc(100vh-330px)] overflow-y-auto border border-line bg-panel/85 backdrop-blur-sm scroll-thin md:block">
          <p className="sticky top-0 border-b border-line bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
            Componentes · {PARTS.length}
          </p>
          {PARTS.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPart(selected === p.id ? null : p.id)}
              className={`flex w-full items-center gap-2.5 border-b border-line/60 px-3 py-2 text-left transition-colors last:border-b-0 ${
                selected === p.id ? "bg-amber/10" : "hover:bg-ink/5"
              }`}
            >
              <span
                className="flex h-[18px] w-[26px] shrink-0 items-center justify-center border font-mono text-[10px] font-semibold"
                style={{
                  color: selected === p.id ? "#04050a" : p.accent,
                  background: selected === p.id ? p.accent : "transparent",
                  borderColor: `${p.accent}55`,
                }}
              >
                {p.num}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-display text-[12px] leading-tight ${selected === p.id ? "text-ink" : "text-dim"}`}>
                  {p.nombre}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[8.5px] uppercase leading-tight tracking-wide">
                  <span className="text-cryo/80">{p.en}</span>
                  <span className="mx-1 text-dim/50">·</span>
                  <span className="text-hot/80">{p.de}</span>
                </span>
              </span>
              {p.interno && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-cryo/80" title="Visible en corte" />}
            </button>
          ))}
        </div>
      </aside>

      {/* ficha técnica */}
      {spec && (
        <section
          key={spec.id}
          className="sheet-in absolute bottom-12 right-4 z-20 w-[min(350px,calc(100vw-2rem))] md:bottom-14 md:right-6"
        >
          <div className="border border-line bg-panel/92 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <div className="flex items-start gap-3 border-b border-line px-4 py-3">
              <span
                className="mt-0.5 flex h-7 w-10 shrink-0 items-center justify-center font-mono text-[13px] font-bold"
                style={{ background: spec.accent, color: "#04050a" }}
              >
                {spec.num}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[15px] font-bold leading-tight">{spec.nombre}</h2>
                <p className="mt-1 font-mono text-[9px] uppercase leading-[1.5] tracking-[0.12em]">
                  <span className="text-cryo/85">
                    <i className="mr-1 not-italic text-[7.5px] opacity-60">EN</i>
                    {spec.en}
                  </span>
                  <span className="block text-hot/85">
                    <i className="mr-1 not-italic text-[7.5px] opacity-60">DE</i>
                    {spec.de}
                  </span>
                </p>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: spec.accent }}>
                  {spec.tag}
                </p>
              </div>
              <button
                onClick={() => selectPart(null)}
                className="ml-auto shrink-0 border border-line p-1 text-dim transition-colors hover:border-hot/70 hover:text-hot"
                aria-label="Cerrar ficha"
              >
                {I.x}
              </button>
            </div>

            <div className="border-b border-line bg-ink/[0.03] px-4 py-2.5">
              <p className="font-mono text-[22px] font-semibold leading-none" style={{ color: spec.accent }}>
                {spec.highlight.value}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-dim">{spec.highlight.label}</p>
            </div>

            <div className="max-h-[38vh] overflow-y-auto px-4 py-3 scroll-thin">
              {spec.secciones.map((s) => (
                <div key={s.titulo} className="mb-3 last:mb-0">
                  <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-amber/80">
                    ▍{s.titulo}
                  </p>
                  <dl>
                    {s.filas.map((f) => (
                      <div key={f.k} className="mb-1 flex gap-2 text-[11.5px] leading-snug">
                        <dt className="w-[38%] shrink-0 font-mono text-[10px] uppercase tracking-wide text-dim pt-[1px]">
                          {f.k}
                        </dt>
                        <dd className="text-ink/90">{f.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <p className="mt-3 border-l-2 pl-2.5 font-display text-[11.5px] italic leading-snug text-dim" style={{ borderColor: spec.accent }}>
                {spec.nota}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* barra de telemetría */}
      <footer className="absolute inset-x-0 bottom-0 z-10 flex h-9 items-center gap-4 overflow-x-auto border-t border-line bg-panel/90 px-4 font-mono text-[10.5px] uppercase tracking-wider text-dim backdrop-blur-sm md:gap-6 md:px-6">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber ping-dot" />
          <span className="text-ink/80">SIM ACTIVA</span>
        </span>
        <span className="whitespace-nowrap">
          DIST <span ref={distRef} className="text-ink">—</span>
        </span>
        <span className="whitespace-nowrap">
          AZ <span ref={azRef} className="text-ink">—</span>
        </span>
        <span className="whitespace-nowrap">
          EL <span ref={elRef} className="text-ink">—</span>
        </span>
        <span className="hidden whitespace-nowrap sm:inline">
          SEL <span className="text-amber"><span ref={selRef}>——</span></span>
        </span>
        <span className="hidden whitespace-nowrap md:inline">
          CORTE <span className="text-cryo"><span ref={cutRef}>Z 5.40 m</span></span>
        </span>
        <span className="whitespace-nowrap">
          FPS <span ref={fpsRef} className="text-ink">—</span>
        </span>
        <span className="ml-auto hidden whitespace-nowrap text-dim/70 lg:inline">
          arrastrar · rotar&ensp;/&ensp;rueda · zoom&ensp;/&ensp;clic der · panear
        </span>
      </footer>

      {/* aviso de corte */}
      {mode === "cut" && (
        <div className="fade-up pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 border border-cryo/40 bg-panel/85 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cryo backdrop-blur-sm">
          Sección estructural expuesta — domos · mamparo común · puck
        </div>
      )}

      {/* cursor de pieza */}
      {hovered && hovered !== selected && (
        <div className="pointer-events-none absolute bottom-12 left-1/2 z-10 -translate-x-1/2 border border-line bg-panel/90 px-3 py-1.5 text-center font-mono uppercase tracking-wider backdrop-blur-sm md:bottom-14">
          <p className="whitespace-nowrap text-[10.5px] text-amber">
            {PART_BY_ID[hovered]?.num} · {PART_BY_ID[hovered]?.nombre}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[8.5px] leading-tight">
            <span className="text-cryo/85">{PART_BY_ID[hovered]?.en}</span>
            <span className="mx-1 text-dim/50">·</span>
            <span className="text-hot/85">{PART_BY_ID[hovered]?.de}</span>
          </p>
        </div>
      )}
    </div>
  );
}
