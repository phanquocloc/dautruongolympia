/**
 * Liquid Light Show Canvas Simulation
 * Recreating 1967 San Francisco overhead projector clock-glass oil & dye light shows
 */

class LiquidLightShow {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.blobs = [];
    this.time = 0;
    this.swirlSpeed = 0.008;
    this.kaleidoscope = false;
    this.mouse = { x: 0, y: 0, active: false };
    this.colorPalette = [
      '#FF5F00', // Electric Orange
      '#FF1D8E', // Hot Pink
      '#C2F700', // Lime Green
      '#4700A5', // Royal Blue
      '#FFD700', // Sunshine Yellow
      '#A020F0'  // Purple Haze
    ];

    this.resize();
    this.initBlobs();
    this.bindEvents();
    this.animate();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = this.canvas.width = rect.width || 600;
    this.height = this.canvas.height = rect.height || 380;
  }

  initBlobs() {
    this.blobs = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 40 + Math.random() * 85,
        baseRadius: 40 + Math.random() * 85,
        color: this.colorPalette[i % this.colorPalette.length],
        phase: Math.random() * Math.PI * 2,
        pulsateSpeed: 0.02 + Math.random() * 0.03
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    const updateMouse = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      this.mouse.y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouse.active = true;
      updateMouse(e);
      // Spawn ripple droplet on move
      if (Math.random() < 0.25) {
        this.addDroplet(this.mouse.x, this.mouse.y);
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      this.mouse.active = true;
      updateMouse(e);
      this.addDroplet(this.mouse.x, this.mouse.y);
    }, { passive: true });

    this.canvas.addEventListener('mousedown', (e) => {
      updateMouse(e);
      for (let i = 0; i < 3; i++) {
        this.addDroplet(this.mouse.x + (Math.random() - 0.5) * 40, this.mouse.y + (Math.random() - 0.5) * 40, 50);
      }
    });
  }

  addDroplet(x, y, rad = 35) {
    if (this.blobs.length > 30) this.blobs.shift();
    this.blobs.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: rad,
      baseRadius: rad,
      color: this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)],
      phase: Math.random() * Math.PI * 2,
      pulsateSpeed: 0.04
    });
  }

  setSpeed(speedVal) {
    this.swirlSpeed = Number(speedVal);
  }

  toggleKaleidoscope() {
    this.kaleidoscope = !this.kaleidoscope;
    return this.kaleidoscope;
  }

  animate() {
    this.time += this.swirlSpeed;
    this.ctx.fillStyle = '#120722'; // Charcoal off-black
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.globalCompositeOperation = 'screen';

    const cx = this.width / 2;
    const cy = this.height / 2;

    this.blobs.forEach((blob, idx) => {
      // Swirling physics around center + mouse attraction
      const angle = this.time + blob.phase + idx * 0.4;
      const swirlDist = 60 + Math.sin(this.time * 0.5 + idx) * 45;
      
      blob.x += blob.vx + Math.cos(angle) * 0.8;
      blob.y += blob.vy + Math.sin(angle) * 0.8;

      if (this.mouse.active) {
        const dx = this.mouse.x - blob.x;
        const dy = this.mouse.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 1) {
          blob.vx += (dx / dist) * 0.25;
          blob.vy += (dy / dist) * 0.25;
        }
      }

      // Drag friction
      blob.vx *= 0.98;
      blob.vy *= 0.98;

      // Bounce off walls
      if (blob.x < -blob.radius) blob.x = this.width + blob.radius;
      if (blob.x > this.width + blob.radius) blob.x = -blob.radius;
      if (blob.y < -blob.radius) blob.y = this.height + blob.radius;
      if (blob.y > this.height + blob.radius) blob.y = -blob.radius;

      blob.radius = blob.baseRadius + Math.sin(this.time * 3 + blob.phase) * 14;

      // Render organic liquid gradient
      const radGrad = this.ctx.createRadialGradient(
        blob.x, blob.y, 4,
        blob.x, blob.y, Math.max(10, blob.radius)
      );
      radGrad.addColorStop(0, blob.color);
      radGrad.addColorStop(0.6, blob.color + 'aa');
      radGrad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = radGrad;
      this.ctx.beginPath();
      this.ctx.arc(blob.x, blob.y, Math.max(10, blob.radius), 0, Math.PI * 2);
      this.ctx.fill();

      // If kaleidoscope mode active: 4-fold radial reflection
      if (this.kaleidoscope) {
        const ox = this.width - blob.x;
        const oy = this.height - blob.y;

        this.ctx.beginPath();
        this.ctx.arc(ox, blob.y, Math.max(8, blob.radius * 0.9), 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(blob.x, oy, Math.max(8, blob.radius * 0.9), 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(ox, oy, Math.max(8, blob.radius * 0.9), 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    this.ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(() => this.animate());
  }
}

// Auto init when document loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('liquidCanvas')) {
    window.liquidShow = new LiquidLightShow('liquidCanvas');
  }
});
