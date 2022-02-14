import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'
import front from './assets/img/front.png'
import back from './assets/img/back.png'
import front2 from './assets/img/front2.png'
import back2 from './assets/img/back2.png'

export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1); 
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.cameraGroup = new THREE.Group()
    this.scene.add(this.cameraGroup)
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    this.camera.position.set(0, 0.1, 1.5);
    this.cameraGroup.add(this.camera)

    this.objectsDistance = 3
    this.mat2Offset = 0;

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = new THREE.Clock();
    this.elapsedTime = 0;

    this.isPlaying = true;

    this.cursor = new THREE.Vector2()
    this.target = new THREE.Vector2()
    

    this.scrollY = 0
    
    this.addObjects();
    this.resize();
    this.render();
    this.setupResize();
    this.addLights();
    this.onScroll();
    this.onCursor();
    // this.settings();
  }

  addLights(){
    this.scene.add(new THREE.AmbientLight(0xffffff,0.1))
    let dirLight = new THREE.DirectionalLight(0xffffff,2)
    dirLight.position.set(0,3,10)
    this.scene.add(dirLight)
  }
  
  settings() {
    let that = this;
    this.settings = {
      progress: 0,
    };
    this.gui = new dat.GUI();
    this.gui.add(this.settings, "progress", 0, 1, 0.01);

  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  onScroll(){
    window.addEventListener('scroll', () =>{
      this.scrollY = window.scrollY
    })
  }

  onCursor(){
    window.addEventListener('mousemove', (event) =>
    {
      this.cursor.x = event.clientX / this.width
      this.cursor.y = event.clientY / this.height
    })
  }

  addObjects() {
    let frontTexture = new THREE.TextureLoader().load(front);
    let backTexture = new THREE.TextureLoader().load(back);
    let frontTexture2 = new THREE.TextureLoader().load(front2);
    let backTexture2 = new THREE.TextureLoader().load(back2);

    [frontTexture,backTexture,frontTexture2,backTexture2].forEach(t=>{
      t.wrapS = 5000;
      t.wrapT = 5000;
      t.repeat.set(1,1)
      t.offset.setX(0.5)
      t.flipY = false
    })

    backTexture.repeat.set(-1,1)
    backTexture2.repeat.set(-1,1)

    let frontMaterial = new THREE.MeshStandardMaterial({
      map:frontTexture,
      side: THREE.BackSide,
      roughness:0.65,
      metalness:0.25,
      alphaTest:true,
      flatShading:true
    })
    let backMaterial = new THREE.MeshStandardMaterial({
      map:backTexture,
      side: THREE.FrontSide,
      roughness:0.65,
      metalness:0.25,
      alphaTest:true,
      flatShading:true
    })    
    let frontMaterial2 = new THREE.MeshStandardMaterial({
      map:frontTexture2,
      side: THREE.BackSide,
      roughness:0.65,
      metalness:0.25,
      alphaTest:true,
      flatShading:true
    })
    let backMaterial2 = new THREE.MeshStandardMaterial({
      map:backTexture2,
      side: THREE.FrontSide,
      roughness:0.65,
      metalness:0.25,
      alphaTest:true,
      flatShading:true
    })    

    this.geometry = new THREE.SphereBufferGeometry(1, 30,30);
    this.plane = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({color:0x00ff00,wireframe:true}));
    // this.scene.add(this.plane);

    let num = 3;
    let curvePoints = []
    for (let i = 0; i < num; i++) {
      let theta = (i/num * Math.PI*2);
        curvePoints.push(
          new THREE.Vector3().setFromSphericalCoords(
            1, Math.PI / 2 + 0.02 * (Math.random() - 0.5),theta
          )
        )
    }

    //Create a closed wavey loop
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.tension = 0.7;
    curve.closed = true;

    const points = curve.getPoints( 50 );
    const geometry = new THREE.BufferGeometry().setFromPoints( points );

    const material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
    material.visible = false;
    // Create the final object to add to the scene
    const curveObject = new THREE.Line( geometry, material );

    this.scene.add(curveObject);

    let number = 1000
    let frenetFrame = curve.computeFrenetFrames(number,true)
    let spacePoints = curve.getSpacedPoints(number)
    let tempPlane = new THREE.PlaneBufferGeometry(1,1,number,1)
    let dimensions = [-.12,0.12]

    this.materials = [frontMaterial,backMaterial]
    this.materials2 = [frontMaterial2,backMaterial2]
    tempPlane.addGroup(0,6000,0)
    tempPlane.addGroup(0,6000,1)

    let point = new THREE.Vector3()
    let biNormalShift = new THREE.Vector3()

    let finalPoints = []

    dimensions.forEach(d => {
      for (let i = 0; i <= number; i++) {
        point = spacePoints[i]
        biNormalShift.copy(frenetFrame.binormals[i]).multiplyScalar(d)

        finalPoints.push(new THREE.Vector3().copy(point).add(biNormalShift).normalize())
      }
    })

    finalPoints[0].copy(finalPoints[number])
    finalPoints[number+1].copy(finalPoints[2*number+1])

    tempPlane.setFromPoints(finalPoints)
    
    let finalMesh = new THREE.Mesh(tempPlane,this.materials)
    let finalMesh2 = new THREE.Mesh(tempPlane,this.materials2)
    finalMesh.position.x = this.objectsDistance * 0
    finalMesh.position.y = 0.25
    finalMesh.rotation.x = 0.5
    finalMesh.rotation.z = - 0.5
    finalMesh2.position.x = this.objectsDistance * 1
    finalMesh2.position.y = 0.25
    finalMesh2.rotation.x = 0.5
    finalMesh2.rotation.z = - 0.5
    this.scene.add(finalMesh,finalMesh2)

  }

  render() {
    if (!this.isPlaying) return;
    this.elapsedTime = this.time.getElapsedTime()
    // const deltaTime = elapsedTime - this.previousTime
    // this.previousTime = this.elapsedTime


    this.cameraGroup.position.x = this.scrollY / this.height * this.objectsDistance
    this.target.x = ( 1 - this.cursor.x ) * 0.5;
    this.target.y = ( 1 - this.cursor.y ) * 0.5;
    this.cameraGroup.rotation.x += 0.75 * (this.target.y - this.cameraGroup.rotation.x)
    this.cameraGroup.rotation.y += 0.75 * (this.target.x - this.cameraGroup.rotation.y)
    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.materials.forEach( (m, i)=> {
      m.map.offset.setX(this.elapsedTime * 0.1) 
      if(i > 0){
        m.map.offset.setX(- this.elapsedTime * 0.1) 
      }
    })
    this.materials2.forEach( (m, i)=> {
      m.map.offset.setX(this.elapsedTime * 0.1)
      if(i > 0){
        m.map.offset.setX(-this.elapsedTime * 0.1)
      }
    })
  }
}

new Sketch({
  dom: document.getElementById("container")
});

