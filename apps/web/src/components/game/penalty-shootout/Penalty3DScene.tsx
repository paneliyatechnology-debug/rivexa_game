'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface TargetSpot3D {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
}

interface Penalty3DSceneProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE';
  isRoundActive: boolean;
  isKicking: boolean;
  animatingShot: {
    targetSpot: number;
    customTarget?: { x: number; y: number; z: number };
    keeperSpot: number;
    isGoal: boolean;
    step: 'IDLE' | 'KICKING' | 'RESULT';
  };
  onShootSpot: (spotId: number, customTarget?: { x: number; y: number; z: number }) => void;
  onBallClick?: () => void;
  onShotImpact?: (isGoal: boolean) => void;
  onShotComplete?: () => void;
  soundEnabled?: boolean;
}

// ── Easing Functions ──────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// EaseOutBack: overshoots slightly then settles (spring-feel)
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
// Smooth Bezier-like ball arc: fast start, decelerates as it reaches target
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export function Penalty3DScene({
  difficulty,
  isRoundActive,
  isKicking,
  animatingShot,
  onShootSpot,
  onBallClick,
  onShotImpact,
  onShotComplete,
}: Penalty3DSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Use refs for props that update frequently to prevent full Three.js scene remounts
  const isRoundActiveRef = useRef(isRoundActive);
  isRoundActiveRef.current = isRoundActive;

  const isKickingRef = useRef(isKicking);
  isKickingRef.current = isKicking;

  const animatingShotRef = useRef(animatingShot);
  animatingShotRef.current = animatingShot;

  const onShootSpotRef = useRef(onShootSpot);
  onShootSpotRef.current = onShootSpot;

  const onBallClickRef = useRef(onBallClick);
  onBallClickRef.current = onBallClick;

  const onShotImpactRef = useRef(onShotImpact);
  onShotImpactRef.current = onShotImpact;

  const onShotCompleteRef = useRef(onShotComplete);
  onShotCompleteRef.current = onShotComplete;

  // Target coordinates in 3D world space (Goal is at z = -3.2, width = 6.4, height = 2.5)
  const getSpotsForDifficulty = (diff: string): TargetSpot3D[] => {
    if (diff === 'HARD' || diff === 'HARDCORE') {
      return [
        { id: 1, name: 'Top-Left', x: -2.35, y: 1.95, z: -3.15 },
        { id: 2, name: 'Top-Right', x: 2.35, y: 1.95, z: -3.15 },
        { id: 3, name: 'Mid-Left', x: -2.35, y: 1.25, z: -3.15 },
        { id: 4, name: 'Mid-Right', x: 2.35, y: 1.25, z: -3.15 },
        { id: 5, name: 'Bottom-Left', x: -2.35, y: 0.55, z: -3.15 },
        { id: 6, name: 'Bottom-Right', x: 2.35, y: 0.55, z: -3.15 },
        { id: 7, name: 'Top Center', x: 0.0, y: 1.95, z: -3.15 },
        { id: 8, name: 'Low Center', x: 0.0, y: 0.75, z: -3.15 },
      ];
    }
    if (diff === 'EASY') {
      return [
        { id: 1, name: 'Top-Left', x: -2.3, y: 1.95, z: -3.15 },
        { id: 2, name: 'Top-Right', x: 2.3, y: 1.95, z: -3.15 },
        { id: 3, name: 'Bottom-Left', x: -2.3, y: 0.55, z: -3.15 },
        { id: 4, name: 'Bottom-Right', x: 2.3, y: 0.55, z: -3.15 },
      ];
    }
    // Medium (5 spots)
    return [
      { id: 1, name: 'Top-Left', x: -2.3, y: 1.95, z: -3.15 },
      { id: 2, name: 'Top-Right', x: 2.3, y: 1.95, z: -3.15 },
      { id: 3, name: 'Center', x: 0.0, y: 1.45, z: -3.15 },
      { id: 4, name: 'Bottom-Left', x: -2.3, y: 0.55, z: -3.15 },
      { id: 5, name: 'Bottom-Right', x: 2.3, y: 0.55, z: -3.15 },
    ];
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // ── 1. Scene, Camera & Renderer ─────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.44, 4.3);
    camera.lookAt(0, 1.38, -3.2);

    // Store camera base position for shake
    const cameraBasePos = camera.position.clone();
    const cameraBaseLookAt = new THREE.Vector3(0, 1.38, -3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();

    // ── 2. Lighting ──────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    scene.add(ambientLight);

    const floodLightLeft = new THREE.DirectionalLight(0xe0f2fe, 1.8);
    floodLightLeft.position.set(-10, 14, 8);
    scene.add(floodLightLeft);

    const floodLightRight = new THREE.DirectionalLight(0xf0fdf4, 1.5);
    floodLightRight.position.set(10, 14, 8);
    scene.add(floodLightRight);

    // ── 3. Sky + Stadium Backdrop ────────────────────────────────────────────
    textureLoader.load('/assets/penalty-nations-cup/sky.png', (skyTex) => {
      skyTex.colorSpace = THREE.SRGBColorSpace;
      const skyGeo = new THREE.PlaneGeometry(32, 18);
      const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false });
      const skyMesh = new THREE.Mesh(skyGeo, skyMat);
      skyMesh.position.set(0, 5.0, -8.5);
      scene.add(skyMesh);
    });

    textureLoader.load('/assets/penalty-nations-cup/stadium.png', (stadTex) => {
      stadTex.colorSpace = THREE.SRGBColorSpace;
      const stadGeo = new THREE.PlaneGeometry(28, 16);
      const stadMat = new THREE.MeshBasicMaterial({ map: stadTex, transparent: true, depthWrite: false });
      const stadMesh = new THREE.Mesh(stadGeo, stadMat);
      stadMesh.position.set(0, 4.4, -6.8);
      scene.add(stadMesh);
    });

    textureLoader.load('/assets/penalty-nations-cup/banners.png', (bannerTex) => {
      bannerTex.colorSpace = THREE.SRGBColorSpace;
      const bannerGeo = new THREE.PlaneGeometry(22, 1.35);
      const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, depthWrite: false });
      const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
      bannerMesh.position.set(0, 0.68, -4.2);
      scene.add(bannerMesh);
    });

    // ── 4. Pitch-side Props ──────────────────────────────────────────────────
    textureLoader.load('/assets/penalty-nations-cup/video_camera.png', (camTex) => {
      camTex.colorSpace = THREE.SRGBColorSpace;
      const camMat = new THREE.SpriteMaterial({ map: camTex });
      const camSprite = new THREE.Sprite(camMat);
      camSprite.scale.set(1.1, 1.7, 1);
      camSprite.position.set(-4.4, 0.85, -3.6);
      scene.add(camSprite);
    });

    textureLoader.load('/assets/penalty-nations-cup/cup.png', (cupTex) => {
      cupTex.colorSpace = THREE.SRGBColorSpace;
      const cupMat = new THREE.SpriteMaterial({ map: cupTex });
      const cupSprite = new THREE.Sprite(cupMat);
      cupSprite.scale.set(1.2, 1.6, 1);
      cupSprite.position.set(4.4, 0.8, -3.6);
      scene.add(cupSprite);
    });

    textureLoader.load('/assets/penalty-nations-cup/bottle.png', (botTex) => {
      botTex.colorSpace = THREE.SRGBColorSpace;
      const botMat = new THREE.SpriteMaterial({ map: botTex });
      const botSprite = new THREE.Sprite(botMat);
      botSprite.scale.set(0.2, 0.32, 1);
      botSprite.position.set(-3.45, 0.16, -3.15);
      scene.add(botSprite);
    });

    // ── 5. 3D Turf Pitch ─────────────────────────────────────────────────────
    const pitchGeo = new THREE.PlaneGeometry(42, 32);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
      metalness: 0.05,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0, 2.5); // Extended forward so green grass covers all the way to screen bottom edge
    scene.add(pitch);

    textureLoader.load('/assets/penalty-nations-cup/grass.png', (grassTex) => {
      grassTex.colorSpace = THREE.SRGBColorSpace;
      grassTex.wrapS = THREE.RepeatWrapping;
      grassTex.wrapT = THREE.RepeatWrapping;
      grassTex.repeat.set(8, 6);
      pitchMat.map = grassTex;
      pitchMat.color.setHex(0xffffff);
      pitchMat.needsUpdate = true;
    });

    // Pitch Lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2.5, transparent: true, opacity: 0.85 });
    const goalLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5.2, 0.015, -3.2),
      new THREE.Vector3(5.2, 0.015, -3.2),
    ]);
    scene.add(new THREE.Line(goalLineGeo, lineMat));

    const spotGeo = new THREE.CircleGeometry(0.12, 32);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const penaltySpot = new THREE.Mesh(spotGeo, spotMat);
    penaltySpot.rotation.x = -Math.PI / 2;
    penaltySpot.position.set(0, 0.018, 0.55);
    scene.add(penaltySpot);

    // ── 6. 3D Goal Post ──────────────────────────────────────────────────────
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      metalness: 0.35,
    });

    const postRadius = 0.06;
    const goalWidth = 6.4;
    const goalHeight = 2.5;
    const goalDepth = 1.35;
    const goalZ = -3.2;

    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 24);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, goalHeight, goalZ);
    scene.add(crossbar);

    const leftPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 24);
    const leftPost = new THREE.Mesh(leftPostGeo, postMat);
    leftPost.position.set(-goalWidth / 2, goalHeight / 2, goalZ);
    scene.add(leftPost);

    const rightPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 24);
    const rightPost = new THREE.Mesh(rightPostGeo, postMat);
    rightPost.position.set(goalWidth / 2, goalHeight / 2, goalZ);
    scene.add(rightPost);

    const topDepthLeftGeo = new THREE.CylinderGeometry(0.038, 0.038, goalDepth, 16);
    const topDepthLeft = new THREE.Mesh(topDepthLeftGeo, postMat);
    topDepthLeft.rotation.x = Math.PI / 2;
    topDepthLeft.position.set(-goalWidth / 2, goalHeight, goalZ - goalDepth / 2);
    scene.add(topDepthLeft);

    const topDepthRight = new THREE.Mesh(topDepthLeftGeo, postMat);
    topDepthRight.rotation.x = Math.PI / 2;
    topDepthRight.position.set(goalWidth / 2, goalHeight, goalZ - goalDepth / 2);
    scene.add(topDepthRight);

    const backCrossbarGeo = new THREE.CylinderGeometry(0.038, 0.038, goalWidth, 16);
    const backCrossbar = new THREE.Mesh(backCrossbarGeo, postMat);
    backCrossbar.rotation.z = Math.PI / 2;
    backCrossbar.position.set(0, goalHeight, goalZ - goalDepth);
    scene.add(backCrossbar);

    const backGroundBar = new THREE.Mesh(backCrossbarGeo, postMat);
    backGroundBar.rotation.z = Math.PI / 2;
    backGroundBar.position.set(0, 0.038, goalZ - goalDepth);
    scene.add(backGroundBar);

    // ── 7. Goal Net ──────────────────────────────────────────────────────────
    const netTextureCanvas = document.createElement('canvas');
    netTextureCanvas.width = 64;
    netTextureCanvas.height = 64;
    const nctx = netTextureCanvas.getContext('2d');
    if (nctx) {
      nctx.strokeStyle = 'rgba(110, 231, 183, 0.85)';
      nctx.lineWidth = 1.8;
      nctx.beginPath();
      nctx.moveTo(0, 32); nctx.lineTo(64, 32);
      nctx.moveTo(32, 0); nctx.lineTo(32, 64);
      nctx.stroke();
    }
    const netTex = new THREE.CanvasTexture(netTextureCanvas);
    netTex.wrapS = THREE.RepeatWrapping;
    netTex.wrapT = THREE.RepeatWrapping;
    netTex.repeat.set(52, 22);

    const netBackMat = new THREE.MeshBasicMaterial({
      map: netTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const netBackGeo = new THREE.PlaneGeometry(goalWidth, goalHeight);
    const netBackMesh = new THREE.Mesh(netBackGeo, netBackMat);
    netBackMesh.position.set(0, goalHeight / 2, goalZ - goalDepth);
    scene.add(netBackMesh);

    const netTopGeo = new THREE.PlaneGeometry(goalWidth, goalDepth);
    const netTopMesh = new THREE.Mesh(netTopGeo, netBackMat);
    netTopMesh.rotation.x = Math.PI / 2;
    netTopMesh.position.set(0, goalHeight, goalZ - goalDepth / 2);
    scene.add(netTopMesh);

    const netSideGeo = new THREE.PlaneGeometry(goalDepth, goalHeight);
    const netLeftMesh = new THREE.Mesh(netSideGeo, netBackMat);
    netLeftMesh.rotation.y = Math.PI / 2;
    netLeftMesh.position.set(-goalWidth / 2, goalHeight / 2, goalZ - goalDepth / 2);
    scene.add(netLeftMesh);

    const netRightMesh = new THREE.Mesh(netSideGeo, netBackMat);
    netRightMesh.rotation.y = -Math.PI / 2;
    netRightMesh.position.set(goalWidth / 2, goalHeight / 2, goalZ - goalDepth / 2);
    scene.add(netRightMesh);

    // ── 8. Goalkeeper Sprite ─────────────────────────────────────────────────
    const keeperImgPath =
      difficulty === 'EASY'
        ? '/assets/penalty-nations-cup/player_easy.png'
        : difficulty === 'HARD' || difficulty === 'HARDCORE'
        ? '/assets/penalty-nations-cup/player_hard.png'
        : '/assets/penalty-nations-cup/player_medium.png';

    let keeperSprite: THREE.Sprite | null = null;
    let keeperMeshShadow: THREE.Mesh | null = null;
    const keeperBaseX = 0;
    const keeperHeight = 2.45;
    let keeperWidth = 2.45 * 0.791;
    const keeperBaseY = keeperHeight / 2; // bottom feet on ground (y = 0)
    const keeperZ = goalZ + 0.12;         // stand directly on the goal line

    textureLoader.load(keeperImgPath, (kTexture) => {
      kTexture.colorSpace = THREE.SRGBColorSpace;
      const kMat = new THREE.SpriteMaterial({
        map: kTexture,
        depthTest: true,
        depthWrite: false,
      });
      keeperSprite = new THREE.Sprite(kMat);
      keeperSprite.renderOrder = 15;
      const img = kTexture.image;
      const aspect = img && img.width && img.height ? img.width / img.height : 0.791;
      keeperWidth = keeperHeight * aspect;
      keeperSprite.scale.set(keeperWidth, keeperHeight, 1);
      keeperSprite.position.set(keeperBaseX, keeperBaseY, keeperZ);
      scene.add(keeperSprite);
    });

    // Goalkeeper shadow
    textureLoader.load('/assets/penalty-nations-cup/shadow.png', (sTexture) => {
      sTexture.colorSpace = THREE.SRGBColorSpace;
      const sMat = new THREE.MeshBasicMaterial({ map: sTexture, transparent: true, opacity: 0.65, depthWrite: false });
      keeperMeshShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.75), sMat);
      keeperMeshShadow.rotation.x = -Math.PI / 2;
      keeperMeshShadow.position.set(0, 0.02, keeperZ);
      scene.add(keeperMeshShadow);
    });

    // ── 9. 3D Soccer Ball & Aiming Reticle ──────────────────────────────────
    let ballMesh: THREE.Mesh | null = null;
    let ballReticleSprite: THREE.Sprite | null = null;
    const ballStartPos = new THREE.Vector3(0, 0.28, 0.55);

    // Ball Ground Shadow
    let ballShadowMesh: THREE.Mesh | null = null;
    textureLoader.load('/assets/penalty-nations-cup/shadow.png', (bsTex) => {
      bsTex.colorSpace = THREE.SRGBColorSpace;
      const bsMat = new THREE.MeshBasicMaterial({ map: bsTex, transparent: true, opacity: 0.85, depthWrite: false });
      ballShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.40), bsMat);
      ballShadowMesh.rotation.x = -Math.PI / 2;
      ballShadowMesh.position.set(0, 0.02, 0.55);
      scene.add(ballShadowMesh);
    });

    // Classic Black & White Soccer Ball with 360 rotation
    textureLoader.load('/assets/penalty-nations-cup/soccer_ball_pattern.jpg', (ballTex) => {
      ballTex.colorSpace = THREE.SRGBColorSpace;
      const bGeo = new THREE.SphereGeometry(0.26, 64, 64);
      const bMat = new THREE.MeshStandardMaterial({
        map: ballTex,
        roughness: 0.32,
        metalness: 0.06,
      });
      ballMesh = new THREE.Mesh(bGeo, bMat);
      ballMesh.position.copy(ballStartPos);
      scene.add(ballMesh);
    });

    // 3D Aiming Reticle Ring with 4 Arrows (Green idle, Amber on mouse drag)
    const createBallReticleTexture = (ringColor = '#4ade80', arrowColor = '#22c55e') => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 256, 256);
        const cx = 128;
        const cy = 128;
        const r = 94;

        // Circular glowing ring
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Green / Amber triangular arrows pointing inward
        ctx.fillStyle = arrowColor;
        const arrowSize = 14;
        const offset = 14;

        // Top arrow (points down)
        ctx.beginPath();
        ctx.moveTo(cx, cy - r - offset + arrowSize * 1.3);
        ctx.lineTo(cx - arrowSize * 0.7, cy - r - offset);
        ctx.lineTo(cx + arrowSize * 0.7, cy - r - offset);
        ctx.closePath();
        ctx.fill();

        // Bottom arrow (points up)
        ctx.beginPath();
        ctx.moveTo(cx, cy + r + offset - arrowSize * 1.3);
        ctx.lineTo(cx - arrowSize * 0.7, cy + r + offset);
        ctx.lineTo(cx + arrowSize * 0.7, cy + r + offset);
        ctx.closePath();
        ctx.fill();

        // Left arrow (points right)
        ctx.beginPath();
        ctx.moveTo(cx - r - offset + arrowSize * 1.3, cy);
        ctx.lineTo(cx - r - offset, cy - arrowSize * 0.7);
        ctx.lineTo(cx - r - offset, cy + arrowSize * 0.7);
        ctx.closePath();
        ctx.fill();

        // Right arrow (points left)
        ctx.beginPath();
        ctx.moveTo(cx + r + offset - arrowSize * 1.3, cy);
        ctx.lineTo(cx + r + offset, cy - arrowSize * 0.7);
        ctx.lineTo(cx + r + offset, cy + arrowSize * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const reticleGreenTex = createBallReticleTexture('#4ade80', '#22c55e');
    const reticleOrangeTex = createBallReticleTexture('#fbbf24', '#f97316');

    const reticleMat = new THREE.SpriteMaterial({
      map: reticleGreenTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    ballReticleSprite = new THREE.Sprite(reticleMat);
    ballReticleSprite.renderOrder = 22;
    ballReticleSprite.scale.set(0.92, 0.92, 1);
    ballReticleSprite.position.set(ballStartPos.x, ballStartPos.y, ballStartPos.z);
    scene.add(ballReticleSprite);

    // Goal Aiming Crosshair Sprite (appears over goal net when dragging to aim)
    const createAimCrosshairTexture = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 128, 128);
        const cx = 64;
        const cy = 64;

        // Outer white ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 48, 0, Math.PI * 2);
        ctx.stroke();

        // 4 crosshair tick marks
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(cx, 4); ctx.lineTo(cx, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 124); ctx.lineTo(cx, 110); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, cy); ctx.lineTo(18, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(124, cy); ctx.lineTo(110, cy); ctx.stroke();

        // Inner blue glowing circle
        ctx.fillStyle = 'rgba(59, 130, 246, 0.75)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const crosshairTex = createAimCrosshairTexture();
    const crosshairMat = new THREE.SpriteMaterial({
      map: crosshairTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const aimCrosshairSprite = new THREE.Sprite(crosshairMat);
    aimCrosshairSprite.scale.set(0.82, 0.82, 1);
    aimCrosshairSprite.position.set(0, 1.45, -3.14);
    aimCrosshairSprite.renderOrder = 30;
    scene.add(aimCrosshairSprite);

    // ── 10. Goal Flash Plane (flashes green on goal) ─────────────────────────
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flashPlane = new THREE.Mesh(new THREE.PlaneGeometry(goalWidth, goalHeight), flashMat);
    flashPlane.position.set(0, goalHeight / 2, goalZ - 0.05);
    scene.add(flashPlane);

    // ── 11. Interactive Free-Aim Goal Net Hit Plane (Aim anywhere in the net!) ──
    const goalHitGeo = new THREE.PlaneGeometry(6.2, 2.45);
    const goalHitMat = new THREE.MeshBasicMaterial({ visible: false, depthWrite: false });
    const goalHitMesh = new THREE.Mesh(goalHitGeo, goalHitMat);
    goalHitMesh.position.set(0, 1.25, -3.15);
    scene.add(goalHitMesh);

    const spots = getSpotsForDifficulty(difficulty);

    const mapCoordToSpot = (targetX: number, targetY: number): number => {
      let closest = spots[0];
      let minDist = Infinity;
      for (const s of spots) {
        const d = Math.hypot(s.x - targetX, s.y - targetY);
        if (d < minDist) {
          minDist = d;
          closest = s;
        }
      }
      return closest.id;
    };

    // ── 11b. Ball Motion Trail ──────────────────────────────────────────────
    const TRAIL_MAX = 16;
    const trailPositions = new Float32Array(TRAIL_MAX * 3);
    const trailColors = new Float32Array(TRAIL_MAX * 3);
    for (let i = 0; i < TRAIL_MAX; i++) {
      const alpha = (TRAIL_MAX - i) / TRAIL_MAX;
      trailColors[i * 3 + 0] = 0.75 * alpha;
      trailColors[i * 3 + 1] = 0.95 * alpha;
      trailColors[i * 3 + 2] = 1.00 * alpha;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    trailLine.frustumCulled = false;
    trailLine.visible = false;
    scene.add(trailLine);
    const trailHistory: THREE.Vector3[] = [];

    // ── 11c. 3D Confetti Particle System on Goal ─────────────────────────────
    const CONFETTI_COUNT = 55;
    const confettiGeo = new THREE.BufferGeometry();
    const confettiPositions = new Float32Array(CONFETTI_COUNT * 3);
    const confettiVelocities: THREE.Vector3[] = [];
    const confettiColors = new Float32Array(CONFETTI_COUNT * 3);
    const confettiPalette = [
      [1.0, 0.82, 0.0],  // Gold
      [0.2, 0.95, 0.45], // Emerald
      [0.25, 0.65, 1.0], // Cyan
      [1.0, 0.3, 0.45],  // Coral
      [0.9, 0.45, 1.0],  // Magenta
    ];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      confettiPositions[i * 3 + 0] = 0;
      confettiPositions[i * 3 + 1] = -15; // hidden offscreen
      confettiPositions[i * 3 + 2] = goalZ;
      confettiVelocities.push(new THREE.Vector3());
      const col = confettiPalette[i % confettiPalette.length];
      confettiColors[i * 3 + 0] = col[0];
      confettiColors[i * 3 + 1] = col[1];
      confettiColors[i * 3 + 2] = col[2];
    }
    confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
    confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));
    const confettiMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const confettiPoints = new THREE.Points(confettiGeo, confettiMat);
    scene.add(confettiPoints);
    let confettiActive = false;
    let confettiTimer = 0;

    const triggerConfetti = () => {
      confettiActive = true;
      confettiTimer = 2.2;
      const posAttr = confettiGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        posAttr.setXYZ(i, (Math.random() - 0.5) * 5.0, goalHeight + (Math.random() - 0.3) * 0.6, goalZ + (Math.random() - 0.5) * 0.8);
        confettiVelocities[i].set(
          (Math.random() - 0.5) * 3.8,
          2.0 + Math.random() * 3.5,
          (Math.random() - 0.5) * 2.2
        );
      }
      posAttr.needsUpdate = true;
    };

    // ── 11d. Save Glove Sparks ───────────────────────────────────────────────
    const SPARK_COUNT = 24;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(SPARK_COUNT * 3);
    const sparkVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkPositions[i * 3 + 0] = 0;
      sparkPositions[i * 3 + 1] = -15;
      sparkPositions[i * 3 + 2] = 0;
      sparkVelocities.push(new THREE.Vector3());
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.14,
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);
    let sparkActive = false;
    let sparkTimer = 0;

    const triggerSaveSparks = (x: number, y: number, z: number) => {
      sparkActive = true;
      sparkTimer = 0.45;
      sparkMat.opacity = 1.0;
      const posAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SPARK_COUNT; i++) {
        posAttr.setXYZ(i, x, y, z);
        const ang = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 4.5;
        sparkVelocities[i].set(Math.cos(ang) * spd, Math.sin(ang) * spd + 1.2, (Math.random() - 0.2) * 3.0);
      }
      posAttr.needsUpdate = true;
    };

    // ── 12. Interaction: Free-Aim Goal Net & Ball 360 Drag Interaction ────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredTargetId: number | null = null;
    let hoveredNetCoord: { x: number; y: number; z: number } | null = null;

    let isDraggingBall = false;
    let isHoveringBall = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let hasDraggedDistance = false;

    // Camera-relative rotation axes for unconstrained 360° spherical trackball
    const WORLD_UP = new THREE.Vector3(0, 1, 0);
    const WORLD_RIGHT = new THREE.Vector3(1, 0, 0);

    // Ball Angular Velocity for smooth inertia and flick physics
    let ballAngVelPitch = 0; // vertical roll velocity
    let ballAngVelYaw = 0;   // horizontal yaw velocity

    const getBallScreenPos = () => {
      const rect = container.getBoundingClientRect();
      const tempV = ballStartPos.clone().project(camera);
      return {
        x: ((tempV.x + 1) * 0.5) * rect.width + rect.left,
        y: ((-tempV.y + 1) * 0.5) * rect.height + rect.top,
      };
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (isKickingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check distance to ball center in screen pixels (95px covers ball & reticle)
      const ballCenter = getBallScreenPos();
      const distToBall = Math.hypot(clientX - ballCenter.x, clientY - ballCenter.y);

      const ballTargets = [];
      if (ballMesh) ballTargets.push(ballMesh);
      if (ballReticleSprite) ballTargets.push(ballReticleSprite);
      const ballHits = raycaster.intersectObjects(ballTargets);

      if (distToBall < 95 || ballHits.length > 0) {
        isDraggingBall = true;
        dragStartX = clientX;
        dragStartY = clientY;
        lastPointerX = clientX;
        lastPointerY = clientY;
        hasDraggedDistance = false;
        ballAngVelPitch = 0;
        ballAngVelYaw = 0;
        container.style.cursor = 'grabbing';
        if (ballReticleSprite) {
          ballReticleSprite.material.map = reticleOrangeTex;
          ballReticleSprite.material.needsUpdate = true;
        }
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (isDraggingBall && ballMesh && !isFlying) {
        const deltaX = clientX - lastPointerX;
        const deltaY = clientY - lastPointerY;

        if (Math.hypot(clientX - dragStartX, clientY - dragStartY) > 6) {
          hasDraggedDistance = true;
        }

        // Snappy, completely unconstrained 360° spherical trackball rotation in all directions
        const dragRotateSpeed = 0.038;
        const qYaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, deltaX * dragRotateSpeed);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(WORLD_RIGHT, deltaY * dragRotateSpeed);
        const qRot = new THREE.Quaternion().multiplyQuaternions(qPitch, qYaw);
        ballMesh.quaternion.premultiply(qRot);

        // Store angular velocity for smooth flick momentum upon release
        ballAngVelYaw = deltaX * dragRotateSpeed;
        ballAngVelPitch = deltaY * dragRotateSpeed;

        lastPointerX = clientX;
        lastPointerY = clientY;

        // Switch to goal aiming mode when dragging up into the goal net zone
        const isDraggingUpToGoal = (dragStartY - clientY > 110) && (clientY < rect.height * 0.58);
        if (isDraggingUpToGoal) {
          const goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 3.15);
          const targetPt = new THREE.Vector3();
          raycaster.ray.intersectPlane(goalPlane, targetPt);

          if (targetPt) {
            const targetX = THREE.MathUtils.clamp(targetPt.x, -2.85, 2.85);
            const targetY = THREE.MathUtils.clamp(targetPt.y, 0.20, 2.40);
            aimCrosshairSprite.position.set(targetX, targetY, -3.14);
            crosshairMat.opacity = 1.0;

            hoveredTargetId = mapCoordToSpot(targetX, targetY);
            hoveredNetCoord = { x: targetX, y: targetY, z: -3.15 };
          }
        } else {
          crosshairMat.opacity = 0;
          hoveredTargetId = null;
          hoveredNetCoord = null;
        }
        return;
      }

      // Free-Aim Hover on the Goal Net (user can aim at any corner or anywhere on the net!)
      const goalHits = raycaster.intersectObject(goalHitMesh);
      if (goalHits.length > 0 && !isKickingRef.current) {
        const hit = goalHits[0].point;
        const targetX = THREE.MathUtils.clamp(hit.x, -2.85, 2.85);
        const targetY = THREE.MathUtils.clamp(hit.y, 0.20, 2.40);
        aimCrosshairSprite.position.set(targetX, targetY, -3.14);
        crosshairMat.opacity = 0.95;
        container.style.cursor = 'pointer';

        hoveredTargetId = mapCoordToSpot(targetX, targetY);
        hoveredNetCoord = { x: targetX, y: targetY, z: -3.15 };
      } else {
        crosshairMat.opacity = 0;
        hoveredTargetId = null;
        hoveredNetCoord = null;

        const ballCenter = getBallScreenPos();
        const distToBall = Math.hypot(clientX - ballCenter.x, clientY - ballCenter.y);
        const ballRayHits = raycaster.intersectObjects([ballMesh, ballReticleSprite].filter(Boolean) as THREE.Object3D[]);

        if ((distToBall < 115 || ballRayHits.length > 0) && !isFlying) {
          isHoveringBall = true;
          container.style.cursor = 'grab';

          // Interactive "hovertime" rotation: ball rotates smoothly with mouse movement over the ball!
          if (!isFlying && ballMesh && lastPointerX !== 0 && lastPointerY !== 0) {
            const hoverDeltaX = clientX - lastPointerX;
            const hoverDeltaY = clientY - lastPointerY;
            if (Math.hypot(hoverDeltaX, hoverDeltaY) > 0.3) {
              const hoverSpeed = 0.04;
              const qYaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, hoverDeltaX * hoverSpeed);
              const qPitch = new THREE.Quaternion().setFromAxisAngle(WORLD_RIGHT, hoverDeltaY * hoverSpeed);
              const qRot = new THREE.Quaternion().multiplyQuaternions(qPitch, qYaw);
              ballMesh.quaternion.premultiply(qRot);

              ballAngVelYaw = hoverDeltaX * hoverSpeed * 0.5;
              ballAngVelPitch = hoverDeltaY * hoverSpeed * 0.5;
            }
          }
        } else {
          isHoveringBall = false;
          container.style.cursor = 'default';
        }
      }

      lastPointerX = clientX;
      lastPointerY = clientY;
    };

    const handlePointerUp = () => {
      if (isDraggingBall) {
        isDraggingBall = false;
        container.style.cursor = 'default';
        if (ballReticleSprite) {
          ballReticleSprite.material.map = reticleGreenTex;
          ballReticleSprite.material.needsUpdate = true;
        }
        crosshairMat.opacity = 0;

        const rect = container.getBoundingClientRect();
        const isDraggingUpToGoal = (dragStartY - lastPointerY > 110) && (lastPointerY < rect.height * 0.58);

        if (isDraggingUpToGoal && hoveredTargetId !== null && !isKickingRef.current) {
          // Dragged all the way up into the goal net: execute shot to that exact spot!
          onShootSpotRef.current(hoveredTargetId, hoveredNetCoord || undefined);
        } else if (!hasDraggedDistance && onBallClickRef.current && !isKickingRef.current) {
          // Quick tap / click on the ball: fires penalty kick!
          onBallClickRef.current();
        }
      }
    };

    const handleClick = () => {
      if (!isDraggingBall && hoveredTargetId !== null && !isKickingRef.current) {
        onShootSpotRef.current(hoveredTargetId, hoveredNetCoord || undefined);
      }
    };

    const handleMouseLeave = () => {
      isHoveringBall = false;
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    container.addEventListener('click', handleClick);

    // ── 13. Animation State ───────────────────────────────────────────────────
    let animId: number;
    const clock = new THREE.Clock();

    // Ball animation state
    let kickProgress = 0;           // 0→1 during flight
    let isFlying = false;
    let ballRebounding = false;
    let ballReboundVel = new THREE.Vector3();
    let prevStep = 'IDLE';
    let impactTriggered = false;
    let completeTriggered = false;
    let postShotTimer = 0;

    // Goalkeeper dive state
    interface DiveProfile {
      x: number;
      y: number;
      rot: number; // in radians
      scaleXMul: number;
      scaleYMul: number;
    }

    const getKeeperDiveProfile = (kSpotId: number): DiveProfile => {
      const s = spots.find((spot) => spot.id === kSpotId) || spots[0];
      const isLow = s.y < 1.0;
      const isHigh = s.y > 1.6;
      const isCenter = Math.abs(s.x) < 0.6;

      if (isCenter) {
        return {
          x: 0.0,
          y: isHigh ? 1.98 : 1.45,
          rot: 0.0,
          scaleXMul: 0.88,
          scaleYMul: 1.22,
        };
      }

      const diveDir = s.x < 0 ? -1 : 1;
      const targetX = diveDir * 2.30;

      if (isLow) {
        // Full horizontal slide along turf
        return {
          x: targetX,
          y: 0.38,
          rot: diveDir * -1.25,
          scaleXMul: 1.20,
          scaleYMul: 0.88,
        };
      }

      if (isHigh) {
        // High leap to top corner
        return {
          x: targetX,
          y: 1.95,
          rot: diveDir * -0.95,
          scaleXMul: 1.02,
          scaleYMul: 1.08,
        };
      }

      // Mid lunging dive
      return {
        x: targetX * 0.95,
        y: 1.15,
        rot: diveDir * -0.78,
        scaleXMul: 1.10,
        scaleYMul: 0.94,
      };
    };

    let keeperDiveProgress = 0;     // 0→1 dive
    let keeperSettleProgress = 0;   // 0→1 post-dive settle
    let keeperDiving = false;
    let activeDiveProfile: DiveProfile = getKeeperDiveProfile(3);

    // Camera shake state
    let shakeIntensity = 0;
    let shakeDuration = 0;

    // Net wiggle
    let netWiggle = 0;
    let netWiggling = false;

    // Goal flash
    let flashProgress = 0;

    // Target idle pulse state
    let targetPulseT = 0;

    // ── Animation Loop ────────────────────────────────────────────────────────
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05); // cap delta to prevent huge jumps
      const elapsed = clock.getElapsedTime();
      const shot = animatingShotRef.current;

      // ── Detect step transitions ─────────────────────────────────────────
      if (shot.step !== prevStep) {
        if ((shot.step === 'KICKING' || shot.step === 'RESULT') && !isFlying) {
          // Ball just kicked — start flight!
          isFlying = true;
          ballRebounding = false;
          kickProgress = 0;
          impactTriggered = false;
          completeTriggered = false;
          postShotTimer = 0;
          trailHistory.length = 0;
          trailLine.visible = true;
          keeperDiving = true;
          keeperDiveProgress = 0;
          keeperSettleProgress = 0;
          activeDiveProfile = getKeeperDiveProfile(shot.keeperSpot || 3);
          netWiggling = false;
          netWiggle = 0;
          flashProgress = 0;
          shakeIntensity = 0;
        }

        if (shot.step === 'RESULT') {
          // Authoritative result received — update dive profile
          keeperDiving = true;
          activeDiveProfile = getKeeperDiveProfile(shot.keeperSpot);
        }

        if (shot.step === 'IDLE') {
          // Round reset
          isFlying = false;
          ballRebounding = false;
          kickProgress = 0;
          impactTriggered = false;
          completeTriggered = false;
          postShotTimer = 0;
          trailLine.visible = false;
          trailHistory.length = 0;
          keeperDiving = false;
          keeperDiveProgress = 0;
          keeperSettleProgress = 0;
          netWiggling = false;
          netWiggle = 0;
          flashProgress = 0;
          shakeIntensity = 0;

          // Reset ball
          if (ballMesh) {
            ballMesh.position.copy(ballStartPos);
            ballMesh.scale.set(1, 1, 1);
            ballMesh.quaternion.setFromAxisAngle(WORLD_RIGHT, 0.12);
            ballAngVelPitch = 0;
            ballAngVelYaw = 0;
          }
          if (ballShadowMesh) {
            ballShadowMesh.position.set(0, 0.02, 0.55);
            (ballShadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
            ballShadowMesh.scale.set(1, 1, 1);
          }
          if (ballReticleSprite) {
            ballReticleSprite.position.copy(ballStartPos);
            (ballReticleSprite.material as THREE.SpriteMaterial).opacity = 0.95;
            ballReticleSprite.scale.set(0.92, 0.92, 1);
          }
          netBackMesh.position.z = goalZ - goalDepth;
          netBackMesh.position.x = 0;
          if (keeperSprite) {
            keeperSprite.position.set(keeperBaseX, keeperBaseY, keeperZ);
            keeperSprite.material.rotation = 0;
            keeperSprite.scale.set(keeperWidth, keeperHeight, 1);
          }
        }

        prevStep = shot.step;
      }

      // ── 1. Ball in IDLE (stays normal facing front, rotates when user drags or hovers) ──
      if (ballReticleSprite && !isFlying) {
        const pulse = 0.92 + Math.sin(elapsed * 3.5) * 0.035;
        ballReticleSprite.scale.set(pulse, pulse, 1);
        (ballReticleSprite.material as THREE.SpriteMaterial).opacity = 0.95;
      } else if (ballReticleSprite && isFlying) {
        // Fade out reticle during kick
        (ballReticleSprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - kickProgress * 3.5);
      }

      // Ball Idle Momentum & Continuous Click-and-Hold / Hover Spin
      if (ballMesh && !isFlying) {
        if (isDraggingBall && !hasDraggedDistance) {
          // Continuous forward 3D spin on click & hold
          const qHoldSpin = new THREE.Quaternion().setFromAxisAngle(WORLD_RIGHT, -0.048);
          ballMesh.quaternion.premultiply(qHoldSpin);
        } else if (isHoveringBall) {
          // Continuous smooth 3D spin when hovering over the ball
          const qHoverYaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, 0.054);
          const qHoverPitch = new THREE.Quaternion().setFromAxisAngle(WORLD_RIGHT, -0.025);
          const qHoverRot = new THREE.Quaternion().multiplyQuaternions(qHoverPitch, qHoverYaw);
          ballMesh.quaternion.premultiply(qHoverRot);
        } else if (!isDraggingBall) {
          // Smooth deceleration / inertia momentum upon release after drag or hover
          if (Math.abs(ballAngVelPitch) > 0.0001 || Math.abs(ballAngVelYaw) > 0.0001) {
            const qYaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, ballAngVelYaw);
            const qPitch = new THREE.Quaternion().setFromAxisAngle(WORLD_RIGHT, ballAngVelPitch);
            const qRot = new THREE.Quaternion().multiplyQuaternions(qPitch, qYaw);
            ballMesh.quaternion.premultiply(qRot);

            ballAngVelPitch *= 0.93;
            ballAngVelYaw *= 0.93;
          }
        }
      }

      // ── 1b. Goalkeeper IDLE Athletic Alert Movement ───────────────────────
      if (keeperSprite && !keeperDiving && shot.step === 'IDLE') {
        // Active athletic foot spring bounce
        const footCycle = Math.sin(elapsed * 4.0);
        const bounceY = Math.max(0, footCycle) * 0.042;
        const kneeFlex = Math.sin(elapsed * 4.0) * 0.032;

        // Weight shifting left-to-right on the balls of feet
        const swayX = Math.sin(elapsed * 2.0) * 0.045;
        const tiltZ = Math.sin(elapsed * 2.0) * 0.024;

        keeperSprite.position.y = keeperBaseY + bounceY;
        keeperSprite.position.x = swayX;
        keeperSprite.material.rotation = tiltZ;
        keeperSprite.scale.set(keeperWidth * (1 + kneeFlex), keeperHeight * (1 - kneeFlex), 1);

        // Shadow tracks feet
        if (keeperMeshShadow) {
          keeperMeshShadow.position.x = swayX;
          keeperMeshShadow.position.z = keeperZ;
          keeperMeshShadow.scale.set(1.0 + Math.abs(swayX) * 0.5, 1.0, 1.0);
          (keeperMeshShadow.material as THREE.MeshBasicMaterial).opacity = 0.65;
        }
      }

      // ── 2. Ball Flight Trajectory & Motion Trail ──────────────────────────
      if (ballMesh && isFlying) {
        if (!ballRebounding) {
          const flightSpeed = 1.48; // Smooth ~0.67s flight duration
          kickProgress = Math.min(1.0, kickProgress + delta * flightSpeed);

          const t = kickProgress;
          const tEased = easeOutQuart(t);

          const spot = spots.find((s) => s.id === shot.targetSpot) || spots[0];
          const endPos = shot.customTarget
            ? new THREE.Vector3(shot.customTarget.x, shot.customTarget.y, shot.customTarget.z)
            : new THREE.Vector3(spot.x, spot.y, spot.z);

          // Parabolic arc with lateral curve for realism
          const currentPos = new THREE.Vector3().lerpVectors(ballStartPos, endPos, tEased);

          // Arc height
          const arcHeight = endPos.y > 1.4 ? 0.35 : 0.65;
          currentPos.y += Math.sin(t * Math.PI) * arcHeight;

          // Lateral curl
          const curlDir = endPos.x > 0 ? 1 : -1;
          currentPos.x += Math.sin(t * Math.PI) * 0.12 * curlDir;

          ballMesh.position.copy(currentPos);

          // High-speed 3D topspin & curl during flight ("through / throw it")
          const flightVec = endPos.clone().sub(ballStartPos);
          const flightDir = flightVec.clone().normalize();
          const rollAxis = new THREE.Vector3().crossVectors(flightDir, WORLD_UP).normalize();
          if (rollAxis.lengthSq() < 0.01) rollAxis.copy(WORLD_RIGHT);

          const spinSpeed = THREE.MathUtils.lerp(46, 20, easeOutCubic(t));
          const qFlightRoll = new THREE.Quaternion().setFromAxisAngle(rollAxis, -spinSpeed * delta);
          ballMesh.quaternion.premultiply(qFlightRoll);

          const curlSpin = (endPos.x > 0 ? 12 : -12) * delta;
          const qFlightCurl = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, curlSpin);
          ballMesh.quaternion.premultiply(qFlightCurl);

          // Perspective scale
          const ballScale = THREE.MathUtils.lerp(1.0, 0.48, easeInOutQuad(t));
          ballMesh.scale.set(ballScale, ballScale, ballScale);

          // Shadow tracking
          if (ballShadowMesh) {
            ballShadowMesh.position.x = THREE.MathUtils.lerp(ballStartPos.x, endPos.x, tEased);
            ballShadowMesh.position.z = THREE.MathUtils.lerp(ballStartPos.z, endPos.z, tEased);
            const heightFactor = currentPos.y;
            const shadowOpacity = Math.max(0.05, 0.75 - heightFactor * 0.28);
            const shadowScale = Math.max(0.3, 1.0 - heightFactor * 0.2);
            ballShadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
            (ballShadowMesh.material as THREE.MeshBasicMaterial).opacity = shadowOpacity;
          }

          // Camera shake on kick launch
          if (t < 0.08) {
            shakeIntensity = 0.012;
            shakeDuration = 0.18;
          }

          // Record trail points
          trailHistory.unshift(currentPos.clone());
          if (trailHistory.length > TRAIL_MAX) trailHistory.pop();
          const posAttr = trailGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < TRAIL_MAX; i++) {
            const p = trailHistory[i] || currentPos;
            posAttr.setXYZ(i, p.x, p.y, p.z);
          }
          posAttr.needsUpdate = true;

          // IMPACT (Goal or Save) at t >= 0.90
          if (t >= 0.90 && !impactTriggered) {
            impactTriggered = true;
            onShotImpactRef.current?.(shot.isGoal);

            if (shot.isGoal) {
              netWiggling = true;
              flashProgress = 1.0;
              shakeIntensity = 0.018;
              shakeDuration = 0.25;
              triggerConfetti();
            } else {
              ballRebounding = true;
              triggerSaveSparks(currentPos.x, currentPos.y, keeperZ);
              shakeIntensity = 0.022;
              shakeDuration = 0.22;
              const reboundX = (Math.random() - 0.5) * 2.2;
              ballReboundVel.set(reboundX, 1.6, 3.6);
            }
          }

          // Goal completed settling
          if (t >= 1.0 && shot.isGoal) {
            postShotTimer += delta;
            if (postShotTimer >= 1.8 && !completeTriggered) {
              completeTriggered = true;
              onShotCompleteRef.current?.();
            }
          }
        } else {
          // Ball Rebound Physics on Save
          ballMesh.position.addScaledVector(ballReboundVel, delta);
          ballReboundVel.y -= delta * 7.5; // gravity
          const qRebound = new THREE.Quaternion().setFromAxisAngle(WORLD_RIGHT, 12 * delta);
          ballMesh.quaternion.premultiply(qRebound);
          if (ballMesh.position.y < 0.28) {
            ballMesh.position.y = 0.28;
            ballReboundVel.y = -ballReboundVel.y * 0.45; // damp bounce
            ballReboundVel.x *= 0.8;
            ballReboundVel.z *= 0.8;
          }

          postShotTimer += delta;
          if (postShotTimer >= 1.8 && !completeTriggered) {
            completeTriggered = true;
            onShotCompleteRef.current?.();
          }
        }
      }

      // ── 3. Goalkeeper Dive & Recovery Animation ──────────────────────────
      if (keeperSprite && keeperDiving) {
        if (keeperDiveProgress < 1.0) {
          keeperDiveProgress = Math.min(1.0, keeperDiveProgress + delta * 3.4);
          const kd = easeOutBack(keeperDiveProgress);

          // Position dive
          keeperSprite.position.x = THREE.MathUtils.lerp(keeperBaseX, activeDiveProfile.x, kd);
          keeperSprite.position.y = THREE.MathUtils.lerp(keeperBaseY, activeDiveProfile.y, kd);

          // Rotation dive (lays flat on turf for low spots, leaps angled for high corners)
          keeperSprite.material.rotation = THREE.MathUtils.lerp(0, activeDiveProfile.rot, kd);

          // Dynamic scale stretch in dive direction
          const targetWidth = keeperWidth * activeDiveProfile.scaleXMul;
          const targetHeight = keeperHeight * activeDiveProfile.scaleYMul;
          keeperSprite.scale.x = THREE.MathUtils.lerp(keeperWidth, targetWidth, kd);
          keeperSprite.scale.y = THREE.MathUtils.lerp(keeperHeight, targetHeight, kd);

          // Shadow tracking
          if (keeperMeshShadow) {
            keeperMeshShadow.position.x = keeperSprite.position.x;
            const stretchShadow = 1.0 + Math.abs(activeDiveProfile.rot) * 0.9;
            keeperMeshShadow.scale.set(stretchShadow, 0.8, 1.0);
            const heightElev = Math.max(0, keeperSprite.position.y - keeperBaseY);
            (keeperMeshShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.18, 0.70 - heightElev * 0.35);
          }
        } else {
          // Phase 2: Post-dive settle / gentle recovery
          keeperSettleProgress = Math.min(1.0, keeperSettleProgress + delta * 0.9);
          const ks = easeOutCubic(keeperSettleProgress);
          const settleNudge = activeDiveProfile.x * 0.08;
          keeperSprite.position.x = THREE.MathUtils.lerp(activeDiveProfile.x, activeDiveProfile.x - settleNudge, ks);
        }
      }

      // ── 4. Net Wiggle on Goal ────────────────────────────────────────────
      if (netWiggling) {
        netWiggle += delta * 24;
        const waveAmp = Math.max(0, 0.18 * (1.0 - easeInCubic(Math.min(1, netWiggle / 6))));
        netBackMesh.position.z = goalZ - goalDepth - Math.sin(netWiggle) * waveAmp;
        netBackMesh.position.x = Math.sin(netWiggle * 0.7) * waveAmp * 0.5;
        if (netWiggle > 6) {
          netWiggling = false;
          netBackMesh.position.z = goalZ - goalDepth;
          netBackMesh.position.x = 0;
        }
      }

      // ── 5. Goal Flash Overlay ────────────────────────────────────────────
      if (flashProgress > 0) {
        flashProgress = Math.max(0, flashProgress - delta * 2.8);
        flashMat.opacity = flashProgress * 0.45;
      }

      // ── 6. Confetti Particle Animation ───────────────────────────────────
      if (confettiActive) {
        confettiTimer -= delta;
        const posAttr = confettiGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < CONFETTI_COUNT; i++) {
          const vx = confettiVelocities[i].x;
          const vy = confettiVelocities[i].y;
          const vz = confettiVelocities[i].z;

          const px = posAttr.getX(i) + vx * delta;
          const py = posAttr.getY(i) + vy * delta;
          const pz = posAttr.getZ(i) + vz * delta;

          confettiVelocities[i].y -= delta * 3.8; // gravity
          confettiVelocities[i].x += Math.sin(elapsed * 4 + i) * delta * 1.2; // flutter air drift

          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
        confettiMat.opacity = Math.min(1.0, confettiTimer * 0.8);

        if (confettiTimer <= 0) {
          confettiActive = false;
          confettiMat.opacity = 0;
        }
      }

      // ── 7. Save Glove Sparks Animation ───────────────────────────────────
      if (sparkActive) {
        sparkTimer -= delta;
        const posAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < SPARK_COUNT; i++) {
          const px = posAttr.getX(i) + sparkVelocities[i].x * delta;
          const py = posAttr.getY(i) + sparkVelocities[i].y * delta;
          const pz = posAttr.getZ(i) + sparkVelocities[i].z * delta;
          sparkVelocities[i].y -= delta * 5.0; // gravity
          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
        sparkMat.opacity = Math.max(0, sparkTimer / 0.45);
        if (sparkTimer <= 0) {
          sparkActive = false;
        }
      }

      // ── 8. Camera Shake ──────────────────────────────────────────────────
      if (shakeDuration > 0) {
        shakeDuration -= delta;
        const s = shakeIntensity * (shakeDuration > 0 ? 1 : 0);
        camera.position.set(
          cameraBasePos.x + (Math.random() - 0.5) * s,
          cameraBasePos.y + (Math.random() - 0.5) * s * 0.5,
          cameraBasePos.z
        );
        camera.lookAt(
          cameraBaseLookAt.x + (Math.random() - 0.5) * s * 0.3,
          cameraBaseLookAt.y,
          cameraBaseLookAt.z
        );
        if (shakeDuration <= 0) {
          camera.position.copy(cameraBasePos);
          camera.lookAt(cameraBaseLookAt);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── 14. Responsive Resize & Mobile Camera Viewport Handler ───────────────
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      width = w;
      height = h;
      const aspect = width / height;
      camera.aspect = aspect;

      // In Three.js, camera.fov is the VERTICAL field of view.
      // Goal net is 6.4m wide (x = -3.2 to +3.2) and 2.5m high at z = -3.2.
      // Ball is on turf at z = 0.68, y = 0.17.
      // To guarantee the complete goal frame, net, goalkeeper, and ball are fully visible
      // without horizontal clipping on any mobile, tablet, or desktop screen:
      if (aspect < 1.0) {
        // Mobile portrait: dynamically calculate vertical FOV to guarantee full 7.6m horizontal coverage at the goal
        const targetHalfWidth = 3.8; // 6.4m goal / 2 + 0.6m padding on each side
        const camZ = 5.6;
        const camY = 1.76;
        const lookAtY = 1.25;
        const dz = camZ - (-3.2); // 8.8m distance to goal line
        const tanHalfHFOV = targetHalfWidth / dz;
        const tanHalfVFOV = tanHalfHFOV / Math.max(0.42, aspect);
        const calcFOV = 2 * Math.atan(tanHalfVFOV) * (180 / Math.PI);

        // Clamp between 52deg and 84deg for ideal perspective without fish-eye distortion
        camera.fov = Math.min(84, Math.max(52, calcFOV));
        camera.position.set(0, camY, camZ);
        camera.lookAt(0, lookAtY, -3.2);
        cameraBasePos.set(0, camY, camZ);
        cameraBaseLookAt.set(0, lookAtY, -3.2);
      } else if (aspect < 1.4) {
        // Tablet / Mobile landscape / Square displays
        camera.fov = 46;
        camera.position.set(0, 1.50, 4.8);
        camera.lookAt(0, 1.34, -3.2);
        cameraBasePos.set(0, 1.50, 4.8);
        cameraBaseLookAt.set(0, 1.34, -3.2);
      } else {
        // Desktop widescreen
        camera.fov = 40;
        camera.position.set(0, 1.44, 4.3);
        camera.lookAt(0, 1.38, -3.2);
        cameraBasePos.set(0, 1.44, 4.3);
        cameraBaseLookAt.set(0, 1.38, -3.2);
      }

      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      container.removeEventListener('click', handleClick);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [difficulty]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ touchAction: 'none' }}
    />
  );
}
