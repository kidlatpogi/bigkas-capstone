import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './RubikCubeCanvas.css';

const TURN_MS = 180;
const START_DELAY_MS = 1000;
const CYCLE_DELAY_MS = 15000;
const COLORS = {
  U: 0xffffff,
  D: 0xffd500,
  L: 0xff6b00,
  R: 0xb7121f,
  F: 0x009b48,
  B: 0x0046ad,
  BODY: 0x0b0f18,
  EDGE: 0x263046,
};

const AXIS = { U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z' };
const LAYER = { U: +1, D: -1, L: -1, R: +1, F: +1, B: -1 };
const BASE = { U: -1, D: +1, L: +1, R: -1, F: -1, B: +1 };
const VEC = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const AX_OF = { U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z' };

export default function RubikCubeCanvas({ className = '', ariaLabel = "3D Rubik's cube canvas" }) {
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(6.2, 5.4, 7.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    stage.replaceChildren(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(4, 7, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0x88baff, 0.35);
    rim.position.set(-6, 3, -4);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);
    const cubeRoot = new THREE.Group();
    world.add(cubeRoot);

    const cubieSize = 0.96;
    const gap = 1.02;
    const stickerSize = 0.86;
    const stickerLift = 0.035;
    const bodyGeom = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.BODY, roughness: 0.7, metalness: 0.1 });

    const cubelets = [];
    let queue = [];
    let animating = false;
    let lastScramble = [];
    let cycleTimer = null;
    let startDelayTimer = null;
    let visibilityObserver = null;
    let auto = true;
    let dragging = false;
    let last = null;
    let renderFrame = 0;
    let resumeAutoTimer = null;

    const idx = (value) => Math.round(value / gap);
    const onLayer = (mesh, axis, layer) => idx(mesh.position[axis]) === layer;

    const makeSticker = (color) => {
      const geometry = new THREE.PlaneGeometry(stickerSize, stickerSize);
      const sticker = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.05,
        emissive: color,
        emissiveIntensity: 0.18,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        depthWrite: false,
      }));
      sticker.renderOrder = 10;
      return sticker;
    };

    const addStickers = (mesh, x, y, z) => {
      const offset = cubieSize / 2 + stickerLift;
      if (x === +1) { const sticker = makeSticker(COLORS.R); sticker.position.x = +offset; sticker.rotation.y = -Math.PI / 2; mesh.add(sticker); }
      if (x === -1) { const sticker = makeSticker(COLORS.L); sticker.position.x = -offset; sticker.rotation.y = +Math.PI / 2; mesh.add(sticker); }
      if (y === +1) { const sticker = makeSticker(COLORS.U); sticker.position.y = +offset; sticker.rotation.x = -Math.PI / 2; mesh.add(sticker); }
      if (y === -1) { const sticker = makeSticker(COLORS.D); sticker.position.y = -offset; sticker.rotation.x = +Math.PI / 2; mesh.add(sticker); }
      if (z === +1) { const sticker = makeSticker(COLORS.F); sticker.position.z = +offset; mesh.add(sticker); }
      if (z === -1) { const sticker = makeSticker(COLORS.B); sticker.position.z = -offset; sticker.rotation.y = Math.PI; mesh.add(sticker); }
    };

    const buildCube = () => {
      while (cubeRoot.children.length) {
        cubeRoot.remove(cubeRoot.children[0]);
      }

      cubelets.length = 0;
      for (let x = -1; x <= 1; x += 1) {
        for (let y = -1; y <= 1; y += 1) {
          for (let z = -1; z <= 1; z += 1) {
            const body = new THREE.Mesh(bodyGeom, bodyMat.clone());
            body.position.set(x * gap, y * gap, z * gap);
            body.add(new THREE.LineSegments(
              new THREE.EdgesGeometry(bodyGeom),
              new THREE.LineBasicMaterial({ color: COLORS.EDGE }),
            ));
            addStickers(body, x, y, z);
            cubeRoot.add(body);
            cubelets.push({ mesh: body });
          }
        }
      }
    };

    const selectLayer = (axis, layer) => cubelets.filter((cubelet) => onLayer(cubelet.mesh, axis, layer));

    const moveSpec = (token) => {
      const face = token[0];
      const axis = AXIS[face];
      const layer = LAYER[face];
      const multiplier = token.endsWith('2') ? 2 : 1;
      const prime = token.endsWith("'") ? -1 : 1;
      const angle = BASE[face] * prime * (Math.PI / 2) * multiplier;
      return { axis, layer, angle };
    };

    const snapCubie = (mesh) => {
      mesh.position.set(idx(mesh.position.x) * gap, idx(mesh.position.y) * gap, idx(mesh.position.z) * gap);
      const quarterTurn = Math.PI / 2;
      mesh.rotation.x = Math.round(mesh.rotation.x / quarterTurn) * quarterTurn;
      mesh.rotation.y = Math.round(mesh.rotation.y / quarterTurn) * quarterTurn;
      mesh.rotation.z = Math.round(mesh.rotation.z / quarterTurn) * quarterTurn;
    };

    const applyMove = (token, duration) => new Promise((resolve) => {
      const { axis, layer, angle } = moveSpec(token);
      const parts = selectLayer(axis, layer);
      const group = new THREE.Group();
      cubeRoot.add(group);
      parts.forEach((part) => group.attach(part.mesh));

      const axisVec = VEC[axis];
      const start = performance.now();
      const baseRot = group.rotation.clone();

      const animate = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        group.rotation.copy(baseRot);
        group.rotateOnAxis(axisVec, angle * eased);
        renderer.render(scene, camera);

        if (t < 1) {
          requestAnimationFrame(animate);
          return;
        }

        while (group.children.length) {
          const mesh = group.children[0];
          cubeRoot.attach(mesh);
          snapCubie(mesh);
        }

        cubeRoot.remove(group);
        resolve();
      };

      requestAnimationFrame(animate);
    });

    const runQueue = async () => {
      if (animating) {
        return;
      }

      animating = true;
      while (queue.length) {
        await applyMove(queue.shift(), TURN_MS);
      }
      animating = false;
    };

    const pushMoves = (moves) => {
      queue.push(...moves);
      runQueue();
    };

    const inverseMoves = (moves) => moves.slice().reverse().map((move) => (move.endsWith('2')
      ? move
      : (move.endsWith("'") ? move.slice(0, -1) : `${move}'`)));

    const randomScramble = (count = 22) => {
      const out = [];
      let previousAxis = null;

      for (let index = 0; index < count; index += 1) {
        let face;
        do {
          face = FACES[(Math.random() * FACES.length) | 0];
        } while (AX_OF[face] === previousAxis);

        previousAxis = AX_OF[face];
        const suffix = Math.random() < 0.5 ? '' : (Math.random() < 0.5 ? "'" : '2');
        out.push(`${face}${suffix}`);
      }

      return out;
    };

    const clearCycleTimers = () => {
      if (startDelayTimer) {
        window.clearTimeout(startDelayTimer);
        startDelayTimer = null;
      }

      if (cycleTimer) {
        window.clearTimeout(cycleTimer);
        cycleTimer = null;
      }
    };

    const resetMethod = () => {
      queue = [];
      lastScramble = [];
      buildCube();
    };

    const generateMethod = () => {
      if (animating) {
        return;
      }

      resetMethod();
      const scramble = randomScramble();
      lastScramble = scramble.slice();
      pushMoves(scramble);
    };

    const solveMethod = () => {
      if (animating || !lastScramble.length) {
        return;
      }

      pushMoves(inverseMoves(lastScramble));
    };

    const runCycleStep = (step) => {
      if (step === 'generate') {
        generateMethod();
      } else {
        solveMethod();
      }

      const nextStep = step === 'generate' ? 'solve' : 'generate';
      cycleTimer = window.setTimeout(() => runCycleStep(nextStep), CYCLE_DELAY_MS);
    };

    const startCycle = () => {
      clearCycleTimers();
      startDelayTimer = window.setTimeout(() => {
        runCycleStep('generate');
      }, START_DELAY_MS);
    };

    const startCycleWhenVisible = () => {
      if (visibilityObserver) {
        visibilityObserver.disconnect();
      }

      let started = false;
      visibilityObserver = new IntersectionObserver((entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || started) {
          return;
        }

        started = true;
        startCycle();
        visibilityObserver?.disconnect();
      }, {
        threshold: 0.35,
      });

      visibilityObserver.observe(stage);
    };

    const fit = () => {
      const width = stage.clientWidth || 600;
      const height = stage.clientHeight || 600;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const handlePointerDown = (event) => {
      dragging = true;
      auto = false;
      last = { x: event.clientX, y: event.clientY };
      stage.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!dragging || !last) {
        return;
      }

      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      world.rotation.y += dx * 0.005;
      world.rotation.x += dy * 0.003;
    };

    const handlePointerUp = () => {
      dragging = false;
      if (resumeAutoTimer) {
        window.clearTimeout(resumeAutoTimer);
      }
      resumeAutoTimer = window.setTimeout(() => {
        auto = true;
      }, 1200);
    };

    const render = () => {
      if (auto && !animating) {
        world.rotation.y += 0.0035;
      }

      renderer.render(scene, camera);
      renderFrame = requestAnimationFrame(render);
    };

    buildCube();
    fit();
    window.addEventListener('resize', fit, { passive: true });
    stage.addEventListener('pointerdown', handlePointerDown);
    stage.addEventListener('pointermove', handlePointerMove);
    stage.addEventListener('pointerup', handlePointerUp);
    stage.addEventListener('pointerleave', handlePointerUp);

    render();
    startCycleWhenVisible();

    return () => {
      clearCycleTimers();
      visibilityObserver?.disconnect();
      if (resumeAutoTimer) {
        window.clearTimeout(resumeAutoTimer);
      }
      if (renderFrame) {
        cancelAnimationFrame(renderFrame);
      }

      window.removeEventListener('resize', fit);
      stage.removeEventListener('pointerdown', handlePointerDown);
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerup', handlePointerUp);
      stage.removeEventListener('pointerleave', handlePointerUp);
      renderer.dispose();
      stage.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={`rubik-cube-canvas ${className}`.trim()}
      aria-label={ariaLabel}
    />
  );
}
