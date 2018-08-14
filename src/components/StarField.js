import React, { PureComponent } from 'react';

// import * as THREE from 'three/build/three';
const THREE = (global.THREE = require('three'));
require('three/examples/js/loaders/GLTFLoader');

import { AmbientLight } from 'three/src/lights/AmbientLight';
import { DirectionalLight } from 'three/src/lights/DirectionalLight';

import { Scene } from 'three/src/scenes/Scene';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { BoxGeometry } from 'three/src/geometries/Geometries';
import { MeshBasicMaterial } from 'three/src/materials/Materials';

import { Mesh } from 'three/src/objects/Mesh';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';

import autobind from 'utilities/autobind';
import { randomSize, randomPosition, sceneWidth } from 'utilities/helpers';

class StarField extends PureComponent {
  constructor(props) {
    super(props);
    this.timeOut = null;
    autobind(this);
  }

  componentDidMount() {
    this.setupScene();
  }

  onResize() {
    const width = sceneWidth();
    const height = window.innerHeight;
    this.camera.aspect = width / height;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setupScene() {
    const width = sceneWidth();
    const height = window.innerHeight;

    const scene = new Scene();
    const camera = new PerspectiveCamera(100, width / height, 1, 1000);

    const ambient = new AmbientLight(0xffffff, 1);
    const directional = new DirectionalLight(0xffffff, 5);
    directional.position.set(0, 0, 500);
    scene.add(ambient, directional);
    const renderer = new WebGLRenderer({ alpha: true, antialias: false });
    camera.position.z = 500;

    // renderer.setPixelRatio(window.devicePixelRatio * 0.15);
    renderer.setPixelRatio(window.devicePixelRatio * 0.25);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // the default

    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.stars = this.stars || [];
    this.mount.appendChild(this.renderer.domElement);
    this.setupSpaceShip();
    this.addStars();

    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => {
      clearTimeout(this.timeOut);
      this.timeOut = setTimeout(this.onResize, 250);
    });
  }

  setupSpaceShip() {
    const loader = new THREE.GLTFLoader();

    loader.load('/public/models/saturn_v1.gltf', ({ scene: shipModel }) => {
      shipModel.position.set(0, -2, 490);
      shipModel.rotateX(0.25);
      shipModel.rotateY(9.5);
      shipModel.visible = false;

      this.spaceShip = shipModel;
      this.scene.add(shipModel);
    });
  }

  animate() {
    this.animateStars();
    this.renderScene();
    if (this.spaceShip) {
      if (this.props.hidden) {
        this.spaceShip.rotateZ(0.0125);
        this.spaceShip.visible = true;
      } else {
        this.spaceShip.visible = false;
      }
    }

    requestAnimationFrame(this.animate);
  }

  addStars() {
    const geometry = new BoxGeometry(0.75, 0.75, 0);

    for (let z = -1000; z < 1000; z += 15) {
      let material;
      // TODO: More colors
      if (z > 0 && z < 100) {
        material = new MeshBasicMaterial({ color: 0xff757a });
      } else {
        material = new MeshBasicMaterial({ color: 0xffffff });
      }

      const star = new Mesh(geometry, material);

      // TODO: Better positioning so stars don't smack the viewer in the face
      star.position.x = randomPosition();
      star.position.y = randomPosition();
      star.position.z = z;

      star.scale.set(randomSize(), randomSize(), 1);

      this.scene.add(star);
      this.stars.push(star);
    }
  }

  animateStars() {
    this.stars.forEach(star => {
      const animatedStar = star;

      animatedStar.position.z += Math.random() * (12 - 8) + 8;

      // if the particle is too close move it to the back
      if (animatedStar.position.z > 1000) {
        animatedStar.position.z -= 1100;
        animatedStar.position.x = randomPosition();
        animatedStar.position.y = randomPosition();
      }
    });
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera);
  }

  render() {
    return (
      <div className="StarField">
        <div
          ref={mount => {
            this.mount = mount;
          }}
        />
      </div>
    );
  }
}

export default StarField;