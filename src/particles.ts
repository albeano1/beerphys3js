import * as THREE from "three";

interface ParticleUserData {
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
  initialPosition: THREE.Vector3;
}

export function createFoamParticles(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({
    color: 0xfff5e1,
    transparent: true,
    opacity: 0.8,
    specular: 0x111111,
    shininess: 30
  });

  for (let i = 0; i < 50; i++) {
    const size = 0.2 + Math.random() * 0.3;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const particle = new THREE.Mesh(geometry, material.clone());
    particle.visible = false;
    particle.castShadow = true;
    group.add(particle);
  }

  return group;
}

export function createSplashParticles(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({
    color: 0xebc100,
    transparent: true,
    opacity: 0.9,
    specular: 0x111111,
    shininess: 30
  });

  for (let i = 0; i < 200; i++) {
    const size = 0.5 + Math.random() * 0.7;
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const particle = new THREE.Mesh(geometry, material.clone());
    particle.visible = false;
    particle.castShadow = true;
    particle.receiveShadow = true;
    group.add(particle);
  }

  return group;
}

export function updateSplashParticles(particles: THREE.Group, delta: number) {
  particles.children.forEach(particle => {
    if (!particle.visible || !(particle instanceof THREE.Mesh)) return;

    const data = particle.userData as ParticleUserData;
    if (!data) return;

    data.lifetime += delta;

    // Apply gravity and movement
    data.velocity.y -= 9.8 * delta * 0.5;
    particle.position.add(data.velocity.clone().multiplyScalar(delta));

    // Fade out and shrink particles
    const lifeRatio = data.lifetime / data.maxLifetime;
    if (particle.material instanceof THREE.MeshPhongMaterial) {
      particle.material.opacity = 1 - lifeRatio;
    }
    
    // Scale down over time
    const scale = 1 - (lifeRatio * 0.5);
    particle.scale.set(scale, scale, scale);

    // Remove expired particles
    if (data.lifetime >= data.maxLifetime) {
      particle.visible = false;
      particle.scale.set(1, 1, 1);
    }
  });
}

export function triggerSplash(
  particles: THREE.Group,
  position: THREE.Vector3,
  intensity: number,
  direction?: THREE.Vector3,
  mugRotation?: THREE.Euler
) {
  const particleCount = Math.min(
    Math.floor(70 * intensity),
    particles.children.length
  );

  for (let i = 0; i < particleCount; i++) {
    const particle = particles.children[i] as THREE.Mesh;
    if (particle.visible) continue;
    
    particle.position.copy(position);
    
    // Calculate direction with mug rotation influence
    const splashDirection = new THREE.Vector3();
    if (direction) {
      splashDirection.copy(direction);
      if (mugRotation) {
        const quaternion = new THREE.Quaternion().setFromEuler(mugRotation);
        splashDirection.applyQuaternion(quaternion);
      }
    }

    // Random spread with directional bias
    const spreadAngle = Math.random() * Math.PI * 2;
    const spreadRadius = 2 + Math.random() * 4;
    const spreadHeight = Math.random() * 3;
    
    particle.position.x += Math.cos(spreadAngle) * spreadRadius;
    particle.position.z += Math.sin(spreadAngle) * spreadRadius;
    particle.position.y += spreadHeight;

    // Initial velocity
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 20 * intensity,
      Math.random() * 15 * intensity,
      (Math.random() - 0.5) * 20 * intensity
    );

    if (direction) {
      velocity.add(splashDirection.multiplyScalar(15 * intensity));
    }

    // Store particle data
    particle.userData = {
      velocity: velocity,
      lifetime: 0,
      maxLifetime: 0.8 + Math.random() * 0.7,
      size: particle.scale.x,
      initialPosition: particle.position.clone()
    };

    // Reset appearance
    if (particle.material instanceof THREE.MeshPhongMaterial) {
      particle.material.opacity = 1;
      particle.material.needsUpdate = true;
    }
    
    particle.scale.set(1, 1, 1);
    particle.visible = true;
  }
}