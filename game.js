/**
 * Flappy Bird Ultra - Pure OOP Web Audio/Canvas Production Architecture
 * Complete, standalone deployment script.
 */

// --- AUDIO SYNTHESIS SUBSYSTEM (Procedural Web Audio API) ---
class SoundController {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume context if suspended by browser autoplay policies
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    playFlap() {
        if (this.isMuted) return;
        this.init();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.13);
    }

    playScore() {
        if (this.isMuted) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const playNote = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.15, start);
            gain.gain.linearRampToValueAtTime(0.01, start + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + duration);
        };
        // Arpeggio combo trigger
        playNote(587.33, now, 0.08); // D5
        playNote(880.00, now + 0.07, 0.15); // A5
    }

    playCollision() {
        if (this.isMuted) return;
        this.init();
        
        const now = this.ctx.currentTime;
        
        // Low impact rumble
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(160, now);
        osc1.frequency.linearRampToValueAtTime(40, now + 0.3);
        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start();
        osc1.stop(now + 0.3);

        // White-noise explosion component simulation
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(400, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();
        noise.stop(now + 0.25);
    }
}

// --- PARALLAX BACKGROUND SUBSYSTEM ---
class Background {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.groundHeight = 90;
        this.skyColor = '#70c5ce';
        this.skyColorDark = '#1a1c23';
        
        this.clouds = [
            { x: 40, y: 80, size: 45, speed: 12 },
            { x: 220, y: 140, size: 60, speed: 18 },
            { x: 380, y: 70, size: 35, speed: 8 }
        ];
        
        this.cityBlocks = [
            { x: 0, width: 80, height: 180, seed: 1 },
            { x: 70, width: 110, height: 240, seed: 2 },
            { x: 160, width: 90, height: 150, seed: 3 },
            { x: 230, width: 120, height: 210, seed: 4 },
            { x: 330, width: 75, height: 170, seed: 5 },
            { x: 390, width: 110, height: 230, seed: 6 }
        ];

        this.groundOffset = 0;
    }

    update(dt, gameSpeed, isDarkMode) {
        // Move clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * dt;
            if (cloud.x + cloud.size * 2 < 0) {
                cloud.x = this.width + cloud.size;
                cloud.y = 50 + Math.random() * 120;
            }
        });

        // Move distant city lines
        this.cityBlocks.forEach(block => {
            block.x -= (gameSpeed * 0.15) * dt;
            if (block.x + block.width < 0) {
                block.x = this.width;
            }
        });

        // Move ground layer
        this.groundOffset -= gameSpeed * dt;
        if (this.groundOffset <= -30) {
            this.groundOffset = 0;
        }
    }

    draw(ctx, isDarkMode) {
        // Sky base setup
        ctx.fillStyle = isDarkMode ? this.skyColorDark : this.skyColor;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Sun/Moon
        ctx.fillStyle = isDarkMode ? 'rgba(245, 246, 250, 0.8)' : 'rgba(254, 202, 87, 0.9)';
        ctx.beginPath();
        ctx.arc(this.width - 80, 100, isDarkMode ? 25 : 35, 0, Math.PI * 2);
        ctx.fill();

        // Draw Clouds
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.65)';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.3, cloud.size * 0.8, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 1.1, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Silhouetted Cityscape
        ctx.fillStyle = isDarkMode ? '#131419' : '#4ca8b3';
        this.cityBlocks.forEach(block => {
            const topY = this.height - this.groundHeight - block.height;
            ctx.fillRect(block.x, topY, block.width, block.height);
            // Dynamic window patterns
            ctx.fillStyle = isDarkMode ? 'rgba(241, 196, 15, 0.15)' : 'rgba(255, 255, 255, 0.15)';
            let winSize = 4;
            for (let wx = block.x + 8; wx < block.x + block.width - 8; wx += 14) {
                for (let wy = topY + 15; wy < this.height - this.groundHeight - 10; wy += 22) {
                    if ((Math.sin(wx + wy + block.seed) > -0.2)) {
                        ctx.fillRect(wx, wy, winSize, winSize + 2);
                    }
                }
            }
            ctx.fillStyle = isDarkMode ? '#131419' : '#4ca8b3';
        });

        // Wrap around duplicated foreground ground loop
        const groundY = this.height - this.groundHeight;
        ctx.fillStyle = isDarkMode ? '#2d3436' : '#ded895';
        ctx.fillRect(0, groundY, this.width, this.groundHeight);

        // Ground upper turf accent line
        ctx.fillStyle = isDarkMode ? '#10ac84' : '#73bf2e';
        ctx.fillRect(0, groundY, this.width, 14);

        // Procedural diagonal track slice lines on ground
        ctx.fillStyle = isDarkMode ? '#0b7b5e' : '#5da11e';
        for (let x = this.groundOffset; x < this.width + 30; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, groundY + 14);
            ctx.lineTo(x - 12, groundY + this.groundHeight);
            ctx.lineTo(x - 4, groundY + this.groundHeight);
            ctx.lineTo(x + 8, groundY + 14);
            ctx.fill();
        }
    }
}

// --- ENTITY ARCHITECTURE: BIRD ---
class Bird {
    constructor() {
        this.reset();
        this.radius = 15;
    }

    reset() {
        this.x = 90;
        this.y = 300;
        this.velocity = 0;
        this.rotation = 0;
        this.wingFrame = 0;
        this.wingDirection = 1;
    }

    flap(config) {
        this.velocity = config.jumpForce;
    }

    update(dt, config, canvasHeight, groundHeight) {
        // Delta physics processing
        this.velocity += config.gravity * dt;
        this.y += this.velocity * dt;

        // Wing configuration animation logic
        this.wingFrame += 5 * dt * this.wingDirection;
        if (Math.abs(this.wingFrame) > 8) this.wingDirection *= -1;

        // Scale angle calculated accurately based on fall velocity threshold
        const targetRotation = Math.min(Math.max(-0.4, this.velocity / 700), 1.1);
        // Direct interpolation interpolation for angular smoothness
        this.rotation += (targetRotation - this.rotation) * 12 * dt;

        // Bound ceiling constraints
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    }

    draw(ctx, isDarkMode) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const primary = isDarkMode ? '#ff7675' : '#ffca28';
        const belly = isDarkMode ? '#fab1a0' : '#fff176';
        const accent = '#ff3f34';

        // Bird Body base rendering
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Inner belly layout
        ctx.fillStyle = belly;
        ctx.beginPath();
        ctx.arc(-2, 3, this.radius * 0.7, 0.2, Math.PI * 0.95);
        ctx.fill();

        // Big stylized eye construction
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, -4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak design
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(12, -1);
        ctx.lineTo(22, 2);
        ctx.lineTo(11, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Flapping Wing positioning
        ctx.fillStyle = isDarkMode ? '#d63031' : '#f57f17';
        ctx.save();
        ctx.translate(-6, 2);
        ctx.rotate(this.wingFrame * 0.06);
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }
}

// --- ENTITY ARCHITECTURE: OBSTACLE PIPE ---
class Pipe {
    constructor(startX, canvasHeight, groundHeight, config) {
        this.x = startX;
        this.canvasHeight = canvasHeight;
        this.groundHeight = groundHeight;
        this.width = 72;
        this.passed = false;
        
        this.minHeight = 60;
        this.gap = config.pipeGap;
        
        const availableHeight = this.canvasHeight - this.groundHeight - this.gap;
        this.topHeight = this.minHeight + Math.random() * (availableHeight - (this.minHeight * 2));
        this.bottomY = this.topHeight + this.gap;
        this.bottomHeight = this.canvasHeight - this.groundHeight - this.bottomY;
    }

    update(dt, speed) {
        this.x -= speed * dt;
    }

    draw(ctx, isDarkMode) {
        const pipeColor = isDarkMode ? '#57606f' : '#2ecc71';
        const pipeLip = isDarkMode ? '#2f3542' : '#27ae60';
        const shadow = 'rgba(0, 0, 0, 0.15)';
        const lipHeight = 22;
        const lipOutset = 4;

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';

        // --- TOP PIPE DRAW ---
        ctx.fillStyle = pipeColor;
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        ctx.strokeRect(this.x, -5, this.width, this.topHeight + 5);

        // Top Pipe Highlight Streak
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 6, 0, 8, this.topHeight);

        // Top End Lip
        ctx.fillStyle = pipeLip;
        ctx.fillRect(this.x - lipOutset, this.topHeight - lipHeight, this.width + (lipOutset * 2), lipHeight);
        ctx.strokeRect(this.x - lipOutset, this.topHeight - lipHeight, this.width + (lipOutset * 2), lipHeight);
        
        // Inner shadow inside gap opening
        ctx.fillStyle = shadow;
        ctx.fillRect(this.x, this.topHeight - 4, this.width, 4);

        // --- BOTTOM PIPE DRAW ---
        ctx.fillStyle = pipeColor;
        ctx.fillRect(this.x, this.bottomY, this.width, this.bottomHeight);
        ctx.strokeRect(this.x, this.bottomY, this.width, this.bottomHeight + 5);

        // Bottom Pipe Highlight Streak
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 6, this.bottomY, 8, this.bottomHeight);

        // Bottom End Lip
        ctx.fillStyle = pipeLip;
        ctx.fillRect(this.x - lipOutset, this.bottomY, this.width + (lipOutset * 2), lipHeight);
        ctx.strokeRect(this.x - lipOutset, this.bottomY, this.width + (lipOutset * 2), lipHeight);

        ctx.fillStyle = shadow;
        ctx.fillRect(this.x, this.bottomY, this.width, 4);
    }

    checkCollision(bird) {
        // Broad radius optimization zone check
        if (bird.x + bird.radius > this.x && bird.x - bird.radius < this.x + this.width) {
            // Collision checks against top boundaries
            if (bird.y - bird.radius < this.topHeight) {
                return true;
            }
            // Collision checks against lower boundaries
            if (bird.y + bird.radius > this.bottomY) {
                return true;
            }
        }
        return false;
    }
}

// --- PARTICLE EMISSION SUBSYSTEM ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 2 + Math.random() * 4;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 140;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.alpha = 1;
        this.decay = 1.2 + Math.random() * 1.5;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.alpha -= this.decay * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- MAIN ENGINE CONTROLLER ---
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Match explicit design dimension aspect ratios
        this.baseWidth = 480;
        this.baseHeight = 850;
        this.resizeCanvas();

        this.sound = new SoundController();
        this.bg = new Background(this.baseWidth, this.baseHeight);
        this.bird = new Bird();
        
        this.pipes = [];
        this.particles = [];
        
        // System Loop Configuration Trackers
        this.lastTime = 0;
        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
        this.isDarkMode = false;
        this.chosenDifficulty = 'easy';
        
        // Engine Settings Map Matrices
        this.diffConfig = {
            easy: { gravity: 1550, jumpForce: -440, pipeGap: 180, baseSpeed: 170, speedScale: 4 },
            normal: { gravity: 1750, jumpForce: -470, pipeGap: 145, baseSpeed: 210, speedScale: 7 },
            hard: { gravity: 1950, jumpForce: -500, pipeGap: 125, baseSpeed: 250, speedScale: 11 }
        };
        this.activeConfig = this.diffConfig.easy;

        // Dynamic State Registers
        this.score = 0;
        this.combo = 1;
        this.pipesPassedCount = 0;
        this.comboWindowTimer = 0;
        this.currentSpeed = 0;
        
        // Special Juice Effects Parameters
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Engine Frame Diagnostic Performance Profiles
        this.fps = 60;
        this.fpsFrameCount = 0;
        this.fpsTimeAccumulator = 0;

        // Static Session Global Registers
        this.stats = JSON.parse(localStorage.getItem('flappy_ultra_stats')) || {
            gamesPlayed: 0, totalFlaps: 0, totalPipes: 0, maxCombo: 1, totalTime: 0
        };
        this.highScores = JSON.parse(localStorage.getItem('flappy_ultra_highscores')) || {
            easy: 0, normal: 0, hard: 0
        };
        this.achievements = JSON.parse(localStorage.getItem('flappy_ultra_achieve')) || [
            { id: 'first_flight', title: 'First Flight', desc: 'Flap wings once', unlocked: false, icon: '🪶' },
            { id: 'bronze', title: 'Bronze Aviator', desc: 'Reach 10 points', unlocked: false, icon: '🥉' },
            { id: 'silver', title: 'Silver Captain', desc: 'Reach 25 points', unlocked: false, icon: '🥈' },
            { id: 'gold', title: 'Gold Overlord', desc: 'Reach 50 points', unlocked: false, icon: '🥇' },
            { id: 'combo_king', title: 'Combo King', desc: 'Hit a 5x chain combo multiplier', unlocked: false, icon: '🔥' }
        ];

        window.addEventListener('resize', () => this.resizeCanvas());
        this.bindInputEvents();
        this.initUI();
        this.syncThemeInterface();
    }

    resizeCanvas() {
        const container = document.getElementById('game-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        } else {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    initUI() {
        // Main Screen Navigation Actions
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        
        document.getElementById('stats-btn').addEventListener('click', () => {
            this.renderStats();
            document.getElementById('stats-overlay').classList.remove('hidden');
        });
        document.getElementById('close-stats-btn').addEventListener('click', () => {
            document.getElementById('stats-overlay').classList.add('hidden');
        });

        document.getElementById('achieve-btn').addEventListener('click', () => {
            this.renderAchievements();
            document.getElementById('achieve-overlay').classList.remove('hidden');
        });
        document.getElementById('close-achieve-btn').addEventListener('click', () => {
            document.getElementById('achieve-overlay').classList.add('hidden');
        });

        document.getElementById('toggle-dark-mode').addEventListener('click', () => {
            this.isDarkMode = !this.isDarkMode;
            this.syncThemeInterface();
        });

        // Difficulty Matrix Toggles
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                diffButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.chosenDifficulty = e.target.dataset.diff;
            });
        });

        // In-game Interactive Buttons
        document.getElementById('pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.togglePause(); });
        document.getElementById('mute-btn').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMute(); });
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        
        document.getElementById('pause-main-menu-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('over-main-menu-btn').addEventListener('click', () => this.quitToMenu());
    }

    syncThemeInterface() {
        const root = document.body;
        const toggleBtn = document.getElementById('toggle-dark-mode');
        if (this.isDarkMode) {
            root.classList.add('dark-theme');
            toggleBtn.innerText = "THEME: DARK";
        } else {
            root.classList.remove('dark-theme');
            toggleBtn.innerText = "THEME: LIGHT";
        }
    }

    bindInputEvents() {
        // Multi-platform unified trigger routine
        const triggerJump = (e) => {
            if (this.state === 'PLAYING') {
                this.bird.flap(this.activeConfig);
                this.sound.playFlap();
                this.stats.totalFlaps++;
                this.checkAchievementUnlock('first_flight');
                this.saveStatsToStorage();
            } else if (this.state === 'MENU') {
                // Ignore clicks if choosing profiles inside main menu bounds 
                if (e.target.closest('#main-menu') && !e.target.classList.contains('screen')) return;
            }
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                triggerJump(e);
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === 'PLAYING' || this.state === 'PAUSED') this.togglePause();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => triggerJump(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            triggerJump(e);
        }, { passive: false });
    }

    startGame() {
        this.state = 'PLAYING';
        this.activeConfig = this.diffConfig[this.chosenDifficulty];
        
        this.score = 0;
        this.combo = 1;
        this.pipesPassedCount = 0;
        this.comboWindowTimer = 0;
        this.currentSpeed = this.activeConfig.baseSpeed;
        
        this.bird.reset();
        this.pipes = [];
        this.particles = [];
        this.shakeTimer = 0;

        // Initialize and generate initial structural dynamic pipes
        this.spawnPipe(this.baseWidth + 100);
        this.spawnPipe(this.baseWidth + 360);

        this.stats.gamesPlayed++;
        this.saveStatsToStorage();

        // Screen UI swaps
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('score-display').innerText = this.score;
        this.updateComboHUD();
    }

    spawnPipe(targetX) {
        this.pipes.push(new Pipe(targetX, this.baseHeight, this.bg.groundHeight, this.activeConfig));
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-screen').classList.add('hidden');
        }
    }

    toggleMute() {
        const muted = this.sound.toggleMute();
        document.getElementById('mute-btn').innerText = muted ? "🔇" : "🔊";
    }

    quitToMenu() {
        this.state = 'MENU';
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }

    triggerScreenShake(duration, power) {
        this.shakeTimer = duration;
        this.shakeIntensity = power;
    }

    handleCollisionCrash() {
        this.state = 'GAMEOVER';
        this.sound.playCollision();
        this.triggerScreenShake(0.45, 14);

        // Explode bird into visual elements particles
        for (let i = 0; i < 25; i++) {
            this.particles.push(new Particle(this.bird.x, this.bird.y, this.isDarkMode ? '#ff7675' : '#ffca28'));
        }

        // Save High Scores structure evaluation
        if (this.score > this.highScores[this.chosenDifficulty]) {
            this.highScores[this.chosenDifficulty] = this.score;
            localStorage.setItem('flappy_ultra_highscores', JSON.stringify(this.highScores));
        }

        this.saveStatsToStorage();

        // Load metrics immediately to user interface
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-combo').innerText = this.combo + 'x';
        document.getElementById('best-score').innerText = this.highScores[this.chosenDifficulty];
        
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    incrementScore(pipeInstance) {
        pipeInstance.passed = true;
        this.pipesPassedCount++;
        this.stats.totalPipes++;

        // Combo system logic calculations
        if (this.comboWindowTimer > 0) {
            this.combo++;
            if (this.combo > this.stats.maxCombo) this.stats.maxCombo = this.combo;
        } else {
            this.combo = 1;
        }

        // Set combo refresh window to expire 2 seconds out
        this.comboWindowTimer = 2.0;

        const evaluatedPoints = 1 * this.combo;
        this.score += evaluatedPoints;
        
        document.getElementById('score-display').innerText = this.score;
        this.updateComboHUD();
        this.sound.playScore();

        // Continuous game scaling acceleration calculations
        this.currentSpeed = this.activeConfig.baseSpeed + (this.pipesPassedCount * this.activeConfig.speedScale);

        // Runtime condition validation check entries
        if (this.score >= 10) this.checkAchievementUnlock('bronze');
        if (this.score >= 25) this.checkAchievementUnlock('silver');
        if (this.score >= 50) this.checkAchievementUnlock('gold');
        if (this.combo >= 5) this.checkAchievementUnlock('combo_king');
    }

    updateComboHUD() {
        const el = document.getElementById('combo-display');
        if (this.combo > 1) {
            el.innerText = `Combo x${this.combo}`;
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    checkAchievementUnlock(id) {
        const a = this.achievements.find(item => item.id === id);
        if (a && !a.unlocked) {
            a.unlocked = true;
            localStorage.setItem('flappy_ultra_achieve', JSON.stringify(this.achievements));
        }
    }

    saveStatsToStorage() {
        localStorage.setItem('flappy_ultra_stats', JSON.stringify(this.stats));
    }

    renderStats() {
        document.getElementById('stat-games').innerText = this.stats.gamesPlayed;
        document.getElementById('stat-flaps').innerText = this.stats.totalFlaps;
        document.getElementById('stat-pipes').innerText = this.stats.totalPipes;
        document.getElementById('stat-combo').innerText = this.stats.maxCombo + 'x';
        document.getElementById('stat-time').innerText = Math.floor(this.stats.totalTime) + 's';
    }

    renderAchievements() {
        const container = document.getElementById('achievements-list');
        container.innerHTML = '';
        this.achievements.forEach(a => {
            const div = document.createElement('div');
            div.className = `achieve-item ${a.unlocked ? 'unlocked' : ''}`;
            div.innerHTML = `
                <div class="achieve-icon">${a.unlocked ? a.icon : '🔒'}</div>
                <div class="achieve-info">
                    <div class="achieve-title">${a.title}</div>
                    <div class="achieve-desc">${a.desc}</div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // --- GAME ENGINE PROCESS RUNTIME PIPELINES ---
    run(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Caps limits on massive physics delta-step drops to stabilize engine logic
        if (dt > 0.1) dt = 0.1;

        this.updateDiagnostics(dt);
        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.run(t));
    }

    updateDiagnostics(dt) {
        this.fpsTimeAccumulator += dt;
        this.fpsFrameCount++;
        if (this.fpsTimeAccumulator >= 1.0) {
            this.fps = this.fpsFrameCount;
            document.getElementById('fps-display').innerText = `FPS: ${this.fps}`;
            this.fpsFrameCount = 0;
            this.fpsTimeAccumulator = 0;
        }
    }

    update(dt) {
        // Universal background updating across modes
        const scrollSpeed = (this.state === 'PLAYING') ? this.currentSpeed : 40;
        this.bg.update(dt, scrollSpeed, this.isDarkMode);

        if (this.state === 'PLAYING') {
            this.stats.totalTime += dt;
            
            // Handle active timer loops
            if (this.comboWindowTimer > 0) {
                this.comboWindowTimer -= dt;
                if (this.comboWindowTimer <= 0) {
                    this.combo = 1;
                    this.updateComboHUD();
                }
            }

            this.bird.update(dt, this.activeConfig, this.baseHeight, this.bg.groundHeight);

            // Verify if bird crashes out of floor space boundary metrics
            if (this.bird.y + this.bird.radius >= this.baseHeight - this.bg.groundHeight) {
                this.handleCollisionCrash();
            }

            // Move and manage procedural stream of obstacles
            for (let i = this.pipes.length - 1; i >= 0; i--) {
                const pipe = this.pipes[i];
                pipe.update(dt, this.currentSpeed);

                // Collision Detection evaluation matrix
                if (pipe.checkCollision(this.bird)) {
                    this.handleCollisionCrash();
                    break;
                }

                // Incremental execution tracking logic
                if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                    this.incrementScore(pipe);
                }

                // Drop spent entities clear off stage array list limits safely
                if (pipe.x + pipe.width < 0) {
                    this.pipes.splice(i, 1);
                }
            }

            // Procedural generation engine loops checks
            if (this.pipes.length > 0) {
                const lastPipe = this.pipes[this.pipes.length - 1];
                if (lastPipe.x < this.baseWidth - 240) {
                    this.spawnPipe(this.baseWidth);
                }
            }
        }

        // Particle simulation engine loop routines independent of active run matrices
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Handle structural juice shakes metrics
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }
    }

    render() {
        this.ctx.save();
        
        // Execute operational screenshake matrices transforms if timing is valid
        if (this.shakeTimer > 0) {
            const dx = (Math.random() * 2 - 1) * this.shakeIntensity;
            const dy = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        // Enforce scaling matrix conversion mappings cleanly over dynamic viewports
        const scaleX = this.canvas.width / this.baseWidth;
        const scaleY = this.canvas.height / this.baseHeight;
        this.ctx.scale(scaleX, scaleY);

        // Core visual rendering pass sequence
        this.bg.draw(this.ctx, this.isDarkMode);

        // Render Pipes
        this.pipes.forEach(pipe => pipe.draw(this.ctx, this.isDarkMode));

        // Render Particles
        this.particles.forEach(p => p.draw(this.ctx));

        // Render Bird (only draw if alive or if it's menu mode)
        if (this.state !== 'GAMEOVER') {
            this.bird.draw(this.ctx, this.isDarkMode);
        }

        this.ctx.restore();
    }
}

// --- INITIALIZATION DEPLOYMENT ENTRYPOINT ---
window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.run(0);
});