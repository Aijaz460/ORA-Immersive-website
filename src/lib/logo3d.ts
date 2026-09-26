// The Ora mark as a glossy 3D object, and the portal into the site.
// Extruded from the brand SVG (Ora-Logo.svg) with deep rounded bevels and a pearl lacquer finish.
// On scroll the mark turns to face the camera and the camera flies through its square centre:
// the deep-red stage around it is one surface with a matching opening, so the portal reveals the
// sky behind the canvas without any cut.
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const MARK =
  "M450 0C451.142 0.822703 588.453 99.9891 588.455 231.308C588.455 270.792 583.534 301.151 575.565 324.426C598.842 316.455 629.204 311.536 668.692 311.536C800.165 311.538 899.407 449.176 900 450L895.468 455.951C874.629 482.456 784.074 588.462 668.692 588.464C629.204 588.464 598.843 583.545 575.565 575.574C583.533 598.85 588.446 629.209 588.446 668.692C588.444 784.078 482.432 874.634 455.933 895.468L449.991 900C448.938 899.242 311.529 800.054 311.526 668.692C311.526 629.215 316.44 598.857 324.408 575.583C301.133 583.548 270.78 588.464 231.308 588.464C115.926 588.462 25.3707 482.456 4.53186 455.951L0 450C0.593491 449.175 99.8357 311.538 231.308 311.536C270.78 311.536 301.134 316.451 324.408 324.417C316.441 301.142 311.536 270.784 311.536 231.308C311.538 99.933 448.974 0.738909 450 0ZM510.58 389.42C491.113 393.907 470.831 396.286 450 396.286C429.168 396.286 408.888 393.908 389.42 389.42C393.908 408.888 396.286 429.168 396.286 450C396.286 470.831 393.907 491.113 389.42 510.58C408.888 506.092 429.169 503.714 450 503.714C470.83 503.714 491.113 506.093 510.58 510.58C506.093 491.113 503.714 470.83 503.714 450C503.714 429.169 506.092 408.888 510.58 389.42Z";

const UNIT = 450; // svg units per scene unit: the mark spans −1…1
const DEPTH = 56; // extrusion (svg units)
const BEVEL = 44; // deep, pillowy edge
const BEVEL_SIZE = 20;
const FOV = 30;

// deep brand red with a soft pool of light behind the mark (sRGB, written as-is)
const STAGE_VERT = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const STAGE_FRAG = /* glsl */ `
  uniform float uAlpha;
  varying vec2 vPos;
  void main() {
    vec3 outer = vec3(0.118, 0.035, 0.024);   // #1E0906
    vec3 mid   = vec3(0.278, 0.082, 0.059);   // #47150F brand dark red
    vec3 inner = vec3(0.435, 0.157, 0.110);   // warm bloom
    float d = length(vPos * vec2(0.85, 1.0));
    vec3 c = mix(inner, mid, smoothstep(0.2, 1.6, d));
    c = mix(c, outer, smoothstep(1.6, 4.2, d));
    gl_FragColor = vec4(c, uAlpha);
  }
`;

// A dark studio with warm softboxes: gives the lacquer long, bright reflections instead of a flat grey.
function studio() {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x1a0705);
  const box = (w: number, h: number, color: number, intensity: number, pos: [number, number, number], look = true) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    if (look) m.lookAt(0, 0, 0);
    room.add(m);
  };
  box(9, 2.2, 0xfff1dc, 6, [0, 6, 3]); // overhead strip: the long glint across the petals
  box(2, 8, 0xffe7c9, 4, [-7, 0, 4]); // left strip
  box(2.5, 6, 0xffd6b0, 3, [7, -1, 3]); // right strip, warmer
  box(6, 3, 0xff8a66, 1.6, [0, -5, -4]); // red-orange bounce from the stage
  box(3, 3, 0xffffff, 8, [3, 3, 7]); // small key softbox: the bright specular dot
  box(7, 4, 0xfff4e4, 1.1, [-4, 4, 8]); // soft front-left light: the face grades cream → warm shadow
  return room;
}

export type Logo3D = {
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  intro: () => void;
  resize: () => void;
  dispose: () => void;
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createLogo3D(canvas: HTMLCanvasElement, { reduce = false } = {}): Logo3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  // 1.5× with MSAA stays crisp on Retina at ~44% less fill than 2× (the pearl shader is the costliest paint on the page)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.02).texture;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.004, 100);

  // ---- geometry from the brand SVG ----
  const svg = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900"><path fill-rule="evenodd" d="${MARK}"/></svg>`,
  );
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL_SIZE,
    bevelSegments: 18,
    curveSegments: 64,
  });
  // the mark is symmetric top/bottom, so no Y flip (and no inverted winding) is needed
  geo.translate(-450, -450, -DEPTH / 2);
  geo.scale(1 / UNIT, 1 / UNIT, 1 / UNIT);
  geo.computeVertexNormals();

  // pearl lacquer: brand cream under a wet clear coat, a whisper of metal and an iridescent film
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf8ecce,
    metalness: 0.62,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.22,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [220, 480],
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffdcb4),
    sheenRoughness: 0.35,
    envMapIntensity: 1.35,
    transparent: true, // same render list as the stage, so renderOrder draws it on top
    opacity: 1,
    depthWrite: true,
  });
  const mark = new THREE.Mesh(geo, pearl);
  mark.renderOrder = 0;
  const markGroup = new THREE.Group();
  markGroup.add(mark);
  scene.add(markGroup);

  // ---- the stage: one red surface with the same square opening, plus a cover over that opening ----
  const hole = shapes[0].holes[0].getPoints(96).map((v) => new THREE.Vector2((v.x - 450) / UNIT, (v.y - 450) / UNIT));
  const holeWide = hole.map((v) => v.clone().multiplyScalar(1.05)); // tucked just behind the tunnel walls
  const stageShape = new THREE.Shape([
    new THREE.Vector2(-40, -40),
    new THREE.Vector2(40, -40),
    new THREE.Vector2(40, 40),
    new THREE.Vector2(-40, 40),
  ]);
  stageShape.holes.push(new THREE.Path(holeWide));
  // Stage + portal cover are a background layer: drawn first, never depth-tested, never written to
  // depth — so the mark can swing in any direction and no part of it is ever hidden behind the red.
  const stageMat = new THREE.ShaderMaterial({
    vertexShader: STAGE_VERT,
    fragmentShader: STAGE_FRAG,
    uniforms: { uAlpha: { value: 1 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const coverMat = new THREE.ShaderMaterial({
    vertexShader: STAGE_VERT,
    fragmentShader: STAGE_FRAG,
    uniforms: { uAlpha: { value: 1 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const backZ = -(DEPTH / 2 + BEVEL + 4) / UNIT;
  const stage = new THREE.Mesh(new THREE.ShapeGeometry(stageShape, 96), stageMat);
  const cover = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(holeWide), 96), coverMat);
  stage.position.z = backZ;
  cover.position.z = backZ + 0.0005;
  stage.renderOrder = -2;
  cover.renderOrder = -1;
  scene.add(stage, cover);

  // ---- light: warm key, red rim from the stage, and a highlight that follows the pointer ----
  const key = new THREE.DirectionalLight(0xfff0dc, 1.2);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0xff6a4a, 1.6);
  rim.position.set(-4, -2.5, -2);
  const glint = new THREE.PointLight(0xffffff, 10, 0, 1.6);
  glint.position.set(1.2, 1.2, 2.4);
  scene.add(key, rim, glint, new THREE.AmbientLight(0x3a1410, 0.6));

  // ---- state ----
  let progress = 0;
  let introT = reduce ? 1 : 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let z0 = 6;
  let raf = 0;
  let running = false;
  const t0 = performance.now();

  function fitCamera() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // the mark takes ~58% of the smaller screen side at rest
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    z0 = 2 / (0.58 * 2 * tan * Math.min(1, camera.aspect));
    camera.updateProjectionMatrix();
  }

  function frame() {
    const now = performance.now();
    const t = (now - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    const face = smooth(0, 0.34, progress); // turn to face the camera
    const idle = 1 - face;
    const intro = introT < 1 ? (introT = Math.min(1, introT + 0.012)) : 1;
    const ie = 1 - Math.pow(1 - intro, 3);

    markGroup.rotation.y = idle * (Math.sin(t * 0.45) * 0.42 + pointer.x * 0.3) + (1 - ie) * -1.4;
    markGroup.rotation.x = idle * (Math.cos(t * 0.38) * 0.12 - pointer.y * 0.2);
    markGroup.rotation.z = face * (Math.PI / 2); // a quarter turn: the symmetric mark settles back on itself
    markGroup.position.y = idle * Math.sin(t * 0.9) * 0.04;
    const s = 0.62 + 0.38 * ie;
    markGroup.scale.setScalar(s);

    // fly through the square opening
    const fly = smooth(0.22, 1, progress);
    camera.position.set(0, 0, z0 - (z0 + 0.7) * Math.pow(fly, 2.2));
    camera.lookAt(0, 0, camera.position.z - 1);
    coverMat.uniforms.uAlpha.value = 1 - smooth(0.3, 0.6, progress); // the portal opens onto the sky

    glint.position.set(1.4 + pointer.x * 2.2, 1.1 - pointer.y * 1.8, camera.position.z * 0.4 + 1.6);

    renderer.render(scene, camera);
  }

  const loop = () => {
    frame();
    raf = running ? requestAnimationFrame(loop) : 0;
  };
  const setRunning = (on: boolean) => {
    if (on && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!on) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  const onVis = () => setRunning(!document.hidden && progress < 0.999);
  document.addEventListener("visibilitychange", onVis);

  fitCamera();
  frame();
  canvas.classList.add("is-ready"); // the 3D stage now paints itself; drop the CSS stand-in
  setRunning(true);

  return {
    setProgress(p) {
      progress = p;
      if (p >= 0.999) {
        setRunning(false);
        frame();
      } else if (!document.hidden) setRunning(true);
    },
    setPointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    intro() {
      introT = reduce ? 1 : 0;
    },
    resize() {
      fitCamera();
      frame();
    },
    dispose() {
      setRunning(false);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      pearl.dispose();
      stageMat.dispose();
      coverMat.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
