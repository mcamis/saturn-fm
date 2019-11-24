import React, { PureComponent } from "react";
import PropTypes from "prop-types";

import { throttle, sceneWidth, textureAnimator } from "utilities/helpers";

import {
  animateButtonPosition,
  createButtons,
  orbitGeometry,
  purpleMesh,
  pinkMesh,
  planeGeometry,
  shadowGeometry,
  shadowTexture
} from "utilities/menuElements";

import testPng from "images/test.png";

// Todo: Import specific tween functions as needed
import * as TWEEN from "es6-tween";
import * as THREE from "three";

import buttonSrc from "effects/button-press.mp3";
import highlightSrc from "effects/button-highlight.mp3";

import autobind from "utilities/autobind";

// TODO: Set more magic numbers to constants
const SHADOW_OFFSET = 1.025;

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.timeOut = null;
    this.planes = [];
    this.shadowPlanes = [];

    this.buttonEffect = new Audio();
    this.buttonEffect.src = buttonSrc;
    this.highlightEffect = new Audio();
    this.highlightEffect.src = highlightSrc;
    this.state = {
      activeButton: "play",
      allowToggle: false
    };

    this.clock = new THREE.Clock();

    this.buttons = [
      "disc",
      "settings",
      "hide",
      "rewind",
      "play",
      "fastforward",
      "repeat",
      "stop",
      "advanced"
    ];

    this.onMouseMoveThrottled = throttle(this.onMouseMove.bind(this), 100);
    autobind(this);
  }

  componentDidMount() {
    this.setupScene();

    this.setupKeyboardListeners();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.activeButton !== nextState.activeButton) {
      return true;
    }
    if (
      this.props.hidden !== nextProps.hidden ||
      this.props.paused !== nextProps.paused ||
      this.props.repeat !== nextProps.repeat ||
      this.props.playing !== nextProps.playing
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.activeButton !== prevState.activeButton) {
      const [x, y] = this.menuElements[this.state.activeButton].position;
      this.orbits.pink.position.set(x, y, 2);
      this.orbits.purple.position.set(x, y, 2.03);
    }
  }

  onResize() {
    const width = sceneWidth();
    const height = width * 0.75;
    this.camera.aspect = width / height;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    // if(window.innerWidth < 400) {
    //   this.shadowPlanes.forEach(shadow => shadow.visible = false);
    // } else {
    //   this.shadowPlanes.forEach(shadow => shadow.visible = true);
    // }
  }

  onMouseDown(e) {
    e.stopPropagation();
    if (this.props.hidden) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.planes);
    if (intersects.length > 0) {
      const {
        object: {
          material: {
            userData: { onClick }
          }
        }
      } = intersects[0];

      const { object } = intersects[0];

      this.triggerButtonCallback(object, onClick);
    }
  }

  onMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    // TODO/WTF: Why is * 1.5 necessary!?
    this.mouse.x =
      ((e.clientX - rect.left * 1.5) / (rect.width - rect.left)) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;

    this.manageActiveButton();
  }

  setupKeyboardListeners() {
    window.addEventListener("keydown", e => {
      let nextIndex = this.buttons.indexOf(this.state.activeButton);
      switch (e.code) {
        case "ArrowRight":
          if (nextIndex !== 2 && nextIndex !== 5) {
            nextIndex += 1;
          }
          break;
        case "ArrowLeft":
          if (nextIndex !== 3 && nextIndex !== 6) {
            nextIndex -= 1;
          }
          break;

        case "ArrowUp":
          nextIndex -= 3;
          break;
        case "ArrowDown":
          nextIndex += 3;
          break;
        case "Enter":
          const nextName = this.buttons[nextIndex];
          const nextObject = this.planes.find(plane => plane.name === nextName);
          this.triggerButtonCallback(
            nextObject,
            this.menuElements[nextName].onClick
          );
          break;
        default:
          nextIndex = -1;
      }

      if (nextIndex >= 0 && nextIndex < this.buttons.length) {
        this.setState({ activeButton: this.buttons[nextIndex] }, () =>
          this.playHighlight()
        );
      }
    });
  }

  setupScene() {
    const width = sceneWidth();
    const height = width * 0.75;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(2.5, width / height, 1, 500);
    camera.aspect = width / height;

    camera.position.z = 360;
    camera.position.y = 0.5;
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(width, height);

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.scene = scene;
    this.camera = camera;

    this.renderer = renderer;
    this.mount.appendChild(this.renderer.domElement);

    this.createMenuElements();
    this.setupOrbAnimation();
    this.setupEventListeners();

    this.props.setAnimationCallback(this.animate);
  }

  setupEventListeners() {
    const {
      renderer: { domElement }
    } = this;

    window.addEventListener("resize", () => {
      clearTimeout(this.timeOut);
      this.timeOut = setTimeout(this.onResize, 250);
    });

    window.addEventListener("orientationchange", () => {
      this.onResize();
    });

    domElement.addEventListener("mousedown", e => this.onMouseDown(e), false);
    domElement.addEventListener("mousemove", e => this.onMouseMoveThrottled(e), false);
  }

  setupOrbAnimation() {
    const [x, y, z] = [2.25, -4.3, 1];

    const globeTexture = new THREE.TextureLoader().load(testPng);
    globeTexture.magFilter = THREE.NearestFilter;
    globeTexture.minFilter = THREE.NearestFilter;

    // https://stemkoski.github.io/Three.js/Texture-Animation.html
    this.textureAnimator = new textureAnimator(globeTexture, 455, 40);

    const globeMaterial = new THREE.MeshBasicMaterial({
      map: globeTexture,
      transparent: true,
      name: "advanced",
      userData: {
        animationDelay: 900,
        animationDuration: 300,
        showShadow: true,
        onClick: this.props.toggleAbout
      }
    });

    const spinningGlobe = new THREE.Mesh(planeGeometry, globeMaterial);
    spinningGlobe.position.set(x, y, z);
    spinningGlobe.name = "advanced";

    shadowTexture.magFilter = THREE.NearestFilter;
    shadowTexture.minFilter = THREE.NearestFilter;

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.5,
      userData: {
        animationDelay: 900,
        animationDuration: 300
      }
    });



    const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPlane.position.set(x, y - SHADOW_OFFSET, z - 0.5);
    // shadowPlane.visible = window.innerWidth >= 400;
    this.shadowPlanes.push(shadowPlane);
    this.scene.add(shadowPlane);

    this.planes.push(spinningGlobe);
    this.scene.add(spinningGlobe);
  }

  placeOrbitsInScene() {
    const [x, y] = [0, -2.15];
    const pink = new THREE.Mesh(orbitGeometry, pinkMesh);
    const purple = new THREE.Mesh(orbitGeometry, purpleMesh);

    // Push the orbits slight ahead in Z so they hit the plane at the eges of the sphere
    pink.position.set(x, y, 2);
    pink.rotateX(0.35);
    pink.rotateZ(-0.8);

    purple.position.set(x, y, 2.03);
    purple.rotateZ(0.8);
    purple.rotateX(0.25);
    purple.rotateY(1);

    this.orbits = {
      pink,
      purple
    };

    this.scene.add(pink, purple);
  }

  placeInScene({
    name = "",
    position,
    onClick,
    mapSrc,
    animationDelay,
    animationDuration,
    showShadow
  }) {
    const [x, y, z] = position;

    const planeTexture = new THREE.TextureLoader().load(mapSrc);
    planeTexture.magFilter = THREE.NearestFilter;
    planeTexture.minFilter = THREE.NearestFilter;

    const planeMaterial = new THREE.MeshBasicMaterial({
      map: planeTexture,
      transparent: true,
      name,
      userData: {
        onClick,
        animationDelay,
        animationDuration
      }
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(x, y, z);
    plane.name = name;
    if (showShadow) {
      shadowTexture.magFilter = THREE.NearestFilter;
      shadowTexture.minFilter = THREE.NearestFilter;

      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.5,
        name,
        userData: {
          animationDelay,
          animationDuration
        }
      });
      const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadowPlane.position.set(x, y - SHADOW_OFFSET, z - 0.5);
      // shadowPlane.visible = window.innerWidth >= 400;
      this.shadowPlanes.push(shadowPlane);
      this.scene.add(shadowPlane);
    }
    // plane.rotateZ(0.75);
    this.planes.push(plane);
    this.scene.add(plane);
  }

  orbitButton() {
    const { pink, purple } = this.orbits;

    if (this.props.hidden) {
      pink.material.visible = false;
      purple.material.visible = false;
    } else {
      pink.material.visible = true;
      purple.material.visible = true;
      pink.rotateY(-0.065);
      purple.rotateY(0.07);
    }
  }

  manageActiveButton() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planes);
    if (intersects.length > 0) {
      const {
        object: {
          material: { name }
        }
      } = intersects[0];
      if (name && name !== this.state.activeButton) {
        this.setState({ activeButton: name });
        this.playHighlight();
      }
      document.body.classList.add("pointer");
    } else {
      document.body.classList.remove("pointer");
    }
  }


  canPlay(playOnAllDevice = false) {
    if (playOnAllDevice) {
      return this.props.audioManager.analyser.audioContext.state !== 'suspended'

    }
    return this.props.audioManager.analyser.audioContext.state !== 'suspended'
  }

  hideMenu() {
    if (this.props.hidden) {
      return this.showIfHidden();
    }

    // TODO: Switch this to the real sound effect
    this.playHighlight();

    this.planes.forEach(plane => {
      const { x, y, z } = plane.position;
      animateButtonPosition(plane, new THREE.Vector3(x, y - 10, z));
    });

    this.shadowPlanes.forEach(shadow => {
      shadow.visible = false;
    });
    this.props.hideDash();
    setTimeout(() => this.setState({ allowToggle: true }), 1400);
  }

  animate() {
    // TODO: Move tween.update to a central location?
    TWEEN.update();
    this.orbitButton();

    const delta = this.clock.getDelta();
    this.renderer.render(this.scene, this.camera);
    this.textureAnimator.update(1000 * delta);
  }

  showIfHidden() {
    if (this.state.allowToggle && this.props.hidden) {
      this.props.showIfHidden();
      this.setState({ allowToggle: false });
      this.planes.forEach(plane => {
        const { x, y, z } = plane.position;
        animateButtonPosition(plane, new THREE.Vector3(x, y + 10, z));
      });
      setTimeout(() => {
        this.shadowPlanes.forEach(shadow => {
          shadow.visible = true;
        });
      }, 1000);
    }
  }

  triggerButtonCallback(object, onClick) {
    new TWEEN.Tween(object.scale)
      .to({ x: 1.5, y: 1.5, z: 1.5 }, 100)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();

    setTimeout(() => {
      new TWEEN.Tween(object.scale)
        .to({ x: 1, y: 1, z: 1 }, 100)
        .easing(TWEEN.Easing.Quadratic.In)
        .start();
    }, 250);

    if (this.canPlay(true)) {
      this.buttonEffect.currentTime = 0;
      this.buttonEffect.play();
    }
    onClick();
  }

  getToolTip() {
    const { playing, paused, repeat } = this.props;

    const tooltips = {
      disc: () => <p>Choose Songs</p>,
      settings: () => <p>Coming Soon</p>,
      hide: () => <p>Hide</p>,
      rewind: () => <p>Rewind</p>,
      fastforward: () => <p>Fast Forward</p>,
      play: () => {
        let playElement = <p>Play / Pause</p>;
        if (playing) {
          playElement = (
            <p>
              <strong>Play </strong>/ Pause
            </p>
          );
        } else if (paused) {
          playElement = (
            <p>
              Play / <strong>Pause</strong>
            </p>
          );
        }
        return playElement;
      },
      repeat: () => {
        let repeatElement = (
          <p>
            Repeat: 1 / All / <strong>Off</strong>
          </p>
        );
        if (repeat === "track") {
          repeatElement = (
            <p>
              Repeat: <strong>1</strong> / All / Off
            </p>
          );
        } else if (repeat === "context") {
          repeatElement = (
            <p>
              Repeat: 1 / <strong>All</strong> / Off
            </p>
          );
        }
        return repeatElement;
      },
      stop: () => <p>Stop</p>,
      advanced: () => <p>About</p>
    };

    return tooltips[this.state.activeButton]();
  }

  createMenuElements() {
    const menuElements = createButtons(
      this.props.audioManager,
      this.hideMenu,
      this.props.toggleMenu
    );
    menuElements.forEach(button => this.placeInScene(button));
    this.menuElements = menuElements.reduce(
      (obj, { name, position, onClick }) => ({
        [name]: {
          onClick,
          position
        },
        ...obj
      }),
      {}
    );
    this.menuElements.advanced = {
      onClick: this.props.toggleAbout,
      position: [2.25, -4.3, 1]
    };

    this.placeOrbitsInScene();
  }


  playHighlight() {
    // Only autoplay highlight on desktop to prevent multiple sounds at once
    if (typeof window.orientation === 'undefined') {
      if (this.props.audioManager.analyser.audioContext.state === "running") {
        this.highlightEffect.currentTime = 0;
        this.highlightEffect.play();
      }
    }
  }

  render() {
    return (
      <div>
        <div
          onClick={this.showIfHidden}
          className="menu"
          ref={mount => {
            this.mount = mount;
          }}
        />
        <div className="tooltips">{this.getToolTip()}</div>
      </div>
    );
  }
}

Menu.propTypes = {
  toggleMenu: PropTypes.func.isRequired,
  repeat: PropTypes.oneOf(["off", "context", "track"]).isRequired,
  hideDash: PropTypes.func.isRequired,
  hidden: PropTypes.bool.isRequired,
  showIfHidden: PropTypes.func.isRequired
};

export default Menu;
