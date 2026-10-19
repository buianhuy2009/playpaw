/**
 * PawPlay 5-State Biomimetic Prey AI & Feline-Calibrated Procedural Sprites
 *
 * Implements:
 * - 5-State Markov Finite State Machine:
 *   FREEZE_TREMOR (0.6s–2.2s micro-jitter, twitching)
 *   DART_SPRINT (600–950 px/s high-acceleration curved burst)
 *   STALK_CREEP (120–220 px/s sinusoidal prowl)
 *   EDGE_SKITTER (thigmotaxis wall-hugging along safe margin)
 *   CAUGHT_RESPAWN (180ms squish, 700ms offscreen delay, safe margin entry)
 * - 5 Dichromatic Procedural Sprites (Zero external image dependencies):
 *   1. Laser Dot (white core, yellow halo, blue glow, 8-point motion blur ribbon)
 *   2. Scurrying Roach/Beetle (espresso carapace, 6 cycling legs, twitching antennae)
 *   3. Field Mouse (grey-blue body, cream ears, whiskers, 4-node whipping tail)
 *   4. Pond Koi (golden-yellow & cobalt-blue 3-segment undulating spine, fins)
 *   5. Bumblebee (vivid yellow/black bands, 60Hz high-speed fluttering wing pairs)
 * - Multi-Prey Concurrency Manager (1–4 concurrent prey)
 */

export const PREY_TYPES = ['laser', 'bug', 'mouse', 'koi', 'bee'];
export const PREY_STATES = ['FREEZE_TREMOR', 'DART_SPRINT', 'STALK_CREEP', 'EDGE_SKITTER', 'CAUGHT_RESPAWN', 'HIDE_AND_PEEK', 'TRAPPED_BUZZ'];
export const SPEED_MODES = { kitten: 180, hunter: 400, apex: 750, ludicrous: 1100 };
export const SIZE_MODES = { tiny: 36, normal: 54, chonky: 76 };
export const PAW_PAD_TOLERANCE = 55;

/**
 * Geometric distance from point P to line segment AB
 */
export function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const rx = px - ax;
    const ry = py - ay;
    return Math.sqrt(rx * rx + ry * ry);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const diffX = px - projX;
  const diffY = py - projY;

  return Math.sqrt(diffX * diffX + diffY * diffY);
}

/**
 * Continuous line segment to circle intersection test with paw pad tolerance
 */
export function checkRaycastHit(ax, ay, bx, by, circleX, circleY, circleRadius, padTolerance = PAW_PAD_TOLERANCE) {
  const dist = distPointToSegment(circleX, circleY, ax, ay, bx, by);
  return dist <= (circleRadius + padTolerance);
}

/**
 * Individual Autonomous Biomimetic Prey Agent
 */
export class PreyAgent {
  /**
   * @param {number|string} id
   * @param {string} [type='mouse']
   * @param {string} [speedMode='hunter']
   * @param {string} [sizeMode='normal']
   */
  constructor(id, type = 'mouse', speedMode = 'hunter', sizeMode = 'normal') {
    this.id = id;
    this.type = PREY_TYPES.includes(type) ? type : 'mouse';
    this.speedMode = SPEED_MODES[speedMode] ? speedMode : 'hunter';
    this.sizeMode = SIZE_MODES[sizeMode] ? sizeMode : 'normal';

    this.baseSpeed = SPEED_MODES[this.speedMode] || 400;
    this.radius = SIZE_MODES[this.sizeMode] || 54;

    this.x = 200 + Math.random() * 400;
    this.y = 200 + Math.random() * 300;
    this.vx = (Math.random() - 0.5) * this.baseSpeed;
    this.vy = (Math.random() - 0.5) * this.baseSpeed;
    this.heading = Math.atan2(this.vy, this.vx);

    this.state = 'STALK_CREEP';
    this.stateTimer = 0;
    this.stateDuration = 1.5 + Math.random() * 1.0;
    this.jitter = 0;
    this.squishProgress = 0;
    this.isRespawning = false;
    this.offscreenTimer = 0; // Tracks duration spent past visible screen bounds

    // Feline pounce triggers & occlusion properties
    this.twitchTimer = 0;
    this.isUnderCover = false;
    this.coverPhase = 'none'; // 'none' | 'approaching' | 'hiding' | 'peeking' | 'emerging'
    this.coverSubTimer = 0;
    this.cutTimer = 0;
    this.legKick = 0;
    this.onAudioTrigger = null; // Callback: (actionType, panX) => void

    // Kinematics and procedural animation timers
    this.animTime = Math.random() * 10;
    this.trailHistory = []; // For laser motion ribbon
    this.maxTrailLength = 8;

    // Spinal joints for Koi
    this.spineJoints = [
      { x: this.x, y: this.y, angle: this.heading },
      { x: this.x, y: this.y, angle: this.heading },
      { x: this.x, y: this.y, angle: this.heading }
    ];

    // Whipping tail nodes for Mouse
    this.tailNodes = [
      { x: this.x, y: this.y },
      { x: this.x, y: this.y },
      { x: this.x, y: this.y },
      { x: this.x, y: this.y }
    ];
  }

  /**
   * Transitions agent to a new state in the Markov FSM.
   * @param {string} newState
   * @param {number} [duration=1.0]
   */
  changeState(newState, duration = 1.0) {
    this.state = newState;
    this.stateTimer = 0;
    this.stateDuration = duration;

    switch (newState) {
      case 'FREEZE_TREMOR':
        this.vx = 0;
        this.vy = 0;
        this.jitter = 0;
        this.twitchTimer = 0;
        break;

      case 'TRAPPED_BUZZ':
        this.vx = 0;
        this.vy = 0;
        this.jitter = 0;
        this.legKick = 1.0;
        break;

      case 'HIDE_AND_PEEK':
        this.coverPhase = 'approaching';
        this.coverSubTimer = 0;
        this.isUnderCover = false;
        break;

      case 'DART_SPRINT': {
        const sprintSpeed = this.baseSpeed * 1.8;
        const sprintAngle = this.heading + (Math.random() - 0.5) * 1.2;
        this.vx = Math.cos(sprintAngle) * sprintSpeed;
        this.vy = Math.sin(sprintAngle) * sprintSpeed;
        this.heading = sprintAngle;
        this.cutTimer = 0;
        this.isUnderCover = false;
        break;
      }

      case 'STALK_CREEP': {
        const creepSpeed = this.baseSpeed * 0.45;
        this.vx = Math.cos(this.heading) * creepSpeed;
        this.vy = Math.sin(this.heading) * creepSpeed;
        this.isUnderCover = false;
        break;
      }

      case 'EDGE_SKITTER': {
        const skitterSpeed = this.baseSpeed * 1.2;
        this.vx = Math.cos(this.heading) * skitterSpeed;
        this.vy = Math.sin(this.heading) * skitterSpeed;
        this.isUnderCover = false;
        break;
      }

      case 'CAUGHT_RESPAWN':
        this.vx = 0;
        this.vy = 0;
        this.squishProgress = 0;
        this.isRespawning = true;
        this.isUnderCover = false;
        break;
    }
  }

  /**
   * Advances the prey agent physics and state machine.
   * @param {number} dt - Clamped delta-time
   * @param {object} safeArea - { top, bottom, left, right }
   * @param {Array} [ambushCovers] - List of ambush covers for peek-a-boo occlusion
   */
  update(dt, safeArea = { top: 72, bottom: 696, left: 48, right: 976 }, ambushCovers = []) {
    const validDt = (typeof dt === 'number' && Number.isFinite(dt) && dt >= 0) ? dt : 0.016;
    this.animTime += validDt;
    this.stateTimer += validDt;

    // State 1: FREEZE_TREMOR (Longer 1.8s - 3.2s aiming pause with sharp micro-twitches)
    if (this.state === 'FREEZE_TREMOR') {
      this.twitchTimer += validDt;
      if (this.twitchTimer > 0.45) {
        this.twitchTimer = 0;
        this.heading += (Math.random() - 0.5) * 1.1; // crisp 30-40° angle snap
        this.jitter = (Math.random() - 0.5) * 4.5;
        this.legKick = 1.0;
        // Micro-hop
        this.x += Math.cos(this.heading) * (3 + Math.random() * 4);
        this.y += Math.sin(this.heading) * (3 + Math.random() * 4);
        if (this.onAudioTrigger) {
          const w = (safeArea && safeArea.right) ? safeArea.right : 1024;
          this.onAudioTrigger('twitch', (this.x / w) * 2 - 1);
        }
      } else {
        this.jitter = Math.sin(this.stateTimer * 45) * 1.5;
      }

      if (this.legKick > 0) {
        this.legKick = Math.max(0, this.legKick - validDt * 4.5);
      }

      if (this.stateTimer >= this.stateDuration) {
        const rand = Math.random();
        if (this.type === 'bee' || this.type === 'bug') {
          if (rand < 0.40) {
            this.changeState('TRAPPED_BUZZ', 0.5 + Math.random() * 0.3);
          } else if (rand < 0.75) {
            this.changeState('DART_SPRINT', 0.8 + Math.random() * 0.5);
          } else {
            this.changeState('HIDE_AND_PEEK', 3.5);
          }
        } else {
          if (rand < 0.55) {
            this.changeState('DART_SPRINT', 0.9 + Math.random() * 0.5);
          } else if (rand < 0.85) {
            this.changeState('HIDE_AND_PEEK', 3.5);
          } else {
            this.changeState('STALK_CREEP', 1.4);
          }
        }
      }
      return;
    }

    // State: TRAPPED_BUZZ (Frantic 0.5s struggle spin & wing flap)
    if (this.state === 'TRAPPED_BUZZ') {
      this.heading += (Math.random() - 0.5) * 32 * validDt;
      this.jitter = Math.sin(this.stateTimer * 60) * 3.5;
      this.legKick = 1.0;
      const spinSpeed = this.baseSpeed * 0.35;
      this.vx = Math.cos(this.heading) * spinSpeed;
      this.vy = Math.sin(this.heading) * spinSpeed;
      this.x += this.vx * validDt;
      this.y += this.vy * validDt;

      if (this.onAudioTrigger && Math.random() < 0.3) {
        const w = (safeArea && safeArea.right) ? safeArea.right : 1024;
        this.onAudioTrigger('buzz', (this.x / w) * 2 - 1);
      }

      if (this.stateTimer >= this.stateDuration) {
        // Sudden dead-stop freeze right after frantic struggle!
        this.changeState('FREEZE_TREMOR', 2.0 + Math.random() * 1.0);
      }
      return;
    }

    // State: HIDE_AND_PEEK (Peek-a-Boo Ambush Occlusion)
    if (this.state === 'HIDE_AND_PEEK') {
      this.coverSubTimer += validDt;

      let targetCover = null;
      if (ambushCovers && ambushCovers.length > 0) {
        let bestDist = Infinity;
        for (const c of ambushCovers) {
          const d = Math.hypot(c.x - this.x, c.y - this.y);
          if (d < bestDist) {
            bestDist = d;
            targetCover = c;
          }
        }
      }

      const tx = targetCover ? targetCover.x : (safeArea.left + 90);
      const ty = targetCover ? targetCover.y : (safeArea.top + 80);
      const dToCover = Math.hypot(tx - this.x, ty - this.y);

      if (this.coverPhase === 'approaching') {
        const angle = Math.atan2(ty - this.y, tx - this.x);
        this.heading = angle;
        const speed = this.baseSpeed * 1.35;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.x += this.vx * validDt;
        this.y += this.vy * validDt;

        if (dToCover < (targetCover ? targetCover.radius * 0.6 : 35)) {
          this.coverPhase = 'hiding';
          this.coverSubTimer = 0;
          this.isUnderCover = true;
          this.vx = 0;
          this.vy = 0;
          if (targetCover && typeof targetCover.shakeAmount !== 'undefined') {
            targetCover.shakeAmount = 4.5;
          }
          if (this.onAudioTrigger) {
            const w = (safeArea && safeArea.right) ? safeArea.right : 1024;
            this.onAudioTrigger('rustle', (this.x / w) * 2 - 1);
          }
        }
      } else if (this.coverPhase === 'hiding') {
        this.vx = 0;
        this.vy = 0;
        if (this.coverSubTimer >= 1.1) {
          this.coverPhase = 'peeking';
          this.coverSubTimer = 0;
          const centerX = (safeArea.left + safeArea.right) / 2;
          const centerY = (safeArea.top + safeArea.bottom) / 2;
          const peekAngle = Math.atan2(centerY - this.y, centerX - this.x);
          this.heading = peekAngle;
          this.x += Math.cos(peekAngle) * (this.radius * 0.55);
          this.y += Math.sin(peekAngle) * (this.radius * 0.55);
          if (targetCover && typeof targetCover.shakeAmount !== 'undefined') {
            targetCover.shakeAmount = 3.0;
          }
        }
      } else if (this.coverPhase === 'peeking') {
        this.vx = 0;
        this.vy = 0;
        this.jitter = Math.sin(this.stateTimer * 30) * 2.5;
        if (this.coverSubTimer >= 1.8) {
          this.coverPhase = 'emerging';
          this.isUnderCover = false;
          this.changeState('DART_SPRINT', 1.0 + Math.random() * 0.4);
        }
      }
      return;
    }

    // State 5: CAUGHT_RESPAWN
    if (this.state === 'CAUGHT_RESPAWN') {
      this.squishProgress = Math.min(1.0, this.stateTimer / 0.18);
      if (this.stateTimer >= 0.88) { // 180ms squish + 700ms offscreen delay
        this.isRespawning = false;
        const pad = this.radius + 10;
        const w = safeArea.right - safeArea.left;
        const h = safeArea.bottom - safeArea.top;
        this.x = safeArea.left + pad + Math.random() * (w - 2 * pad);
        this.y = safeArea.top + pad + Math.random() * (h - 2 * pad);
        this.heading = Math.random() * Math.PI * 2;
        this.changeState('STALK_CREEP', 1.5);
      }
      return;
    }

    // State 2: DART_SPRINT with erratic zig-zag cuts
    if (this.state === 'DART_SPRINT') {
      this.cutTimer += validDt;
      if (this.cutTimer > 0.25) {
        this.cutTimer = 0;
        this.heading += (Math.random() - 0.5) * 1.25;
        const sprintSpeed = this.baseSpeed * 1.8;
        this.vx = Math.cos(this.heading) * sprintSpeed;
        this.vy = Math.sin(this.heading) * sprintSpeed;
      }
    }

    // Integrate position
    this.x += this.vx * validDt;
    this.y += this.vy * validDt;

    // Update heading from velocity
    if (Math.abs(this.vx) > 0.001 || Math.abs(this.vy) > 0.001) {
      this.heading = Math.atan2(this.vy, this.vx);
    }

    // Off-screen return logic: prey can go off the screen, but not for long
    const isOffscreen = (
      this.x < safeArea.left ||
      this.x > safeArea.right ||
      this.y < safeArea.top ||
      this.y > safeArea.bottom
    );

    if (isOffscreen) {
      this.offscreenTimer += validDt;
      if (this.offscreenTimer > 0.45) {
        const centerX = (safeArea.left + safeArea.right) / 2;
        const centerY = (safeArea.top + safeArea.bottom) / 2;
        const angle = Math.atan2(centerY - this.y, centerX - this.x);
        const returnSpeed = Math.max(this.baseSpeed * 1.5, 450);
        this.vx = Math.cos(angle) * returnSpeed;
        this.vy = Math.sin(angle) * returnSpeed;
        this.heading = angle;
      }
      if (this.offscreenTimer > 1.0) {
        this.x = Math.max(safeArea.left - 20, Math.min(safeArea.right + 20, this.x));
        this.y = Math.max(safeArea.top - 20, Math.min(safeArea.bottom + 20, this.y));
        this.offscreenTimer = 0;
      }
    } else {
      this.offscreenTimer = 0;
    }

    // Markov state transition checks upon duration expiration
    if (this.stateTimer >= this.stateDuration) {
      const rand = Math.random();
      if (this.state === 'DART_SPRINT') {
        this.changeState('FREEZE_TREMOR', 1.8 + Math.random() * 1.2);
      } else if (this.state === 'STALK_CREEP') {
        if (rand < 0.4) {
          this.changeState('DART_SPRINT', 0.8 + Math.random() * 0.5);
        } else if (rand < 0.7) {
          this.changeState('EDGE_SKITTER', 0.8 + Math.random() * 0.5);
        } else {
          this.changeState('HIDE_AND_PEEK', 3.5);
        }
      } else if (this.state === 'EDGE_SKITTER') {
        this.changeState('DART_SPRINT', 0.7 + Math.random() * 0.4);
      }
    }

    // Update procedural kinematics
    this._updateKinematics(validDt);
  }

  /**
   * Updates tail, spine, and ribbon history
   * @private
   */
  _updateKinematics(dt) {
    // 1. Laser Motion Ribbon History
    if (this.type === 'laser') {
      this.trailHistory.unshift({ x: this.x, y: this.y });
      if (this.trailHistory.length > this.maxTrailLength) {
        this.trailHistory.pop();
      }
    }

    // 2. Mouse 4-node whipping tail inverse kinematics
    if (this.type === 'mouse') {
      let leaderX = this.x - Math.cos(this.heading) * (this.radius * 0.8);
      let leaderY = this.y - Math.sin(this.heading) * (this.radius * 0.8);
      const segLength = this.radius * 0.35;

      for (let i = 0; i < this.tailNodes.length; i++) {
        const node = this.tailNodes[i];
        const dx = node.x - leaderX;
        const dy = node.y - leaderY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const sway = Math.sin(this.animTime * 12 + i * 0.8) * (2 + i * 1.5);
        node.x = leaderX + (dx / dist) * segLength + Math.cos(this.heading + Math.PI / 2) * sway * 0.1;
        node.y = leaderY + (dy / dist) * segLength + Math.sin(this.heading + Math.PI / 2) * sway * 0.1;
        leaderX = node.x;
        leaderY = node.y;
      }
    }

    // 3. Koi 3-segment spinal joints undulation
    if (this.type === 'koi') {
      const segDist = this.radius * 0.55;
      let prevX = this.x;
      let prevY = this.y;
      let prevAngle = this.heading;

      for (let i = 0; i < this.spineJoints.length; i++) {
        const joint = this.spineJoints[i];
        const wave = Math.sin(this.animTime * 8 - i * 0.8) * 0.25;
        const targetAngle = prevAngle + wave;
        joint.x = prevX - Math.cos(targetAngle) * segDist;
        joint.y = prevY - Math.sin(targetAngle) * segDist;
        joint.angle = targetAngle;
        prevX = joint.x;
        prevY = joint.y;
        prevAngle = joint.angle;
      }
    }
  }

  /**
   * Renders high-fidelity biological procedural sprite.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!ctx) return;
    if (this.isRespawning && this.squishProgress >= 1.0) {
      // Offscreen delay phase: invisible
      return;
    }

    ctx.save();

    // 3D tactile elevation drop shadow for high contrast on light floors
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    // Apply micro-jitter if in FREEZE_TREMOR
    const drawX = this.x + (this.state === 'FREEZE_TREMOR' ? this.jitter : 0);
    const drawY = this.y + (this.state === 'FREEZE_TREMOR' ? this.jitter : 0);

    ctx.translate(drawX, drawY);
    ctx.rotate(this.heading);

    // Apply squish scale if caught
    if (this.isRespawning && this.squishProgress < 1.0) {
      const sX = 1 + this.squishProgress * 0.45;
      const sY = Math.max(0.05, 1 - this.squishProgress * 0.75);
      ctx.scale(sX, sY);
      ctx.globalAlpha = Math.max(0, 1 - this.squishProgress * 0.9);
    }

    const R = this.radius;

    // Draw chosen biological sprite
    switch (this.type) {
      case 'laser':
        this._drawLaser(ctx, R);
        break;
      case 'bug':
        this._drawBug(ctx, R);
        break;
      case 'mouse':
        this._drawMouse(ctx, R);
        break;
      case 'koi':
        this._drawKoi(ctx, R);
        break;
      case 'bee':
        this._drawBee(ctx, R);
        break;
      default:
        this._drawMouse(ctx, R);
    }

    ctx.restore();

    // Render unrotated laser trailing ribbon
    if (this.type === 'laser' && this.trailHistory.length > 1) {
      this._drawLaserTrail(ctx);
    }
  }

  // -------------------------------------------------------------
  // High-Fidelity Procedural Sprite Renderers
  // -------------------------------------------------------------

  /**
   * 1. Dichromatic Laser Dot
   */
  _drawLaser(ctx, R) {
    // Outer blue glow
    const glowGrad = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.5);
    glowGrad.addColorStop(0, 'rgba(0, 102, 255, 0.85)');
    glowGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.4)');
    glowGrad.addColorStop(1, 'rgba(0, 102, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Yellow halo
    ctx.fillStyle = '#FFD600';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Intense White core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Micro dispersion sparkles
    const sparkleAngle = this.animTime * 15;
    for (let i = 0; i < 4; i++) {
      const a = sparkleAngle + (i * Math.PI) / 2;
      const d = R * (0.8 + Math.sin(this.animTime * 20 + i) * 0.25);
      ctx.fillStyle = i % 2 === 0 ? '#00E5FF' : '#FFD600';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Laser Trail Ribbon
   */
  _drawLaserTrail(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < this.trailHistory.length - 1; i++) {
      const p1 = this.trailHistory[i];
      const p2 = this.trailHistory[i + 1];
      const ratio = 1 - i / this.trailHistory.length;
      ctx.strokeStyle = `rgba(0, 229, 255, ${ratio * 0.6})`;
      ctx.lineWidth = Math.max(1, this.radius * 0.6 * ratio);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 2. Scurrying Roach / Beetle
   */
  _drawBug(ctx, R) {
    const legPhase = this.animTime * 22;

    // 6 Cycling Jointed Legs
    ctx.strokeStyle = '#1A110B';
    ctx.lineWidth = Math.max(1.5, R * 0.08);
    ctx.lineCap = 'round';

    const legPositions = [-R * 0.3, 0, R * 0.3];
    legPositions.forEach((posX, idx) => {
      // Left leg
      const legWaveL = Math.sin(legPhase + idx * 1.8);
      const kneeX_L = posX - R * 0.35;
      const kneeY_L = -R * (0.7 + legWaveL * 0.2);
      const footX_L = posX - R * 0.6;
      const footY_L = -R * (1.1 + legWaveL * 0.3);

      ctx.beginPath();
      ctx.moveTo(posX, -R * 0.25);
      ctx.lineTo(kneeX_L, kneeY_L);
      ctx.lineTo(footX_L, footY_L);
      ctx.stroke();

      // Right leg
      const legWaveR = Math.sin(legPhase + idx * 1.8 + Math.PI);
      const kneeX_R = posX - R * 0.35;
      const kneeY_R = R * (0.7 + legWaveR * 0.2);
      const footX_R = posX - R * 0.6;
      const footY_R = R * (1.1 + legWaveR * 0.3);

      ctx.beginPath();
      ctx.moveTo(posX, R * 0.25);
      ctx.lineTo(kneeX_R, kneeY_R);
      ctx.lineTo(footX_R, footY_R);
      ctx.stroke();
    });

    // Abdomen & Carapace (Espresso with cyan/yellow iridescent highlights)
    const bodyGrad = ctx.createLinearGradient(-R, 0, R, 0);
    bodyGrad.addColorStop(0, '#100B07');
    bodyGrad.addColorStop(0.4, '#1A110B');
    bodyGrad.addColorStop(0.7, '#2A1C12');
    bodyGrad.addColorStop(1, '#1A110B');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.85, R * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glossy chitin highlight strip
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath();
    ctx.ellipse(R * 0.1, -R * 0.15, R * 0.5, R * 0.15, -0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Transverse yellow abdominal segments
    ctx.strokeStyle = '#FFD600';
    ctx.lineWidth = Math.max(1, R * 0.04);
    for (let s = -0.4; s <= 0.2; s += 0.3) {
      ctx.beginPath();
      ctx.arc(R * s, 0, R * 0.35, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
    }

    // Pronotum (Thorax)
    ctx.fillStyle = '#0D0805';
    ctx.beginPath();
    ctx.ellipse(R * 0.5, 0, R * 0.3, R * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#1A110B';
    ctx.beginPath();
    ctx.arc(R * 0.78, 0, R * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 2 Twitching Antennae
    const antTwitch = Math.sin(this.animTime * 16) * 0.15;
    ctx.strokeStyle = '#FFD600';
    ctx.lineWidth = Math.max(1, R * 0.04);
    ctx.beginPath();
    ctx.moveTo(R * 0.88, -R * 0.08);
    ctx.quadraticCurveTo(R * 1.3, -R * 0.3 + antTwitch * R, R * 1.7, -R * 0.5 + antTwitch * R);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(R * 0.88, R * 0.08);
    ctx.quadraticCurveTo(R * 1.3, R * 0.3 - antTwitch * R, R * 1.7, R * 0.5 - antTwitch * R);
    ctx.stroke();
  }

  /**
   * 3. Field Mouse
   */
  _drawMouse(ctx, R) {
    // Whipping tail nodes
    if (this.tailNodes.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#F6E05E';
      ctx.lineWidth = Math.max(1.5, R * 0.09);
      ctx.beginPath();
      ctx.moveTo(-R * 0.8, 0);
      for (let i = 0; i < this.tailNodes.length; i++) {
        // Transform world node position to local space
        const n = this.tailNodes[i];
        const dx = n.x - this.x;
        const dy = n.y - this.y;
        const localX = dx * Math.cos(-this.heading) - dy * Math.sin(-this.heading);
        const localY = dx * Math.sin(-this.heading) + dy * Math.cos(-this.heading);
        ctx.lineTo(localX, localY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Grey-blue body teardrop with subtle breathing expansion during freeze state
    const bodyGrad = ctx.createRadialGradient(-R * 0.1, 0, R * 0.1, 0, 0, R);
    bodyGrad.addColorStop(0, '#718096');
    bodyGrad.addColorStop(0.6, '#4A5568');
    bodyGrad.addColorStop(1, '#2D3748');

    const breathe = (this.state === 'FREEZE_TREMOR') ? Math.sin(this.animTime * 6) * (R * 0.05) : 0;
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.85 + breathe, R * 0.52 + breathe, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rounded Ears (cream outer, pink inner)
    const earAngle = 0.45;
    [-1, 1].forEach((side) => {
      const earY = side * R * 0.42;
      const earX = R * 0.35;

      // Outer ear
      ctx.fillStyle = '#4A5568';
      ctx.beginPath();
      ctx.arc(earX, earY, R * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Inner ear
      ctx.fillStyle = '#FED7D7';
      ctx.beginPath();
      ctx.arc(earX, earY, R * 0.16, 0, Math.PI * 2);
      ctx.fill();
    });

    // Snout / Nose
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.ellipse(R * 0.8, 0, R * 0.2, R * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF6B81';
    ctx.beginPath();
    ctx.arc(R * 0.95, 0, R * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Beady Black Eyes with white specular pinprick
    [-1, 1].forEach((side) => {
      const eyeX = R * 0.6;
      const eyeY = side * R * 0.22;
      ctx.fillStyle = '#1A110B';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, R * 0.09, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX + 1, eyeY - 1, R * 0.03, 0, Math.PI * 2);
      ctx.fill();
    });

    // Whiskers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    [-1, 1].forEach((side) => {
      [-0.15, 0, 0.15].forEach((wAng) => {
        ctx.beginPath();
        ctx.moveTo(R * 0.85, side * R * 0.1);
        ctx.lineTo(R * 1.35, side * (R * 0.45 + wAng * R));
        ctx.stroke();
      });
    });
  }

  /**
   * 4. Pond Koi (Golden-yellow & cobalt-blue 3-segment spinal joints)
   */
  _drawKoi(ctx, R) {
    const swimWave = Math.sin(this.animTime * 8);

    // Caudal Tail Fin
    ctx.fillStyle = 'rgba(255, 183, 3, 0.65)';
    ctx.beginPath();
    ctx.moveTo(-R * 0.8, 0);
    ctx.quadraticCurveTo(-R * 1.5, -R * (0.5 + swimWave * 0.3), -R * 1.7, -R * 0.2);
    ctx.lineTo(-R * 1.4, 0);
    ctx.lineTo(-R * 1.7, R * 0.2);
    ctx.quadraticCurveTo(-R * 1.5, R * (0.5 - swimWave * 0.3), -R * 0.8, 0);
    ctx.fill();

    // Pectoral Fins (Left & Right)
    ctx.fillStyle = 'rgba(33, 158, 188, 0.6)';
    const finWave = Math.sin(this.animTime * 10) * 0.15;
    ctx.beginPath();
    ctx.ellipse(R * 0.2, -R * 0.55, R * 0.35, R * 0.16, -0.6 + finWave, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(R * 0.2, R * 0.55, R * 0.35, R * 0.16, 0.6 - finWave, 0, Math.PI * 2);
    ctx.fill();

    // 3 Segment Body Spine
    // Head / Anterior Segment
    const koiGrad = ctx.createLinearGradient(-R * 0.8, 0, R * 0.8, 0);
    koiGrad.addColorStop(0, '#219EBC');
    koiGrad.addColorStop(0.45, '#FFB703');
    koiGrad.addColorStop(0.8, '#FB8500');
    koiGrad.addColorStop(1, '#023047');

    ctx.fillStyle = koiGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.88, R * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Calico markings / patches
    ctx.fillStyle = '#023047';
    ctx.beginPath();
    ctx.ellipse(-R * 0.2, -R * 0.12, R * 0.25, R * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(R * 0.25, R * 0.1, R * 0.2, R * 0.12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Black eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(R * 0.65, -R * 0.22, R * 0.07, 0, Math.PI * 2);
    ctx.arc(R * 0.65, R * 0.22, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 5. Bumblebee (Articulated jointed legs, iridescent veined wings, wing blur arcs, compound eyes)
   */
  _drawBee(ctx, R) {
    const isBuzzing = (this.state === 'TRAPPED_BUZZ' || this.state === 'DART_SPRINT' || this.legKick > 0);
    const wingFlap = Math.sin(this.animTime * (isBuzzing ? 120 : 60));

    // 1. 6 Articulated Black Jointed Legs (Coxa, Femur, Tibia, Tarsus)
    ctx.strokeStyle = '#110D09';
    ctx.lineWidth = Math.max(1.4, R * 0.05);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const legWave = Math.sin(this.animTime * 25);
    const kick = this.legKick * 0.4;

    [-1, 1].forEach((side) => {
      // Front Leg (reaching forward)
      ctx.beginPath();
      ctx.moveTo(R * 0.35, side * R * 0.28);
      ctx.lineTo(R * 0.6, side * (R * 0.55 + legWave * 4 + kick * 6));
      ctx.lineTo(R * 0.85, side * (R * 0.75 + kick * 8));
      ctx.stroke();

      // Middle Leg (reaching lateral)
      ctx.beginPath();
      ctx.moveTo(R * 0.05, side * R * 0.32);
      ctx.lineTo(R * 0.1, side * (R * 0.75 - legWave * 4 + kick * 6));
      ctx.lineTo(R * 0.2, side * (R * 0.98 + kick * 8));
      ctx.stroke();

      // Hind Leg (reaching back)
      ctx.beginPath();
      ctx.moveTo(-R * 0.25, side * R * 0.3);
      ctx.lineTo(-R * 0.5, side * (R * 0.75 + legWave * 4 + kick * 6));
      ctx.lineTo(-R * 0.8, side * (R * 0.95 + kick * 8));
      ctx.stroke();
    });

    // 2. High-Speed Wing-Flutter Motion Blur Arcs (when buzzing / struggling)
    if (isBuzzing) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(R * 0.1, -R * 0.65, R * 0.35, R * 0.75, -0.4, 0, Math.PI * 2);
      ctx.ellipse(R * 0.1, R * 0.65, R * 0.35, R * 0.75, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Translucent Veined Wing Pairs
    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;

    // Left Wing Pair
    ctx.save();
    ctx.translate(R * 0.1, -R * 0.25);
    ctx.scale(1, wingFlap * (isBuzzing ? 1.0 : 0.7));
    ctx.beginPath();
    ctx.ellipse(R * 0.1, -R * 0.65, R * 0.24, R * 0.58, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle wing vein
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(R * 0.1, -R * 0.75);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-R * 0.2, -R * 0.5, R * 0.17, R * 0.42, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Wing Pair
    ctx.save();
    ctx.translate(R * 0.1, R * 0.25);
    ctx.scale(1, -wingFlap * (isBuzzing ? 1.0 : 0.7));
    ctx.beginPath();
    ctx.ellipse(R * 0.1, R * 0.65, R * 0.24, R * 0.58, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(R * 0.1, R * 0.75);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-R * 0.2, R * 0.5, R * 0.17, R * 0.42, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Fuzzy Abdomen: Alternating Vivid Yellow (#FFD600) and Black Bands
    ctx.fillStyle = '#1A110B';
    ctx.beginPath();
    ctx.ellipse(-R * 0.15, 0, R * 0.75, R * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3 Vivid Yellow bands
    ctx.fillStyle = '#FFD600';
    [-R * 0.45, -R * 0.15, R * 0.15].forEach((stripX) => {
      ctx.beginPath();
      ctx.ellipse(stripX, 0, R * 0.12, R * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Fuzzy Thorax & Head
    ctx.fillStyle = '#110D09';
    ctx.beginPath();
    ctx.ellipse(R * 0.65, 0, R * 0.28, R * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 6. Dark Compound Eyes with Specular Highlight Dot
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(R * 0.7, -R * 0.2, R * 0.11, R * 0.15, 0.2, 0, Math.PI * 2);
    ctx.ellipse(R * 0.7, R * 0.2, R * 0.11, R * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Glossy Specular White Reflection Dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(R * 0.74, -R * 0.22, Math.max(1, R * 0.035), 0, Math.PI * 2);
    ctx.arc(R * 0.74, R * 0.18, Math.max(1, R * 0.035), 0, Math.PI * 2);
    ctx.fill();

    // 7. Curled Antennae
    const antTwitch = (this.state === 'FREEZE_TREMOR' ? Math.sin(this.animTime * 20) * 0.1 : 0);
    ctx.strokeStyle = '#FFD600';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(R * 0.85, -R * 0.08);
    ctx.quadraticCurveTo(R * 1.15, -R * (0.25 + antTwitch), R * 1.28, -R * (0.15 + antTwitch));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(R * 0.85, R * 0.08);
    ctx.quadraticCurveTo(R * 1.15, R * (0.25 - antTwitch), R * 1.28, R * (0.15 - antTwitch));
    ctx.stroke();

    // 8. Stinger
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(-R * 0.85, -R * 0.06);
    ctx.lineTo(-R * 1.12, 0);
    ctx.lineTo(-R * 0.85, R * 0.06);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Multi-Prey Concurrency Manager
 * Coordinates 1 to 4 autonomous prey agents, handles raycast touch hits,
 * and synchronizes with the physics and contrast engine.
 */
export class PreyManager {
  constructor() {
    this.preyList = [];
    this.type = 'mouse';
    this.speed = 'hunter';
    this.size = 'normal';
    this.count = 1;
  }

  /**
   * Initializes prey manager with count, type, speed, and size.
   * Clamps count to [1, 4].
   * @param {number} [count=1]
   * @param {string} [type='mouse']
   * @param {string} [speed='hunter']
   * @param {string} [size='normal']
   * @returns {PreyManager}
   */
  init(count = 1, type = 'mouse', speed = 'hunter', size = 'normal') {
    this.count = Math.max(1, Math.min(4, Math.floor(count) || 1));
    this.type = PREY_TYPES.includes(type) ? type : 'mouse';
    this.speed = SPEED_MODES[speed] ? speed : 'hunter';
    this.size = SIZE_MODES[size] ? size : 'normal';
    this.preyList = [];

    for (let i = 0; i < this.count; i++) {
      this.preyList.push(new PreyAgent(i, this.type, this.speed, this.size));
    }
    return this;
  }

  /**
   * Updates all active prey agents.
   * @param {number} dt
   * @param {object} [safeArea]
   * @param {Array} [ambushCovers]
   */
  update(dt, safeArea = { top: 72, bottom: 696, left: 48, right: 976 }, ambushCovers = []) {
    for (let i = 0; i < this.preyList.length; i++) {
      this.preyList[i].update(dt, safeArea, ambushCovers);
    }
  }

  /**
   * Renders all active prey agents onto canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!ctx) return;
    for (let i = 0; i < this.preyList.length; i++) {
      this.preyList[i].draw(ctx);
    }
  }

  /**
   * Tests continuous line-segment touch raycast against all prey agents.
   * @param {number} x1 - Previous touch X
   * @param {number} y1 - Previous touch Y
   * @param {number} x2 - Current touch X
   * @param {number} y2 - Current touch Y
   * @param {number} [tolerance=PAW_PAD_TOLERANCE] - +42px pad tolerance
   * @returns {PreyAgent[]} Array of hit prey agents
   */
  checkRaycastHit(x1, y1, x2, y2, tolerance = PAW_PAD_TOLERANCE) {
    const hits = [];
    for (let i = 0; i < this.preyList.length; i++) {
      const prey = this.preyList[i];
      if (prey.isRespawning) continue;
      if (checkRaycastHit(x1, y1, x2, y2, prey.x, prey.y, prey.radius, tolerance)) {
        hits.push(prey);
      }
    }
    return hits;
  }

  /**
   * Updates prey type for all agents.
   * @param {string} type
   */
  setPreyType(type) {
    if (PREY_TYPES.includes(type)) {
      this.type = type;
      for (const p of this.preyList) {
        p.type = type;
      }
    }
  }

  /**
   * Updates speed mode for all agents.
   * @param {string} speed
   */
  setSpeedMode(speed) {
    if (SPEED_MODES[speed]) {
      this.speed = speed;
      for (const p of this.preyList) {
        p.speedMode = speed;
        p.baseSpeed = SPEED_MODES[speed];
      }
    }
  }

  /**
   * Updates size mode for all agents.
   * @param {string} size
   */
  setSizeMode(size) {
    if (SIZE_MODES[size]) {
      this.size = size;
      for (const p of this.preyList) {
        p.sizeMode = size;
        p.radius = SIZE_MODES[size];
      }
    }
  }

  /**
   * Updates active prey count (1 to 4).
   * @param {number} count
   */
  setCount(count) {
    const clamped = Math.max(1, Math.min(4, Math.floor(count) || 1));
    if (clamped !== this.count) {
      this.init(clamped, this.type, this.speed, this.size);
    }
  }
}

export default PreyManager;

// -------------------------------------------------------------
// Universal Global & Module Exports
// -------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.PawPlayPrey = PreyManager;
  globalThis.PreyAgent = PreyAgent;
}
if (typeof window !== 'undefined') {
  window.PawPlayPrey = PreyManager;
  window.PreyAgent = PreyAgent;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PreyAgent,
    PreyManager,
    PREY_TYPES,
    PREY_STATES,
    SPEED_MODES,
    SIZE_MODES,
    PAW_PAD_TOLERANCE,
    distPointToSegment,
    checkRaycastHit
  };
}
