import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { createFoamParticles, createSplashParticles } from './particles';

// Import textures using ES6 imports (requires types declaration)
import beerColorTexture from './textures/beer_color.jpg';
import beerNormalMap from './textures/beer_normal.jpg';
import foamTexture from './textures/beer_foam.jpg';

interface ParticleUserData {
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
}

interface BeerObject {
  object: THREE.Group;
  physicsBody: CANNON.Body;
  beerMesh: THREE.Mesh;
  foamMesh: THREE.Mesh;
  splashParticles: THREE.Group;
  liquidLevel: number;
  originalBeerHeight: number;
  activeParticles: THREE.Mesh[];
  glassHeight: number;
  foamBubbles: THREE.Mesh[];
  liquidVelocity: THREE.Vector3;
  isSpilling: boolean;
  spillStartTime: number;
}

export default function createBeer(scene: THREE.Scene, world: CANNON.World): BeerObject {
  const beerGroup = new THREE.Group();
  const glassHeight = 30;
  const beerHeight = 25;

  
  // Texture loader with error handling
  const textureLoader = new THREE.TextureLoader();
  
  // Load textures
  const beerTex = textureLoader.load(beerColorTexture);
  const beerNorm = textureLoader.load(beerNormalMap);
  const foamTex = textureLoader.load(foamTexture);
  
  // Configure texture wrapping
  beerTex.wrapS = beerTex.wrapT = THREE.RepeatWrapping;
  beerNorm.wrapS = beerNorm.wrapT = THREE.RepeatWrapping;
  foamTex.wrapS = foamTex.wrapT = THREE.RepeatWrapping;
  
  // Set texture repeating based on glass size
  const textureRepeat = 2;
  beerTex.repeat.set(textureRepeat, textureRepeat);
  beerNorm.repeat.set(textureRepeat, textureRepeat);
  foamTex.repeat.set(textureRepeat, textureRepeat);

  // Glass Material
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.95,
    ior: 1.5,
    envMapIntensity: 1.0,
    transparent: true,
    thickness: 5.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });

  // Main glass body (outer)
  const outerGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, glassHeight, 32),
    glassMaterial
  );

  // Inner glass (creates thickness illusion)
  const innerGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 9.5, glassHeight - 1, 32),
    glassMaterial
  );
  innerGlass.position.y = 0.5;

  // Handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(10, 1, 12, 48, Math.PI),
    glassMaterial
  );
  handle.rotation.z = (3 * Math.PI) / 2;
  handle.position.x = 10;

  // Beer Liquid with texture
  const beerMaterial = new THREE.MeshPhysicalMaterial({
    map: beerTex,
    normalMap: beerNorm,
    color: 0xebc100,
    transmission: 0.2,
    roughness: 0.3,
    ior: 1.33,
    side: THREE.DoubleSide,
    thickness: 4.8,
  });

  const beer = new THREE.Mesh(
    new THREE.CylinderGeometry(9.0, 9.0, beerHeight, 32),
    beerMaterial
  );
  beer.position.y = beerHeight / 2 - 10;
  beer.name = "beerLiquid";

  // Foam with texture
  const foamMaterial = new THREE.MeshPhysicalMaterial({
    map: foamTex,
    color: 0xfff5e1,
    roughness: 0.7,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  const foam = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 8.5, 1.5, 32),
    foamMaterial
  );
  foam.position.y = beerHeight - 9.5;
  foam.name = "foam";

  // Foam particles
  const foamParticles = createFoamParticles();
  foam.add(foamParticles);

  // Splash particles
  const splashParticles = createSplashParticles();
  splashParticles.visible = false;
  beerGroup.add(splashParticles);

  // Physics body for the mug
  const mugShape = new CANNON.Cylinder(10, 10, glassHeight, 32);
  const mugBody = new CANNON.Body({
    mass: 0.5,
    shape: mugShape,
    material: new CANNON.Material({ restitution: 0.3 }),
    position: new CANNON.Vec3(0, 0, 0)
  });
  mugBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(mugBody);



  // Assemble the mug
  beerGroup.add(outerGlass, innerGlass, handle, beer, foam);
  scene.add(beerGroup);

  return {
    object: beerGroup,
    physicsBody: mugBody,
    beerMesh: beer,
    foamMesh: foam,
    splashParticles,
    liquidLevel: 1.0,
    originalBeerHeight: beerHeight,
    activeParticles: [],
    glassHeight,
    foamBubbles: [],
    liquidVelocity: new THREE.Vector3(),
    isSpilling: false,
    spillStartTime: 0
  };
}

export function updateBeer(beerObj: BeerObject, time: number, delta: number) {
  // Update liquid level and position
  beerObj.beerMesh.scale.y = beerObj.liquidLevel;
  beerObj.beerMesh.position.y = (beerObj.originalBeerHeight * beerObj.liquidLevel)/2 - 10;
  
  // Update foam position
  beerObj.foamMesh.position.y = beerObj.beerMesh.position.y + (beerObj.originalBeerHeight * beerObj.liquidLevel)/2;

  // Animate beer texture
  if (beerObj.beerMesh.material instanceof THREE.MeshPhysicalMaterial) {
    const material = beerObj.beerMesh.material;
    if (material.map) material.map.offset.y -= delta * 0.05;
    if (material.normalMap) material.normalMap.offset.y -= delta * 0.03;
  }

  // Animate foam texture
  if (beerObj.foamMesh.material instanceof THREE.MeshPhysicalMaterial && beerObj.foamMesh.material.map) {
    beerObj.foamMesh.material.map.offset.y += delta * 0.1;
  }

  // Simulate fluid movement based on physics body velocity
  const velocity = beerObj.physicsBody.velocity.length();
  
  // Make foam react to movement
  if (velocity > 0.1) {
    const waveIntensity = Math.min(velocity * 0.5, 1.5);
    const foamWave = Math.sin(time * 10) * waveIntensity * 0.1;
    const foamBob = Math.sin(time * 8) * waveIntensity * 0.2;
    
    beerObj.foamMesh.scale.y = 1 + foamWave * delta * 60;
    beerObj.foamMesh.position.y += foamBob * delta * 60;
  } else {
    beerObj.foamMesh.scale.y = 1;
  }

  // Update active splash particles
  for (let i = beerObj.activeParticles.length - 1; i >= 0; i--) {
    const particle = beerObj.activeParticles[i];
    const particleData = particle.userData as ParticleUserData;
    
    if (!particleData || particleData.lifetime >= particleData.maxLifetime) {
      particle.visible = false;
      beerObj.activeParticles.splice(i, 1);
      continue;
    }
    
    // Apply gravity
    particleData.velocity.y -= 9.8 * delta;
    
    // Update position
    particle.position.add(
      particleData.velocity.clone().multiplyScalar(delta)
    );
    
    // Update lifetime
    particleData.lifetime += delta;
    
    // Update opacity
    if (particle.material instanceof THREE.Material) {
      particle.material.opacity = 1 - (particleData.lifetime / particleData.maxLifetime);
    }
  }
  
  syncPhysicsToGraphics(beerObj.object, beerObj.physicsBody);
}

export function triggerSplash(beerObj: BeerObject, intensity: number, direction?: THREE.Vector3) {
  beerObj.liquidLevel = Math.max(0.3, beerObj.liquidLevel - (intensity * 0.1));
  
  const splashPos = beerObj.object.position.clone();
  splashPos.y += 10;

  const particleCount = Math.floor(15 * intensity);
  
  for (let i = 0; i < particleCount; i++) {
    let particle: THREE.Mesh;
    
    if (beerObj.splashParticles.children.length <= i) {
      const geometry = new THREE.SphereGeometry(0.3, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xebc100,
        transparent: true,
        opacity: 1
      });
      particle = new THREE.Mesh(geometry, material);
      beerObj.splashParticles.add(particle);
    } else {
      particle = beerObj.splashParticles.children[i] as THREE.Mesh;
    }
    
    particle.visible = true;
    particle.position.copy(splashPos);
    
    const angle = Math.random() * Math.PI * 2;
    const radius = 9;
    particle.position.x += Math.cos(angle) * radius;
    particle.position.z += Math.sin(angle) * radius;
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 5 * intensity,
      Math.random() * 8 * intensity,
      (Math.random() - 0.5) * 5 * intensity
    );

    if (direction) {
      velocity.add(direction.clone().multiplyScalar(5 * intensity));
    }

    particle.userData = {
      velocity: velocity,
      lifetime: 0,
      maxLifetime: 0.5 + Math.random() * 0.5
    };
    
    beerObj.activeParticles.push(particle);
  }
}

function syncPhysicsToGraphics(mesh: THREE.Object3D, body: CANNON.Body) {
  mesh.position.set(body.position.x, body.position.y, body.position.z);
  mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
}