"use client";

import { useEffect, useRef, useState } from "react";

// "Sales on autopilot": a glowing Duka core with parcels, Naira coins, a
// phone and chat bubbles orbiting it under moving amber lights. Follows
// the pointer a little. Built with plain three.js (no React wrapper) and
// loaded only when the section is near the screen.
//
// Light on devices: pauses off-screen / in background tabs, caps the pixel
// ratio, draws one still frame for "reduce motion", and falls back to a CSS
// glow where WebGL isn't available.

export default function CommerceScene({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;

    const start = async () => {
      const THREE = await import("three");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      if (cancelled) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        setFallback(true);
        return;
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.6, 11);

      // Lights: warm key, amber + teal rim lights that drift
      scene.add(new THREE.HemisphereLight(0xfff4e0, 0x1a1208, 0.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(4, 6, 6);
      scene.add(key);
      const amber = new THREE.PointLight(0xf59e0b, 60, 30, 1.6);
      const teal = new THREE.PointLight(0x22d3ee, 30, 30, 1.8);
      const green = new THREE.PointLight(0x25d366, 25, 25, 1.8);
      scene.add(amber, teal, green);

      const world = new THREE.Group();
      scene.add(world);

      // Core: glowing orb + wire shell + orbit rings
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 3),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 }),
      );
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.55, 1),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0.25 }),
      );
      world.add(core, shell);
      const rings: import("three").Mesh[] = [];
      for (const [r, tilt] of [[2.9, 1.15], [3.9, 1.35], [4.9, 1.05]] as const) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.012, 8, 160),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.22 }),
        );
        ring.rotation.x = tilt;
        rings.push(ring);
        world.add(ring);
      }

      // Things that orbit
      const kraft = new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: 0.85 });
      const tape = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xf5c451, metalness: 1, roughness: 0.28 });
      const phoneBody = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.6, roughness: 0.35 });
      const screen = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf59e0b, emissiveIntensity: 0.55 });
      const bubble = new THREE.MeshStandardMaterial({ color: 0x25d366, emissive: 0x25d366, emissiveIntensity: 0.35, roughness: 0.4 });

      const parcel = () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.62, 0.62, 3, 0.07), kraft));
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.64, 0.12), tape);
        g.add(band);
        return g;
      };
      const coin = () => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 40), gold);
        m.rotation.x = Math.PI / 2;
        const g = new THREE.Group();
        g.add(m);
        return g;
      };
      const phone = () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.15, 0.08, 3, 0.06), phoneBody));
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.98), screen);
        s.position.z = 0.045;
        g.add(s);
        return g;
      };
      const chat = () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), bubble));
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 12), bubble);
        tail.position.set(-0.2, -0.26, 0);
        tail.rotation.z = 0.8;
        g.add(tail);
        return g;
      };

      type Orbiter = { obj: import("three").Group; r: number; speed: number; phase: number; tilt: number; spin: number; bob: number };
      const orbiters: Orbiter[] = [];
      const makers = [parcel, coin, phone, parcel, chat, coin, parcel, coin, chat, parcel];
      makers.forEach((make, n) => {
        const obj = make();
        const ringIndex = n % 3;
        orbiters.push({
          obj,
          r: [2.9, 3.9, 4.9][ringIndex],
          speed: [0.32, 0.22, 0.16][ringIndex] * (n % 2 ? 1 : 0.85),
          phase: (n / makers.length) * Math.PI * 2 + ringIndex,
          tilt: [1.15, 1.35, 1.05][ringIndex],
          spin: 0.4 + (n % 4) * 0.15,
          bob: n * 1.7,
        });
        world.add(obj);
      });

      // Sparkles
      const N = 140;
      const pos = new Float32Array(N * 3);
      for (let k = 0; k < N; k++) {
        const r = 5 + Math.random() * 4;
        const t = Math.random() * Math.PI * 2;
        const p = (Math.random() - 0.5) * 3.5;
        pos.set([Math.cos(t) * r, p, Math.sin(t) * r], k * 3);
      }
      const dust = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({ color: 0xfde68a, size: 0.05, transparent: true, opacity: 0.8 }),
      );
      world.add(dust);

      // Size + pointer
      const resize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = w < 520 ? 16 : 13;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      const pointer = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      const clock = new THREE.Clock();
      const frame = (t: number) => {
        core.rotation.y = t * 0.25;
        shell.rotation.y = -t * 0.12;
        shell.rotation.x = t * 0.08;
        core.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
        rings.forEach((ring, n) => (ring.rotation.z = t * (0.05 + n * 0.02)));
        for (const o of orbiters) {
          const a = o.phase + t * o.speed;
          const x = Math.cos(a) * o.r;
          const z = Math.sin(a) * o.r;
          // Tilt the orbit plane to match its ring
          o.obj.position.set(x, -z * Math.cos(o.tilt) + Math.sin(t + o.bob) * 0.12, z * Math.sin(o.tilt) * 0.35);
          o.obj.rotation.x = t * o.spin * 0.6;
          o.obj.rotation.y = t * o.spin;
        }
        amber.position.set(Math.cos(t * 0.5) * 5, 2 + Math.sin(t * 0.7), 4);
        teal.position.set(Math.cos(t * 0.4 + 2) * -6, -2, 3);
        green.position.set(Math.sin(t * 0.3) * 4, -3 + Math.cos(t * 0.5), 5);
        dust.rotation.y = t * 0.03;
        world.rotation.y += (pointer.x * 0.35 - world.rotation.y) * 0.04;
        world.rotation.x += (-pointer.y * 0.18 + 0.12 - world.rotation.x) * 0.04;
        renderer.render(scene, camera);
      };

      let raf = 0;
      let visible = false;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        frame(clock.getElapsedTime());
      };
      if (reduce) frame(2.5);
      else loop();
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 });
      io.observe(el);

      dispose = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          m.geometry?.dispose?.();
          const mat = m.material as import("three").Material | import("three").Material[] | undefined;
          (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Load three.js only when the section gets close
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          near.disconnect();
          start().catch(() => setFallback(true));
        }
      },
      { rootMargin: "400px" },
    );
    near.observe(el);
    return () => {
      cancelled = true;
      near.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <div ref={host} className={`relative ${className}`} aria-hidden="true">
      {fallback && <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.55),transparent_60%)] blur-2xl" />}
    </div>
  );
}
