"use client";

/* The signature: a bounded WebGL "reactor core" that reads the build.
   Presentation only — it renders values already computed in src/lib, mapped to
   visual params by the parent:
     power         0..1  → core size + glow
     physicalShare 0..1  → hue (1 = orange/physical, 0 = teal/magic)
     energy        0..1  → emissive intensity + glow pulse (from DPS)
     spin          ~0..1.5 → rotation speed (from attack speed)
     shards        0..6  → lit orbiting shards (filled item slots)

   Deliberately NOT a full-page/fixed layer and NOT post-processed (no bloom):
   a single bounded canvas keeps it off the Chromium blank-paint path and cheap
   on an M-series laptop. Loaded via next/dynamic({ ssr:false }) so three.js is
   code-split out of the initial bundle and never runs during SSR. */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "./motion";

export interface ReactorProps {
  power: number;
  physicalShare: number;
  energy: number;
  spin: number;
  shards: number;
  className?: string;
}

const ORANGE = new THREE.Color("#ff8811");
const TEAL = new THREE.Color("#9dd9d2");
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export default function ReactorCore({
  power,
  physicalShare,
  energy,
  spin,
  shards,
  className = "",
}: ReactorProps) {
  const reduced = usePrefersReducedMotion();
  const mountRef = useRef<HTMLDivElement>(null);

  // Latest targets, read by the animation loop without re-running setup.
  const targetRef = useRef({ power, physicalShare, energy, spin, shards });
  targetRef.current = { power, physicalShare, energy, spin, shards };

  // Set by setup so the reduced-motion path can re-render on prop change.
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 240;
    let height = mount.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // no WebGL — parent already shows numbers; canvas just stays empty
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    scene.add(new THREE.AmbientLight(0xfff3e6, 0.45));
    const key = new THREE.DirectionalLight(0xffe8cf, 0.9);
    key.position.set(2, 3, 2.5);
    scene.add(key);
    const rim = new THREE.PointLight(0x9dd9d2, 0.6, 20);
    rim.position.set(-2.5, -1, 1.5);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    // Inner faceted core.
    const coreGeo = new THREE.IcosahedronGeometry(1, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff8811,
      emissive: 0xff8811,
      emissiveIntensity: 0.8,
      flatShading: true,
      metalness: 0.25,
      roughness: 0.45,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Wireframe cage that counter-rotates.
    const cageGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.42, 1));
    const cageMat = new THREE.LineBasicMaterial({
      color: 0x9dd9d2,
      transparent: true,
      opacity: 0.34,
    });
    const cage = new THREE.LineSegments(cageGeo, cageMat);
    group.add(cage);

    // Additive glow shell (fake bloom without post-processing).
    const glowGeo = new THREE.SphereGeometry(1, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff8811,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // Orbiting shards — one per filled item slot.
    const shardGroup = new THREE.Group();
    shardGroup.rotation.x = 0.5;
    group.add(shardGroup);
    const SHARD_MAX = 6;
    const shardGeo = new THREE.OctahedronGeometry(0.13, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xf4d06f,
      emissive: 0xf4d06f,
      emissiveIntensity: 0.7,
      flatShading: true,
      metalness: 0.3,
      roughness: 0.4,
    });
    const shardMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < SHARD_MAX; i++) {
      const m = new THREE.Mesh(shardGeo, shardMat);
      const a = (i / SHARD_MAX) * Math.PI * 2;
      m.position.set(Math.cos(a) * 1.85, 0, Math.sin(a) * 1.85);
      m.scale.setScalar(0);
      shardGroup.add(m);
      shardMeshes.push(m);
    }

    // Smoothed visual state (eased toward targets each frame).
    const cur = { power, share: physicalShare, energy, shards };
    const shardScale = new Array(SHARD_MAX).fill(0);
    const tmpColor = new THREE.Color();

    const apply = () => {
      const coreScale = 0.55 + cur.power * 0.55;
      core.scale.setScalar(coreScale);
      glow.scale.setScalar(coreScale * 1.7);
      cage.scale.setScalar(0.92 + cur.power * 0.18);

      tmpColor.copy(TEAL).lerp(ORANGE, clamp01(cur.share));
      coreMat.color.copy(tmpColor);
      coreMat.emissive.copy(tmpColor);
      coreMat.emissiveIntensity = 0.55 + cur.energy * 1.25;
      glowMat.color.copy(tmpColor);
      rim.color.copy(tmpColor).lerp(TEAL, 0.5);

      for (let i = 0; i < SHARD_MAX; i++) {
        const want = i < Math.round(cur.shards) ? 1 : 0;
        shardScale[i] += (want - shardScale[i]) * 0.18;
        shardMeshes[i].scale.setScalar(shardScale[i]);
      }
    };

    const renderFrame = () => {
      apply();
      renderer.render(scene, camera);
    };
    drawRef.current = renderFrame;

    let raf = 0;
    let running = false;
    let last = 0;
    let elapsed = 0;

    const animate = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      elapsed += dt;
      const t = elapsed;
      const tgt = targetRef.current;

      cur.power += (tgt.power - cur.power) * 0.08;
      cur.share += (tgt.physicalShare - cur.share) * 0.08;
      cur.energy += (tgt.energy - cur.energy) * 0.08;
      cur.shards += (tgt.shards - cur.shards) * 0.14;

      const rot = 0.12 + tgt.spin * 0.6;
      core.rotation.y += rot * dt;
      core.rotation.x += rot * 0.35 * dt;
      cage.rotation.y -= rot * 0.5 * dt;
      cage.rotation.z += rot * 0.16 * dt;
      shardGroup.rotation.y += (0.18 + tgt.spin * 0.4) * dt;
      group.position.y = Math.sin(t * 0.9) * 0.045;
      glowMat.opacity = 0.06 + cur.energy * 0.14 + Math.sin(t * 1.6) * 0.03 * (0.4 + cur.energy);

      renderFrame();
      raf = requestAnimationFrame(animate);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(animate);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (!reduced) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderFrame();
    });
    ro.observe(mount);

    if (reduced) {
      renderFrame(); // one static, representative frame
    } else {
      start();
    }

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      drawRef.current = null;
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // Rebuild only when reduced-motion toggles; live values flow via targetRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Reduced motion has no loop — redraw when the build changes.
  useEffect(() => {
    if (reduced) drawRef.current?.();
  }, [reduced, power, physicalShare, energy, spin, shards]);

  return (
    <div
      ref={mountRef}
      className={`ae-reactor ${className}`}
      role="img"
      aria-label="Build reactor core — a live 3D readout of your build's power and damage type"
    />
  );
}
