"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  siNodedotjs,
  siJavascript,
  siTypescript,
  siKubernetes,
  siDocker,
  siAnsible,
  siAnthropic,
  siGooglecloud,
  siRedis,
  siApachekafka,
  siReact,
  siNextdotjs,
  siMongodb,
  siPostgresql,
  siRabbitmq,
  siElasticsearch,
  siTerraform,
  siLangchain,
  siKong,
  siMinio,
  siModelcontextprotocol,
  siGit,
  siOllama,
  siCrewai,
  siTailwindcss,
  siMysql,
} from "simple-icons";

const CUBIE_SIZE = 0.54;
const GAP = 0.035;
const STEP = CUBIE_SIZE + GAP;
const BASE_COLOR = "#121418";
const LOGO_COLOR = "#3a4050";

type SimpleIcon = { title: string; slug: string; path: string };

// Logos in fixed order → map 1:1 with LOGO_CUBIE_KEYS below.
const LOGOS: SimpleIcon[] = [
  // 8 corners
  siNodedotjs,
  siJavascript,
  siTypescript,
  siReact,
  siNextdotjs,
  siKubernetes,
  siDocker,
  siTerraform,
  // 12 edges
  siAnsible,
  siGooglecloud,
  siApachekafka,
  siRabbitmq,
  siRedis,
  siPostgresql,
  siMongodb,
  siElasticsearch,
  siAnthropic,
  siLangchain,
  siKong,
  siMinio,
  // 6 face centers
  siModelcontextprotocol,
  siGit,
  siOllama,
  siCrewai,
  siTailwindcss,
  siMysql,
].filter(Boolean) as SimpleIcon[];

// 8 corners + 12 edges + 6 face centers = 26 visible cubies (only hidden center stays plain)
const LOGO_CUBIE_KEYS = [
  // 8 corners
  "-1,-1,-1", "1,-1,-1", "-1,1,-1", "1,1,-1",
  "-1,-1,1", "1,-1,1", "-1,1,1", "1,1,1",
  // 12 edges
  "0,-1,-1", "0,1,-1", "-1,0,-1", "1,0,-1",
  "0,-1,1", "0,1,1", "-1,0,1", "1,0,1",
  "-1,-1,0", "1,1,0", "-1,1,0", "1,-1,0",
  // 6 face centers
  "1,0,0", "-1,0,0", "0,1,0", "0,-1,0", "0,0,1", "0,0,-1",
];

/* ------------------------------------------------------------------ */
/*                      SVG → CanvasTexture helper                    */
/* ------------------------------------------------------------------ */

function makeLogoTexture(
  svgPath: string,
  size = 256,
): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${svgPath}" fill="${LOGO_COLOR}"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no 2d context"));
        return;
      }
      ctx.fillStyle = BASE_COLOR;
      ctx.fillRect(0, 0, size, size);
      const inner = Math.round(size * 0.62);
      const off = Math.round((size - inner) / 2);
      ctx.drawImage(img, off, off, inner, inner);
      URL.revokeObjectURL(url);
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 8;
      texture.colorSpace = THREE.SRGBColorSpace;
      resolve(texture);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

/* ------------------------------------------------------------------ */
/*                           Rubik's cube                             */
/* ------------------------------------------------------------------ */

type CubieSpec = { key: string; pos: [number, number, number] };

function buildCubies(): CubieSpec[] {
  const out: CubieSpec[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        out.push({ key: `${x},${y},${z}`, pos: [x * STEP, y * STEP, z * STEP] });
      }
    }
  }
  return out;
}

function RubiksCube({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const cubies = useMemo(() => buildCubies(), []);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE), []);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(boxGeo), [boxGeo]);

  // ---- Texture loading ----
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(LOGOS.map((l) => makeLogoTexture(l.path))).then((t) => {
      if (!cancelled) setTextures(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Material assignment per cubie ----
  const plainMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: BASE_COLOR, toneMapped: false }),
    [],
  );

  const cubieMaterials = useMemo(() => {
    const map: Record<string, THREE.Material | THREE.Material[]> = {};
    cubies.forEach((c) => {
      const logoIdx = LOGO_CUBIE_KEYS.indexOf(c.key);
      if (logoIdx >= 0 && textures[logoIdx]) {
        const mat = new THREE.MeshBasicMaterial({
          map: textures[logoIdx],
          toneMapped: false,
        });
        map[c.key] = [mat, mat, mat, mat, mat, mat];
      } else {
        map[c.key] = plainMaterial;
      }
    });
    return map;
  }, [cubies, textures, plainMaterial]);

  // ---- Whole-cube rotation velocity — varies over time ----
  const rotVel = useRef({ x: 0.9, y: 1.1, z: 0.0 });
  const rotVelTarget = useRef({ x: 0.9, y: 1.1, z: 0.0 });
  const rotSwitchTimer = useRef(0);

  // ---- Face twist state ----
  const twist = useRef<{
    axis: "x" | "y" | "z";
    layer: -1 | 0 | 1;
    angle: number;
    target: number;
    speed: number;
  } | null>(null);
  const twistTimer = useRef(0);

  const cubieRefs = useRef<Record<string, THREE.Group | null>>({});
  const cubieState = useRef<
    Record<string, { pos: [number, number, number]; quat: THREE.Quaternion }>
  >(
    Object.fromEntries(
      cubies.map((c) => [c.key, { pos: c.pos, quat: new THREE.Quaternion() }]),
    ),
  );

  const axisVec = useMemo(
    () => ({
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1),
    }),
    [],
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    if (reduced) return;

    rotSwitchTimer.current += delta;
    if (rotSwitchTimer.current > 1.6) {
      rotSwitchTimer.current = 0;
      const pick = () => (Math.random() * 2 - 1) * 1.6;
      rotVelTarget.current = { x: pick(), y: pick(), z: pick() * 0.6 };
    }
    rotVel.current.x += (rotVelTarget.current.x - rotVel.current.x) * Math.min(1, delta * 2.5);
    rotVel.current.y += (rotVelTarget.current.y - rotVel.current.y) * Math.min(1, delta * 2.5);
    rotVel.current.z += (rotVelTarget.current.z - rotVel.current.z) * Math.min(1, delta * 2.5);

    g.rotation.x += rotVel.current.x * delta;
    g.rotation.y += rotVel.current.y * delta;
    g.rotation.z += rotVel.current.z * delta;

    if (!twist.current) {
      twistTimer.current += delta;
      if (twistTimer.current > 0.7) {
        twistTimer.current = 0;
        const axes = ["x", "y", "z"] as const;
        const layers = [-1, 0, 1] as const;
        const ax = axes[Math.floor(Math.random() * axes.length)];
        const la = layers[Math.floor(Math.random() * layers.length)];
        const direction = Math.random() < 0.5 ? 1 : -1;
        twist.current = {
          axis: ax,
          layer: la,
          angle: 0,
          target: (Math.PI / 2) * direction,
          speed: Math.PI / 0.32,
        };
      }
    }

    if (twist.current) {
      const t = twist.current;
      const remaining = t.target - t.angle;
      const sign = Math.sign(remaining);
      const step = sign * Math.min(Math.abs(remaining), t.speed * delta);
      t.angle += step;

      const AXIS_IDX = t.axis === "x" ? 0 : t.axis === "y" ? 1 : 2;
      const axis3 = axisVec[t.axis];
      const quatStep = new THREE.Quaternion().setFromAxisAngle(axis3, step);

      Object.entries(cubieState.current).forEach(([key, state]) => {
        const coord = Math.round(state.pos[AXIS_IDX] / STEP);
        if (coord !== t.layer) return;
        const p = new THREE.Vector3(...state.pos).applyAxisAngle(axis3, step);
        state.pos = [p.x, p.y, p.z];
        state.quat.premultiply(quatStep);
        const ref = cubieRefs.current[key];
        if (ref) {
          ref.position.set(p.x, p.y, p.z);
          ref.quaternion.copy(state.quat);
        }
      });

      if (Math.abs(t.angle - t.target) < 1e-4) {
        Object.entries(cubieState.current).forEach(([key, state]) => {
          const snapped: [number, number, number] = [
            Math.round(state.pos[0] / STEP) * STEP,
            Math.round(state.pos[1] / STEP) * STEP,
            Math.round(state.pos[2] / STEP) * STEP,
          ];
          state.pos = snapped;
          const ref = cubieRefs.current[key];
          if (ref) ref.position.set(snapped[0], snapped[1], snapped[2]);
        });
        twist.current = null;
      }
    }
  });

  return (
    <group ref={group}>
      {cubies.map((c) => {
        const mat = cubieMaterials[c.key];
        return (
          <group
            key={c.key}
            position={c.pos}
            ref={(el) => {
              cubieRefs.current[c.key] = el;
            }}
          >
            <mesh geometry={boxGeo} material={mat} />
            <lineSegments geometry={edgesGeo}>
              <lineBasicMaterial color="#2a2f3a" toneMapped={false} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*                             Scene                                  */
/* ------------------------------------------------------------------ */

function Scene({ reduced }: { reduced: boolean }) {
  return <RubiksCube reduced={reduced} />;
}

/* ------------------------------------------------------------------ */
/*                             Public                                 */
/* ------------------------------------------------------------------ */

export function ServiceMesh() {
  const reduced = useReducedMotion();
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ fov: 38, position: [0, 0, 6.8] }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={reduced ? "demand" : "always"}
      >
        <Scene reduced={reduced} />
      </Canvas>
    </div>
  );
}
