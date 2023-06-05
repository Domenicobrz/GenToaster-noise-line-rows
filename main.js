import "./style.css";
import { Scene, OrthographicCamera, WebGLRenderer, Color, Vector2 } from "three";
import { Line2, LineGeometry, LineMaterial } from "three-fatline";
import { AccumProgram } from "./accum";
import { createNoise2D } from "simplex-noise";

const noise2D = createNoise2D();

const scene = new Scene();
const res = 800;
// const camera = new OrthographicCamera(0, w, h, 0, 0, 1000);
const camera = new OrthographicCamera(
  -res * 0.5,
  res * 0.5,
  res * 0.5,
  -res * 0.5,
  0,
  1000
);
camera.position.z = 0;

// Create a renderer
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(res, res);
document.body.appendChild(renderer.domElement);

let hasRedLine = false;
createLines();

scene.background = new Color("rgb(34, 30, 27)").convertLinearToSRGB();

const accumProgram = new AccumProgram(renderer);
(function animate() {
  requestAnimationFrame(animate);

  accumProgram.accumulate(() => {
    camera.position.set(Math.random(), Math.random(), 0);
    renderer.render(scene, camera);
  });
})();

function createLines() {
  for (let r = -20; r < 20; r++) {
    let vertices = [];

    let wnoise = noise2D(0, r * 0.125) * 1.0;
    let lwidth = 0.25 + Math.pow(wnoise * 0.5 + 1, 2);
    let lcolor = "rgb(241, 231, 222)";

    if (lwidth > 1.5 && !hasRedLine && Math.abs(r) < 4) {
      hasRedLine = true;
      lcolor = "rgb(255, 150, 140)";
    } 

    let dashed = Math.random() > 0.5;
    let dashScale = 1;
    let dashSize = Math.pow(Math.random(), 2) * 15 + 4;
    let gapSize = dashSize * (0.5 + Math.random() * 1);

    const material = new LineMaterial({
      color: lcolor,
      linewidth: lwidth,
      resolution: new Vector2(res, res), // resolution of the viewport
      // dashed, dashScale, dashSize, gapSize
      dashed,
      dashScale,
      dashSize,
      gapSize,
    });

    for (let i = 0; i < 100; i++) {
      let height = 0;
      height += noise2D(i * 0.0189 * 1, r * 0.125) * 2.0;
      height += noise2D(i * 0.0189 * 2, r * 0.125) * 1.0;
      height += noise2D(i * 0.0189 * 4, r * 0.125) * 0.5;
      height += noise2D(i * 0.0189 * 8, r * 0.125) * 0.25;
      height += noise2D(i * 0.0189 * 16, r * 0.125) * 0.125;
      
      vertices.push(
        -330 + 660 * (i / 100), 
        height * 20 + r * 16, 
        0
      );
    }

    const geometry = new LineGeometry();
    geometry.setPositions(vertices);

    const myLine = new Line2(geometry, material);
    myLine.computeLineDistances();

    scene.add(myLine);
  }
}
