import * as THREE from "three";

export function DoubleRT(w, h, filtering) {
  let rt1 = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.FloatType,
    minFilter: filtering || THREE.LinearFilter,
    magFilter: filtering || THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    anisotropy: 1,
  });

  let rt2 = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.FloatType,
    minFilter: filtering || THREE.LinearFilter,
    magFilter: filtering || THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    anisotropy: 1,
  });

  return {
    read: rt1,
    write: rt2,
    swap: function () {
      let temp = this.read;
      this.read = this.write;
      this.write = temp;
    },
    setSize: function (w, h) {
      rt1.setSize(w, h);
      rt2.setSize(w, h);
    },
  };
}

export class AccumProgram {
  constructor(renderer) {
    const size = new THREE.Vector2(0, 0);
    renderer.getSize(size);

    this.renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      samples: 4,
      type: THREE.FloatType,
    });

    this.accumDRT = new DoubleRT(size.x, size.y);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexturePrev: { type: "t", value: null },
        uTextureCurr: { type: "t", value: null },
      },

      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);    
        }
      `,

      fragmentShader: `
          uniform sampler2D uTexturePrev;
          uniform sampler2D uTextureCurr;

          varying vec2 vUv;

          void main() {
            vec4 prev = texture2D(uTexturePrev, vUv);
            vec4 curr = texture2D(uTextureCurr, vUv);
            gl_FragColor = prev + curr;  
          }
      `,

      depthTest: false,
      depthWrite: false,
    });

    this.blitMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { type: "t", value: null },
        uSamples: { value: 0 },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);    
        }
      `,

      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uSamples;

        varying vec2 vUv;

        void main() {
          vec4 texel = texture2D(uTexture, vUv);
          gl_FragColor = texel / uSamples;  
        }
      `,

      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    // this.mesh.position.set(0, 0, -10);

    /* 
      remember that the camera is worthless here,
      since we're drawing on a full-screen quad
    */
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    this.renderer = renderer;
    this.samples = 0;

    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
  }

  add() {
    this.renderer.setRenderTarget(this.accumDRT.write);

    this.mesh.material = this.material;

    this.material.uniforms.uTexturePrev.value = this.accumDRT.read.texture;
    this.material.uniforms.uTextureCurr.value = this.renderTarget.texture;
    this.renderer.render(this.scene, this.camera);

    this.samples++;

    this.accumDRT.swap();
    this.renderer.setRenderTarget(null);
  }

  blit() {
    this.renderer.setRenderTarget(null);

    this.mesh.material = this.blitMaterial;

    this.blitMaterial.uniforms.uTexture.value = this.accumDRT.read.texture;
    this.blitMaterial.uniforms.uSamples.value = this.samples;
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
  }

  accumulate(callback) {
    this.renderer.setRenderTarget(this.renderTarget);

    callback();
  
    this.add();
    this.blit();
  }
}
