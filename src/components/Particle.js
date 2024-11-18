// Particle.js
// https://liginc.co.jp/548806
export default class Particle {
    constructor(x, y, transparent, radius) {
      this.x = x;
      this.y = y;
      this.transparent = transparent;
      this.radius = radius;
    }
  
    update() {
      this.transparent -= 0.05;
      let radius = this.radius -= 5;
      this.radius = radius > 0 ? radius : 0;
    }

  }