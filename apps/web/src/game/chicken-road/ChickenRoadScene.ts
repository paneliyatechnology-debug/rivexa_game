import Phaser from 'phaser';
import { useChickenRoadStore } from '../../store/chickenRoadStore';

export class ChickenRoadScene extends Phaser.Scene {
  private chicken!: Phaser.GameObjects.Container;
  private chickenBody!: Phaser.GameObjects.Graphics;
  private chickenShadow!: Phaser.GameObjects.Graphics;
  private chickenFeet!: Phaser.GameObjects.Graphics;
  private roadContainer!: Phaser.GameObjects.Container;
  private barricadeContainers: Phaser.GameObjects.Container[] = [];
  private checkpointMarkers: Phaser.GameObjects.Container[] = [];
  private activeTooltipBadge?: Phaser.GameObjects.Container;
  private vehicles: Phaser.GameObjects.Container[] = [];
  private currentCheckpoint = 0;
  private difficulty = 'easy';
  private isMoving = false;
  private isCrashed = false;
  private totalCheckpoints = 25;
  private stepDistance = 190;
  private startX = 90;
  private firstCheckpointX = 280;
  private chickenY = 270;
  private manholeY = 340;
  private barricadeY = 120;
  private highestCompletedCheckpoint = 0;
  private unsubscribeStore?: () => void;

  private targetScrollX = 0;
  private isUserDragging = false;
  private lastDragX = 0;
  private dragVelocity = 0;
  private lastIsMobile: boolean | null = null;

  constructor() {
    super({ key: 'ChickenRoadScene' });
  }

  preload() {
    this.load.image('bg_chicken_road', '/assets/chicken-road/Background/BG Chicken Road 2.png');
    this.load.image('chicken', '/assets/chicken-road/Assets/chicken.png');
    this.load.image('chiken', '/assets/chicken-road/Assets/chiken.png');
    this.load.image('chicken_rip', '/assets/chicken-road/Assets/cheken_rip.png');
    this.load.image('car', '/assets/chicken-road/Assets/car.png');
    this.load.image('car_1', '/assets/chicken-road/Assets/car-1.png');
    this.load.image('car_single_1', '/assets/chicken-road/Assets/car_single_1.png');
    this.load.image('car_single_2', '/assets/chicken-road/Assets/car_single_2.png');
    this.load.image('car_single_3', '/assets/chicken-road/Assets/car_single_3.png');
    this.load.image('car_single_4', '/assets/chicken-road/Assets/car_single_4.png');
    this.load.image('car_single_5', '/assets/chicken-road/Assets/car_single_5.png');
    this.load.image('car_logo', '/assets/chicken-road/Assets/car_logo.png');
    this.load.image('barrier', '/assets/chicken-road/Assets/barrier.png');
    this.load.image('tape', '/assets/chicken-road/Assets/tape.png');
    this.load.image('tape_horizontal', '/assets/chicken-road/Assets/tape_horizontal.png');
    this.load.image('hatch', '/assets/chicken-road/Assets/hatch.png');
    this.load.image('hatch_2', '/assets/chicken-road/Assets/hatch_2.png');
    this.load.image('fanar', '/assets/chicken-road/Assets/fanar.png');
    this.load.image('statue', '/assets/chicken-road/Assets/statue.png');
    this.load.image('statue_single', '/assets/chicken-road/Assets/statue_single.png');
    this.load.image('bush1', '/assets/chicken-road/Assets/bush1.png');
    this.load.image('bush2', '/assets/chicken-road/Assets/bush2.png');
    this.load.image('tree', '/assets/chicken-road/Assets/tree.png');
    this.load.image('hydrant', '/assets/chicken-road/Assets/hydrant.png');
    this.load.image('red_carpet', '/assets/chicken-road/Assets/red_carpet.png');
    this.load.image('feathers', '/assets/chicken-road/Assets/feathers.png');
    this.load.image('logo', '/assets/chicken-road/Assets/logo.png');
    this.load.image('flat_logo', '/assets/chicken-road/Assets/flat logo.png');
    this.load.image('long_range_plan', '/assets/chicken-road/Assets/long-range plan.png');
  }

  create() {
    // Enable crisp linear texture filtering for high-resolution graphics on all displays
    this.textures.each((t: Phaser.Textures.Texture) => {
      t.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }, this);

    const { width, height } = this.scale;
    const isMobile = width < 600;

    this.stepDistance = isMobile ? 130 : 180;
    this.startX = isMobile ? 75 : 90;
    this.firstCheckpointX = isMobile ? 195 : 270;

    const centerY = Math.round(height * 0.52);
    this.chickenY = centerY;
    this.manholeY = centerY;
    this.barricadeY = Math.max(30, Math.round(height * 0.18));

    // Root Container for horizontal camera movement
    this.roadContainer = this.add.container(0, 0);

    // 1. Render Environment
    this.drawEnvironment();

    // 2. Spawn Checkpoint Sewer Covers at lower road
    this.spawnCheckpointMarkers();

    // 3. Create Cartoon Chicken Entity at Safe Zone Sidewalk
    this.createChicken();

    // 4. Create Active Multiplier Tooltip Bubble Badge
    this.createActiveTooltipBadge();

    // 5. Spawn Bounded Traffic Vehicles
    this.startTrafficSystem();

    // 6. Setup Camera Bounds & Interactive Horizontal Swipe/Drag Controls
    const totalMapWidth = this.firstCheckpointX + (this.totalCheckpoints - 1) * this.stepDistance + 600;
    this.cameras.main.setBounds(0, 0, totalMapWidth, height);
    this.cameras.main.scrollX = 0;
    this.setupDragControls();

    // 7. Setup Store / Event Subscriptions & Scale Resize Handler
    this.setupEventListeners();
    this.scale.on('resize', this.handleScaleResize, this);
  }

  private handleScaleResize(gameSize: Phaser.Structs.Size) {
    const isMobile = gameSize.width < 600;

    // Guard: Only re-build world if mobile breakpoint actually toggles (e.g. orientation flip).
    // Prevents scene teardown & lag spikes when mobile browser address bar collapses/expands!
    if (this.lastIsMobile === isMobile && this.checkpointMarkers.length > 0) {
      const totalMapWidth = this.firstCheckpointX + (this.totalCheckpoints - 1) * this.stepDistance + 600;
      this.cameras.main.setBounds(0, 0, totalMapWidth, gameSize.height);
      return;
    }
    this.lastIsMobile = isMobile;

    this.stepDistance = isMobile ? 130 : 180;
    this.startX = isMobile ? 75 : 90;
    this.firstCheckpointX = isMobile ? 195 : 270;

    const H = gameSize.height;
    const centerY = Math.round(H * 0.52);
    this.chickenY = centerY;
    this.manholeY = centerY;
    this.barricadeY = Math.max(30, Math.round(H * 0.18));

    if (this.roadContainer) {
      this.roadContainer.removeAll(true);
    }
    this.barricadeContainers = [];
    this.checkpointMarkers = [];
    this.vehicles = [];
    this.activeTooltipBadge = undefined;

    this.drawEnvironment();
    this.spawnCheckpointMarkers();
    this.createChicken();
    this.createActiveTooltipBadge();
    this.startTrafficSystem();

    const totalMapWidth = this.firstCheckpointX + (this.totalCheckpoints - 1) * this.stepDistance + 600;
    this.cameras.main.setBounds(0, 0, totalMapWidth, gameSize.height);

    if (this.currentCheckpoint > 0) {
      this.syncExistingState(this.currentCheckpoint);
    }
  }

  /**
   * Interactive Mouse Drag / Touch Swipe Navigation with Smooth Momentum Inertia:
   * Allows player to freely swipe left and right across the entire road map anytime
   */
  private setupDragControls() {
    let startX = 0;
    let startScrollX = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isUserDragging = true;
      startX = pointer.x;
      this.lastDragX = pointer.x;
      startScrollX = this.cameras.main.scrollX;
      this.targetScrollX = startScrollX;
      this.dragVelocity = 0;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isUserDragging && pointer.isDown) {
        const deltaX = pointer.x - startX;
        const totalMapWidth = this.firstCheckpointX + (this.totalCheckpoints - 1) * this.stepDistance + 600;
        const maxScroll = Math.max(0, totalMapWidth - this.scale.width);
        this.dragVelocity = (this.lastDragX - pointer.x) * 0.5;
        this.lastDragX = pointer.x;
        this.targetScrollX = Phaser.Math.Clamp(startScrollX - deltaX, 0, maxScroll);
      }
    });

    const stopDrag = () => {
      this.isUserDragging = false;
    };

    this.input.on('pointerup', stopDrag);
    this.input.on('pointerupoutside', stopDrag);
  }

  private setupEventListeners() {
    // Direct Store Subscription for instant state reaction
    this.unsubscribeStore = useChickenRoadStore.subscribe((state, prevState) => {
      // Difficulty Sync
      if (state.difficulty !== prevState.difficulty) {
        this.handleSetDifficulty({ difficulty: state.difficulty });
      }

      // Checkpoint Move Step — only if not already crashed
      if (state.checkpoint !== prevState.checkpoint && state.checkpoint > 0 && !this.isCrashed) {
        this.handleMoveChicken({ checkpoint: state.checkpoint });
      }

      // Status Lifecycle Sync
      if (state.status !== prevState.status) {
        if (state.status === 'CRASHED') {
          // Guard: only trigger crash animation if NOT already crashed (prevents double call from real-time collision)
          if (!this.isCrashed) {
            this.isCrashed = true;
            this.handleCrashChicken({ checkpoint: state.checkpoint || Math.max(1, this.currentCheckpoint + 1) });
          }
        } else if (state.status === 'CASHED_OUT') {
          this.handleCashoutChicken();
        } else if (state.status === 'IDLE' || state.status === 'READY') {
          this.handleResetChicken();
        } else if (state.status === 'RUNNING' && state.checkpoint === 0) {
          this.handleStartRound();
        }
      }
    });

    // Sync current store state immediately on scene create
    const initialState = useChickenRoadStore.getState();
    this.difficulty = initialState.difficulty;
    if (initialState.checkpoint > 0) {
      this.syncExistingState(initialState.checkpoint);
    } else {
      this.updateCheckpointMarkers();
    }

    // Game Event Emitter Listeners
    this.game.events.off('MOVE_CHICKEN');
    this.game.events.off('CRASH_CHICKEN');
    this.game.events.off('CASHOUT_CHICKEN');
    this.game.events.off('RESET_CHICKEN');
    this.game.events.off('START_ROUND');
    this.game.events.off('SET_DIFFICULTY');

    this.game.events.on('MOVE_CHICKEN', this.handleMoveChicken, this);
    this.game.events.on('CRASH_CHICKEN', this.handleCrashChicken, this);
    this.game.events.on('CASHOUT_CHICKEN', this.handleCashoutChicken, this);
    this.game.events.on('RESET_CHICKEN', this.handleResetChicken, this);
    this.game.events.on('START_ROUND', this.handleStartRound, this);
    this.game.events.on('SET_DIFFICULTY', this.handleSetDifficulty, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubscribeStore) this.unsubscribeStore();
      this.game.events.off('MOVE_CHICKEN', this.handleMoveChicken, this);
      this.game.events.off('CRASH_CHICKEN', this.handleCrashChicken, this);
      this.game.events.off('CASHOUT_CHICKEN', this.handleCashoutChicken, this);
      this.game.events.off('RESET_CHICKEN', this.handleResetChicken, this);
      this.game.events.off('START_ROUND', this.handleStartRound, this);
      this.game.events.off('SET_DIFFICULTY', this.handleSetDifficulty, this);
    });
  }

  private syncExistingState(cp: number) {
    this.currentCheckpoint = cp;
    const targetX = this.firstCheckpointX + (cp - 1) * this.stepDistance;
    if (this.chicken) {
      this.chicken.setPosition(targetX, this.chickenY);
    }

    // Clear existing barricades & rebuild instantly for completed segments 1..cp
    this.barricadeContainers.forEach((b) => b.destroy());
    this.barricadeContainers = [];

    for (let i = 1; i <= cp; i++) {
      this.createBarricadeInstant(i);
    }

    this.updateCheckpointMarkers();
    this.updateCameraPosition(targetX);
  }

  /**
   * Smooth Camera Follow: Keeps camera scrolled so chicken is placed near left side (~250px from left edge),
   * showing ~5 to 6 upcoming lanes to the right (Matching reference game layout).
   */
  private updateCameraPosition(chickenWorldX: number) {
    if (!this.cameras.main) return;
    const offset = this.scale.width < 600 ? 100 : 220;
    const targetScrollX = Math.max(0, chickenWorldX - offset);
    this.targetScrollX = targetScrollX;

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: targetScrollX,
      duration: 380,
      ease: 'Cubic.easeOut',
    });
  }

  update(time: number, delta: number) {
    // Smooth camera scroll interpolation for buttery-smooth touch drag / swipe momentum
    if (this.cameras.main && !this.tweens.isTweening(this.cameras.main)) {
      const totalMapWidth = this.firstCheckpointX + (this.totalCheckpoints - 1) * this.stepDistance + 600;
      const maxScroll = Math.max(0, totalMapWidth - this.scale.width);

      if (!this.isUserDragging && Math.abs(this.dragVelocity) > 0.1) {
        this.targetScrollX = Phaser.Math.Clamp(this.targetScrollX + this.dragVelocity, 0, maxScroll);
        this.dragVelocity *= 0.92; // Friction decay
      }

      const currentScroll = this.cameras.main.scrollX;
      if (Math.abs(this.targetScrollX - currentScroll) > 0.2) {
        this.cameras.main.scrollX += (this.targetScrollX - currentScroll) * 0.22;
      }
    }

    // Barricade stop Y limit (just above the barricade at y = 120)
    const stopY = this.barricadeY - 26; // ~94px

    this.vehicles.forEach((v) => {
      const speed = (v.getData('speed') as number) || 220;
      const baseX = (v.getData('baseX') as number) || v.x;
      const laneIndex = (v.getData('laneIndex') as number) || 0;
      const direction = (v.getData('direction') as number) || 1;

      // Traffic PERMANENTLY stops on completed safe lanes (laneIndex <= highestCompletedCheckpoint OR safe current lane)
      const isLaneCompleted = laneIndex > 0 && (laneIndex <= this.highestCompletedCheckpoint || (laneIndex === this.currentCheckpoint && !this.isCrashed));

      if (isLaneCompleted) {
        if (v.y > stopY) {
          // Reset above screen so it stops cleanly behind barricade
          v.y = -100 - Math.random() * 250;
        } else if (v.y < stopY) {
          v.y += (speed * delta) / 1000;
          if (v.y >= stopY) {
            v.y = stopY;
          }
        } else {
          v.y = stopY;
        }

        // Engine idle rumble while waiting parked behind barricade
        v.x = baseX + Math.sin(time / 60 + baseX) * 0.3;
      } else {
        // Continuous traffic moving in assigned direction across full road height every tick
        v.y += (direction * speed * delta) / 1000;
        v.x = baseX + Math.sin(time / 45 + baseX) * 0.4;

        const envH = Math.max(800, this.scale.height + 250);
        if (direction === 1 && v.y > envH) {
          v.y = -140 - Math.random() * 450;
          v.setData('speed', 210 + Math.random() * 110);
        } else if (direction === -1 && v.y < -140) {
          v.y = envH + Math.random() * 400;
          v.setData('speed', 210 + Math.random() * 110);
        }
      }
    });



    // Idle chicken breathing bobbing & eye direction look around animation matching reference game
    if (!this.isMoving && !this.isCrashed && this.chicken) {
      const bob = Math.sin(time / 180) * 1.8;
      const eyeLook = Math.sin(time / 750); // Eye/head direction look cycle
      this.chicken.y = this.chickenY + bob;
      this.chicken.setAngle(eyeLook * 4.5); // Wiggles/looks left & right towards traffic!
      this.chicken.setScale(1 + eyeLook * 0.03, 1 - eyeLook * 0.03); // Squish/stretch head look
    }
  }

  /**
   * Helper to calculate multiplier ladder values per checkpoint & difficulty
   */
  private getMultiplierValue(cp: number): string {
    const easyPresets: Record<number, number> = {
      1: 1.02, 2: 1.08, 3: 1.14, 4: 1.21, 5: 1.29, 6: 1.37, 7: 1.46, 8: 1.56,
      9: 1.67, 10: 1.79, 11: 1.92, 12: 2.06, 13: 2.21, 14: 2.37, 15: 2.54,
      16: 2.72, 17: 2.92, 18: 3.13, 19: 3.36, 20: 3.60, 21: 3.86, 22: 4.14,
      23: 4.44, 24: 4.76, 25: 5.10
    };

    if (this.difficulty === 'easy' && easyPresets[cp]) {
      return `${easyPresets[cp].toFixed(2)}x`;
    }

    const probMap: Record<string, number> = {
      easy: 0.95,
      medium: 0.85,
      hard: 0.70,
      hardcore: 0.50,
    };
    const safeProb = probMap[this.difficulty] || 0.95;
    const raw = Math.pow(1 / safeProb, cp) * 0.97;
    const mult = Math.floor(raw * 100) / 100;
    return `${mult.toFixed(2)}x`;
  }

  /**
   * Draws Environment matching Reference Screenshots:
   * 1. Left Sidewalk (Tiles, Trees, Street Lamp Post)
   * 2. Dark Gray Asphalt Road with Dashed Lane Lines for 25 lanes
   * 3. Right Sidewalk (Concrete Tiles, Lamp Post, Golden VIP Stanchions with Red Velvet Rope)
   * 4. Right Finish Park (Green Grass, Bushes, Trees, Cool Chicken Statues wearing Sunglasses!)
   */
  private drawEnvironment() {
    const totalWidth = 280 + 25 * 190 + 600;
    const roadEndX = this.firstCheckpointX + (this.totalCheckpoints - 1) * this.stepDistance + 110;
    const envH = Math.max(900, this.scale.height + 300);

    // 0. Long Range Plan Sky / City Skyline Background
    if (this.textures.exists('long_range_plan')) {
      const bgSky = this.add.image(totalWidth / 2, 50, 'long_range_plan').setDisplaySize(totalWidth, 130);
      bgSky.setAlpha(0.75);
      this.roadContainer.add(bgSky);
    }

    // 1. Dark Gray Asphalt Road Surface (x: 140 to roadEndX, y: 0 to envH)
    const isMobile = this.scale.width < 600;
    const asphalt = this.add.graphics();
    asphalt.fillStyle(0x4b4e54, 1);
    asphalt.fillRect(140, 0, roadEndX - 140, envH);

    // Vertical Dashed White Lane Divider Lines separating road lanes (Bold 8px line thickness matching official reference image)
    const lineThickness = isMobile ? 6 : 8;
    asphalt.lineStyle(lineThickness, 0xffffff, 0.92);
    for (let cp = 1; cp <= this.totalCheckpoints + 1; cp++) {
      const lineX = this.firstCheckpointX - (this.stepDistance / 2) + (cp - 1) * this.stepDistance;
      for (let y = 10; y < envH; y += 42) {
        asphalt.beginPath();
        asphalt.moveTo(lineX, y);
        asphalt.lineTo(lineX, y + 26);
        asphalt.strokePath();
      }
    }
    this.roadContainer.add(asphalt);

    // Caution Traffic Sign at Road Start
    if (this.textures.exists('car_logo')) {
      const carLogoSign = this.add.image(126, 50, 'car_logo').setDisplaySize(38, 38);
      this.roadContainer.add(carLogoSign);
    }

    // 2. Left Sidewalk / Safe Zone (x: 0 to 140)
    const leftSidewalk = this.add.graphics();
    // Green Turf Lawn on left edge
    leftSidewalk.fillStyle(0x5cb85c, 1);
    leftSidewalk.fillRect(0, 0, 60, envH);

    // Sidewalk Pavement Concrete Tiles (x: 60 to 140)
    leftSidewalk.fillStyle(0xa0a5ab, 1);
    leftSidewalk.fillRect(60, 0, 80, envH);
    leftSidewalk.lineStyle(2, 0x6c727a, 1);
    for (let tileY = 0; tileY < envH; tileY += 40) {
      leftSidewalk.strokeRect(60, tileY, 80, 40);
    }
    // Curb border line
    leftSidewalk.fillStyle(0x4b4e54, 1);
    leftSidewalk.fillRect(136, 0, 4, envH);
    this.roadContainer.add(leftSidewalk);

    // Start Zone Game Banner / Arch
    const bannerY = Math.min(25, Math.round(this.barricadeY - 20));
    if (this.scale.width >= 600) {
      if (this.textures.exists('flat_logo')) {
        const banner = this.add.image(90, bannerY, 'flat_logo').setDisplaySize(90, 36);
        this.roadContainer.add(banner);
      } else if (this.textures.exists('logo')) {
        const banner = this.add.image(90, bannerY, 'logo').setDisplaySize(90, 36);
        this.roadContainer.add(banner);
      }
    }

    // Decorative Round Green Trees on left lawn
    const tree1 = this.createTree(30, Math.round(envH * 0.15));
    const tree2 = this.createTree(30, Math.round(envH * 0.45));
    const tree3 = this.createTree(30, Math.round(envH * 0.75));
    this.roadContainer.add([tree1, tree2, tree3]);

    // Decorative Fire Hydrant on left sidewalk
    const hydrantLeft = this.createHydrant(105, Math.round(this.manholeY + 100));
    this.roadContainer.add(hydrantLeft);

    // Decorative Street Lamp Post on left sidewalk
    const lampLeft = this.createStreetLamp(100, Math.round(this.barricadeY));
    this.roadContainer.add(lampLeft);

    // 3. Right Sidewalk Pavement (x: roadEndX to roadEndX + 90)
    const rightSidewalk = this.add.graphics();
    const rightPavementX = roadEndX;
    const rightTileWidth = 90;

    rightSidewalk.fillStyle(0xa0a5ab, 1);
    rightSidewalk.fillRect(rightPavementX, 0, rightTileWidth, envH);
    rightSidewalk.lineStyle(2, 0x6c727a, 1);
    for (let tileY = 0; tileY < envH; tileY += 40) {
      rightSidewalk.strokeRect(rightPavementX, tileY, rightTileWidth, 40);
    }
    // Right Curb line
    rightSidewalk.fillStyle(0x4b4e54, 1);
    rightSidewalk.fillRect(rightPavementX, 0, 4, envH);

    // 4. Right Finish Park Lawn (x: rightPavementX + rightTileWidth to totalWidth)
    const parkX = rightPavementX + rightTileWidth;
    rightSidewalk.fillStyle(0x5cb85c, 1);
    rightSidewalk.fillRect(parkX, 0, totalWidth - parkX, envH);
    this.roadContainer.add(rightSidewalk);

    // Red Carpet VIP Runner Leading to Finish Line
    if (this.textures.exists('red_carpet')) {
      const redCarpet = this.add.image(rightPavementX + 45, Math.round(this.chickenY), 'red_carpet').setDisplaySize(80, 180);
      this.roadContainer.add(redCarpet);
    }

    // Right Street Lamp Post & Hydrant
    const lampRight = this.createStreetLamp(rightPavementX + 45, Math.round(this.barricadeY));
    const hydrantRight = this.createHydrant(rightPavementX + 45, Math.round(this.manholeY + 40));
    this.roadContainer.add([lampRight, hydrantRight]);

    // Golden VIP Stanchions with Red Velvet Rope at Right Sidewalk
    const stanchions = this.createGoldenStanchions(rightPavementX + 15, Math.round(this.barricadeY), Math.round(this.manholeY));
    this.roadContainer.add(stanchions);

    // Decorative Park Trees in Right Park
    const treeR1 = this.createTree(parkX + 60, 60);
    const treeR2 = this.createTree(parkX + 150, 100);
    const treeR3 = this.createTree(parkX + 220, 50);
    const treeR4 = this.createTree(parkX + 80, Math.round(envH * 0.65));
    const treeR5 = this.createTree(parkX + 190, Math.round(envH * 0.60));

    // Decorative Green Bushes (alternating bush1 and bush2)
    const bush1 = this.createBush(parkX + 30, 140, 1);
    const bush2 = this.createBush(parkX + 30, Math.round(this.chickenY + 30), 2);
    const bush3 = this.createBush(parkX + 130, 200, 1);

    // Cool Chicken Statues wearing Sunglasses in Right Park
    const chickenStatue1 = this.createChickenStatue(parkX + 90, 150);
    const chickenStatue2 = this.createChickenStatue(parkX + 90, Math.round(this.manholeY));

    this.roadContainer.add([
      treeR1, treeR2, treeR3, treeR4, treeR5,
      bush1, bush2, bush3,
      chickenStatue1, chickenStatue2
    ]);
  }

  /**
   * Spawns 25 Sewer Manhole Checkpoint Covers along lower road (y = 295) matching reference image
   */
  private spawnCheckpointMarkers() {
    const isMobile = this.scale.width < 600;
    const coinSize = isMobile ? 80 : 100;

    for (let i = 1; i <= this.totalCheckpoints; i++) {
      const x = this.firstCheckpointX + (i - 1) * this.stepDistance;
      const markerContainer = this.add.container(x, this.manholeY);

      const hatchImg = this.textures.exists('hatch')
        ? this.add.image(0, 0, 'hatch').setDisplaySize(coinSize, coinSize)
        : null;

      const manholeG = this.add.graphics();
      const multVal = this.getMultiplierValue(i);

      const multText = this.add.text(0, 0, multVal, {
        fontSize: isMobile ? '15px' : '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);

      if (hatchImg) {
        markerContainer.add([manholeG, hatchImg, multText]);
      } else {
        markerContainer.add([manholeG, multText]);
      }

      markerContainer.setData('cpIndex', i);
      markerContainer.setData('manholeG', manholeG);
      markerContainer.setData('hatchImg', hatchImg);
      markerContainer.setData('multText', multText);

      this.roadContainer.add(markerContainer);
      this.checkpointMarkers.push(markerContainer);
    }
  }

  /**
   * Updates visual state of Manhole Checkpoints:
   * - Uncompleted: hatch.png cover with multiplier text
   * - Completed: hatch_2.png golden cover matching official assets!
   */
  private updateCheckpointMarkers() {
    const isMobile = this.scale.width < 600;
    const coinSize = isMobile ? 80 : 100;

    this.checkpointMarkers.forEach((marker) => {
      const cpIndex = marker.getData('cpIndex') as number;
      const manholeG = marker.getData('manholeG') as Phaser.GameObjects.Graphics;
      const hatchImg = marker.getData('hatchImg') as Phaser.GameObjects.Image;
      const multText = marker.getData('multText') as Phaser.GameObjects.Text;

      if (multText) {
        multText.setText(this.getMultiplierValue(cpIndex));
        multText.setFontSize(isMobile ? 15 : 20);
      }
      if (manholeG) manholeG.clear();

      if (cpIndex <= this.currentCheckpoint) {
        if (hatchImg) {
          if (this.textures.exists('hatch_2')) {
            hatchImg.setTexture('hatch_2');
          }
          hatchImg.setDisplaySize(coinSize, coinSize);
          hatchImg.setVisible(true);
        }
        if (multText) multText.setVisible(false);
      } else {
        if (hatchImg) {
          if (this.textures.exists('hatch')) {
            hatchImg.setTexture('hatch');
          }
          hatchImg.setDisplaySize(coinSize, coinSize);
          hatchImg.setVisible(true);
        }
        if (multText) {
          multText.setVisible(true);
          multText.setColor('#ffffff');
        }
      }
    });

    // Update active blue tooltip bubble position below chicken feet
    if (this.activeTooltipBadge) {
      if (this.currentCheckpoint > 0) {
        const activeX = this.firstCheckpointX + (this.currentCheckpoint - 1) * this.stepDistance;
        const offsetY = isMobile ? 38 : 45;
        this.activeTooltipBadge.setPosition(activeX, this.chickenY + offsetY);
        const badgeText = this.activeTooltipBadge.getData('text') as Phaser.GameObjects.Text;
        if (badgeText) {
          badgeText.setText(this.getMultiplierValue(this.currentCheckpoint));
        }
        this.activeTooltipBadge.setVisible(true);
      } else {
        this.activeTooltipBadge.setVisible(false);
      }
    }
  }

  /**
   * Active Multiplier Blue Tooltip Bubble Badge (Positioned below chicken feet matching Reference Image 2)
   */
  private createActiveTooltipBadge() {
    this.activeTooltipBadge = this.add.container(0, 0);

    // Bubble pointer triangle pointing UP towards chicken feet
    const pointer = this.add.graphics();
    pointer.fillStyle(0x2563eb, 1);
    pointer.fillTriangle(-7, -8, 7, -8, 0, -16);

    // Rounded Rectangle Pill Body
    const body = this.add.graphics();
    body.fillStyle(0x2563eb, 1);
    body.fillRoundedRect(-36, -8, 72, 28, 6);
    body.lineStyle(2, 0x3b82f6, 1);
    body.strokeRoundedRect(-36, -8, 72, 28, 6);

    // Multiplier Text inside Tooltip Badge
    const badgeText = this.add.text(0, 6, '1.00x', {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.activeTooltipBadge.add([pointer, body, badgeText]);
    this.activeTooltipBadge.setData('text', badgeText);
    this.activeTooltipBadge.setDepth(350);
    this.activeTooltipBadge.setVisible(false);

    this.roadContainer.add(this.activeTooltipBadge);
  }

  /**
   * Spawns HORIZONTAL Construction Barricades across the upper portion of completed road lanes (y = 135)
   * Positioned EXACTLY IN THE CENTER BETWEEN THE TWO WHITE ROAD/LANE LINES!
   */
  private createBarricade(segmentIndex: number) {
    const segmentX = this.firstCheckpointX + (segmentIndex - 1) * this.stepDistance;
    const barricadeContainer = this.add.container(segmentX, this.barricadeY);

    if (this.textures.exists('barrier')) {
      const barrierImg = this.add.image(0, 0, 'barrier').setDisplaySize(98, 34);
      barricadeContainer.add(barrierImg);

      if (this.textures.exists('tape_horizontal')) {
        const tapeImg = this.add.image(0, -6, 'tape_horizontal').setDisplaySize(102, 16);
        barricadeContainer.add(tapeImg);
      }
    } else {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.4);
      shadow.fillEllipse(0, 24, 88, 10);
      const board = this.add.graphics();
      board.fillStyle(0xfacc15, 1);
      board.fillRoundedRect(-52, -12, 104, 24, 5);
      barricadeContainer.add([shadow, board]);
    }

    barricadeContainer.setData('laneIndex', segmentIndex);
    barricadeContainer.setDepth(150);
    barricadeContainer.setAlpha(0);
    barricadeContainer.setScale(0.85);

    this.tweens.add({
      targets: barricadeContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 350,
      ease: 'Back.easeOut',
    });

    this.roadContainer.add(barricadeContainer);
    this.barricadeContainers.push(barricadeContainer);
  }

  private createBarricadeInstant(segmentIndex: number) {
    const segmentX = this.firstCheckpointX + (segmentIndex - 1) * this.stepDistance;
    const barricadeContainer = this.add.container(segmentX, this.barricadeY);

    if (this.textures.exists('barrier')) {
      const barrierImg = this.add.image(0, 0, 'barrier').setDisplaySize(98, 34);
      barricadeContainer.add(barrierImg);

      if (this.textures.exists('tape_horizontal')) {
        const tapeImg = this.add.image(0, -6, 'tape_horizontal').setDisplaySize(102, 16);
        barricadeContainer.add(tapeImg);
      }
    } else {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.4);
      shadow.fillEllipse(0, 24, 88, 10);
      const board = this.add.graphics();
      board.fillStyle(0xfacc15, 1);
      board.fillRoundedRect(-52, -12, 104, 24, 5);
      barricadeContainer.add([shadow, board]);
    }

    barricadeContainer.setData('laneIndex', segmentIndex);
    barricadeContainer.setDepth(150);
    this.roadContainer.add(barricadeContainer);
    this.barricadeContainers.push(barricadeContainer);
  }

  /**
   * Chicken Character Sprite Entity using official assets
   */
  private createChicken() {
    this.chicken = this.add.container(this.startX, this.chickenY);

    const isMobile = this.scale.width < 600;
    const chickenSize = isMobile ? 82 : 104;

    // Soft Shadow
    this.chickenShadow = this.add.graphics();
    this.chickenShadow.fillStyle(0x000000, 0.35);
    this.chickenShadow.fillEllipse(0, isMobile ? 20 : 26, isMobile ? 34 : 42, isMobile ? 11 : 14);

    if (this.textures.exists('chicken')) {
      const chickenSprite = this.add.image(0, -6, 'chicken').setDisplaySize(chickenSize, chickenSize);
      chickenSprite.setName('chickenSprite');
      this.chicken.add([this.chickenShadow, chickenSprite]);
    } else {
      this.chickenBody = this.add.graphics();
      this.chickenBody.fillStyle(0xffffff, 1);
      this.chickenBody.fillCircle(0, 0, 26);

      const wing = this.add.graphics();
      wing.fillStyle(0xf1f5f9, 1);
      wing.fillEllipse(-9, 3, 16, 11);

      const comb = this.add.graphics();
      comb.fillStyle(0xef4444, 1);
      comb.fillCircle(-5, -26, 7);

      const beak = this.add.graphics();
      beak.fillStyle(0xf59e0b, 1);
      beak.fillTriangle(16, -4, 30, 4, 16, 12);

      const eye = this.add.graphics();
      eye.fillStyle(0x0f172a, 1);
      eye.fillCircle(10, -7, 4.5);

      this.chickenFeet = this.add.graphics();
      this.chickenFeet.fillStyle(0xf59e0b, 1);
      this.chickenFeet.fillRect(-10, 22, 6, 11);

      this.chicken.add([this.chickenShadow, this.chickenFeet, this.chickenBody, wing, comb, beak, eye]);
    }

    this.chicken.setDepth(300);
    this.roadContainer.add(this.chicken);
  }

  /**
   * Spawns dynamic, unpredictable high-speed traffic across ALL 25 road lanes
   */
  private startTrafficSystem() {
    const vehicleTypes = ['sports', 'taxi', 'police', 'truck'];

    for (let cp = 1; cp <= this.totalCheckpoints; cp++) {
      const laneX = this.firstCheckpointX + (cp - 1) * this.stepDistance; // Centered in lane between two white dashed lines
      const speed = 200 + Math.random() * 95; // High speed (200 - 295 px/s)
      const vType = vehicleTypes[cp % vehicleTypes.length];
      const direction = 1; // Uniform Traffic Flow: ALL vehicles travel from Top -> Bottom (one side only!)

      // Random Y spawn offset so traffic flow is unpredictable across lanes
      const initialY = -100 - Math.random() * 550;

      const vehicleContainer = this.add.container(laneX, initialY);
      const lights = this.add.graphics();
      const car = this.createVehicleGraphics(vType, cp, direction);

      // Headlight Cone Beams pointing downwards (Top -> Bottom direction)
      lights.fillStyle(0xfef08a, 0.35);
      lights.fillTriangle(-14, 28, 14, 28, 32, 90);
      lights.fillTriangle(-14, 28, 14, 28, -32, 90);

      vehicleContainer.add([lights, car]);
      vehicleContainer.setData('speed', speed);
      vehicleContainer.setData('direction', direction);
      vehicleContainer.setData('vType', vType);
      vehicleContainer.setData('baseX', laneX);
      vehicleContainer.setData('laneIndex', cp);

      this.roadContainer.add(vehicleContainer);
      this.vehicles.push(vehicleContainer);
    }
  }

  /**
   * Renders realistic top-down vehicle vector graphics
   */
  private createVehicleGraphics(vType: string, index: number, direction: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    const singleCarKeys = ['car_single_1', 'car_single_2', 'car_single_3', 'car_single_4', 'car_single_5'];
    const selectedKey = singleCarKeys[(index - 1) % singleCarKeys.length];

    const isMobile = this.scale.width < 600;

    if (this.textures.exists(selectedKey)) {
      const carImg = this.add.image(0, 0, selectedKey);
      if (selectedKey === 'car_single_4') {
        // Truck / bus vehicle
        carImg.setDisplaySize(isMobile ? 74 : 96, isMobile ? 124 : 160);
      } else {
        // Single sports car / sedan
        carImg.setDisplaySize(isMobile ? 66 : 84, isMobile ? 110 : 140);
      }
      if (direction === -1) carImg.setAngle(180);
      container.add(carImg);
    } else if (this.textures.exists('car')) {
      const carImg = this.add.image(0, 0, 'car').setDisplaySize(isMobile ? 66 : 84, isMobile ? 110 : 140);
      if (direction === -1) carImg.setAngle(180);
      container.add(carImg);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0xe11d48, 1);
      g.fillRoundedRect(-18, -28, 36, 56, 8);
      container.add(g);
    }

    return container;
  }

  private createTree(x: number, y: number): Phaser.GameObjects.Container {
    const tree = this.add.container(x, y);
    if (this.textures.exists('tree')) {
      const img = this.add.image(0, 0, 'tree').setDisplaySize(54, 54);
      tree.add(img);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x22c55e, 1);
      g.fillCircle(0, 0, 18);
      g.fillStyle(0x15803d, 1);
      g.fillCircle(-3, -3, 12);
      tree.add(g);
    }
    return tree;
  }

  private createBush(x: number, y: number, type = 1): Phaser.GameObjects.Container {
    const bush = this.add.container(x, y);
    const key = type === 1 ? 'bush1' : 'bush2';
    if (this.textures.exists(key)) {
      const img = this.add.image(0, 0, key).setDisplaySize(44, 44);
      bush.add(img);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x16a34a, 1);
      g.fillCircle(0, 0, 14);
      bush.add(g);
    }
    return bush;
  }

  private createHydrant(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    if (this.textures.exists('hydrant')) {
      const img = this.add.image(0, 0, 'hydrant').setDisplaySize(32, 44);
      container.add(img);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0xef4444, 1);
      g.fillRect(-8, -16, 16, 32);
      g.fillCircle(0, -16, 10);
      container.add(g);
    }
    return container;
  }

  private createChickenStatue(x: number, y: number): Phaser.GameObjects.Container {
    const statue = this.add.container(x, y);
    if (this.textures.exists('statue_single')) {
      const img = this.add.image(0, 0, 'statue_single').setDisplaySize(48, 96);
      statue.add(img);
    } else if (this.textures.exists('statue')) {
      const img = this.add.image(0, 0, 'statue').setDisplaySize(54, 72);
      statue.add(img);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0xeab308, 1);
      g.fillCircle(0, -10, 16);
      g.fillRect(-12, 6, 24, 20);
      statue.add(g);
    }
    return statue;
  }

  private createStreetLamp(x: number, y: number): Phaser.GameObjects.Container {
    const lamp = this.add.container(x, y);
    if (this.textures.exists('fanar')) {
      const img = this.add.image(0, 0, 'fanar').setDisplaySize(38, 76);
      lamp.add(img);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x64748b, 1);
      g.fillRect(-4, -40, 8, 80);
      g.fillRect(0, -40, 30, 8);
      g.fillStyle(0xe2e8f0, 1);
      g.fillCircle(30, -36, 10);
      lamp.add(g);
    }
    return lamp;
  }

  // =========================================================================
  // GAMEPLAY EVENT HANDLERS
  // =========================================================================

  private handleSetDifficulty(data: { difficulty: string }) {
    if (this.difficulty !== data.difficulty) {
      this.difficulty = data.difficulty;
      this.updateCheckpointMarkers();
    }
  }

  private handleStartRound() {
    this.updateCheckpointMarkers();
    this.handleResetChicken();
  }

  /**
   * Smooth Step-by-Step Chicken Crossing Animation to Target Checkpoint
   */
  private handleMoveChicken(data: { checkpoint: number }) {
    if (!this.chicken || this.isCrashed) return;
    const targetCp = data.checkpoint;
    this.currentCheckpoint = targetCp;

    // Kill any leftover tweens from previous steps to prevent animation stacking
    this.tweens.killTweensOf(this.chicken);
    this.chicken.setAngle(0);
    this.chicken.setScale(1);
    this.isMoving = true;

    // Immediately place vehicle on targetCp above barricade so it parks at stopY (94px) and NEVER enters chicken path (270px)!
    const targetVehicle = this.vehicles.find((v) => (v.getData('laneIndex') as number) === targetCp);
    if (targetVehicle) {
      if (targetVehicle.y > this.barricadeY - 26) {
        targetVehicle.y = -100 - Math.random() * 100;
      }
    }
    const targetX = this.firstCheckpointX + (targetCp - 1) * this.stepDistance;
    const targetY = this.chickenY;

    // 1. Horizontal Step Hop Tween (300ms)
    this.tweens.add({
      targets: this.chicken,
      x: targetX,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.isCrashed) return;
        this.isMoving = false;

        // Update Checkpoint Markers & Gold Coins visual state
        this.updateCheckpointMarkers();

        // Mark this checkpoint as permanently completed & safe
        this.highestCompletedCheckpoint = Math.max(this.highestCompletedCheckpoint, targetCp);

        // Spawn Horizontal Barricade on targetCp (safe lane)
        if (!this.isCrashed) {
          const exists = this.barricadeContainers.some((b) => (b.getData('laneIndex') as number) === targetCp);
          if (!exists) {
            this.createBarricade(targetCp);
          }
        }

        // Landing bounce
        this.tweens.add({
          targets: this.chicken,
          scaleY: 0.85,
          scaleX: 1.15,
          duration: 70,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (this.isCrashed) return;
            if (targetCp >= this.totalCheckpoints) {
              useChickenRoadStore.getState().resetGame();
              this.handleCashoutChicken();
            }
          },
        });

        // Smoothly advance camera position after step
        this.updateCameraPosition(targetX);
      },
    });

    // 2. Vertical Arc Hop height
    this.tweens.add({
      targets: this.chicken,
      y: targetY - 22,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut',
    });

    // 3. Wiggling foot/wing animation
    this.tweens.add({
      targets: this.chicken,
      angle: 12,
      duration: 130,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.chicken && !this.isCrashed) this.chicken.setAngle(0);
      },
    });
  }

  /**
   * Chicken Obstacle Collision Visual Handler
   */
  private handleCrashChicken(data: { checkpoint: number }) {
    if (!this.chicken) return;
    this.isCrashed = true;

    // Stop any in-progress movement tweens so chicken doesn't keep sliding after crash
    this.tweens.killTweensOf(this.chicken);
    this.isMoving = false;
    this.isCrashed = true;

    // Crash checkpoint MUST ALWAYS BE GREATER THAN highestCompletedCheckpoint!
    const rawCp = data.checkpoint || (this.currentCheckpoint + 1);
    const crashCp = Math.max(rawCp, this.highestCompletedCheckpoint + 1);
    this.currentCheckpoint = crashCp;

    // Crash position MUST be the NEW crash lane (crashCp), which has NO barricade!
    const crashX = this.firstCheckpointX + (crashCp - 1) * this.stepDistance;
    const crashY = this.chickenY;

    // IMMEDIATELY remove any barricade on crashCp before crash vehicle starts moving!
    this.barricadeContainers = this.barricadeContainers.filter((b) => {
      if ((b.getData('laneIndex') as number) === crashCp) {
        b.destroy();
        return false;
      }
      return true;
    });

    // Ensure barricades remain permanently closed on ALL completed safe lanes <= highestCompletedCheckpoint
    for (let cp = 1; cp <= this.highestCompletedCheckpoint; cp++) {
      const exists = this.barricadeContainers.some((b) => (b.getData('laneIndex') as number) === cp);
      if (!exists) {
        this.createBarricadeInstant(cp);
      }
    }

    // Find car in the crashed lane to animate impact
    const crashVehicle = this.vehicles.find((v) => (v.getData('laneIndex') as number) === crashCp);

    const triggerImpact = () => {
      // Camera Screen Shake
      this.cameras.main.shake(420, 0.045);

      // Swap to official chicken_rip sprite on crash
      if (this.chicken) {
        const chickenSprite = this.chicken.getByName('chickenSprite') as Phaser.GameObjects.Image;
        if (chickenSprite && this.textures.exists('chicken_rip')) {
          chickenSprite.setTexture('chicken_rip');
        }
      }

      // Explosive Spark & Smoke Accident Effect
      this.createAccidentImpactFX(crashX, crashY);

      // Chicken tumble fall upside down animation on crash lane
      this.tweens.add({
        targets: this.chicken,
        angle: 180,
        scaleX: 1.1,
        scaleY: -1.1,
        x: crashX,
        y: crashY + 14,
        duration: 450,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          // Render Roasted Chicken Icon on Crashed Manhole Cover (Matching Reference Image 2 & 3!)
          const targetMarker = this.checkpointMarkers[crashCp - 1];
          if (targetMarker) {
            const manholeG = targetMarker.getData('manholeG') as Phaser.GameObjects.Graphics;
            const multText = targetMarker.getData('multText') as Phaser.GameObjects.Text;
            const hatchImg = targetMarker.getData('hatchImg') as Phaser.GameObjects.Image;

            if (hatchImg) hatchImg.setVisible(false);

            if (manholeG) {
              manholeG.clear();
              // Golden Coin Base Circle
              manholeG.fillStyle(0xfacc15, 1);
              manholeG.fillCircle(0, 0, 50);
              manholeG.lineStyle(4, 0xca8a04, 1);
              manholeG.strokeCircle(0, 0, 50);

              // Inner Dark Plate
              manholeG.fillStyle(0x78350f, 1);
              manholeG.fillCircle(0, 0, 38);

              // Roasted Chicken Emblem Graphic
              manholeG.fillStyle(0xd97706, 1);
              manholeG.fillEllipse(-4, 0, 24, 16);
              manholeG.fillCircle(6, -6, 7);
              manholeG.fillCircle(6, 6, 7);
              manholeG.fillStyle(0xffffff, 1);
              manholeG.fillRect(12, -7, 9, 3.5);
              manholeG.fillRect(12, 5, 9, 3.5);
              manholeG.fillCircle(21, -5, 3);
              manholeG.fillCircle(21, 7, 3);
            }

            if (multText) {
              multText.setVisible(false);
            }
          }
          // Auto-reset chicken back to start position after 1.8s delay

          // Auto-reset chicken back to start position after 1.8s delay
          this.time.delayedCall(1800, () => {
            useChickenRoadStore.getState().resetGame();
          });
        },
      });
    };

    // 1. Hop chicken onto the NEW crash lane (crashX, NO BARRICADE)
    this.tweens.add({
      targets: this.chicken,
      x: crashX,
      y: crashY - 20,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (this.chicken) this.chicken.y = crashY;
      },
    });

    // 2. Drive crash vehicle down the NEW crash lane (crashX, NO BARRICADE) at FULL SPEED to hit chicken
    if (crashVehicle) {
      crashVehicle.x = crashX;
      crashVehicle.y = -80;
      this.tweens.add({
        targets: crashVehicle,
        y: crashY + 10,
        duration: 240,
        ease: 'Power1.easeIn',
        onComplete: triggerImpact,
      });
    } else {
      triggerImpact();
    }
  }

  /**
   * Explosive Accident Impact FX (Starburst, Flying Sparks & Smoke)
   */
  private createAccidentImpactFX(x: number, y: number) {
    // Explosive Starburst Flash
    const flash = this.add.graphics();
    flash.fillStyle(0xfef08a, 1);
    flash.fillCircle(x, y, 34);
    flash.fillStyle(0xf97316, 1);
    flash.fillCircle(x, y, 22);
    flash.fillStyle(0xef4444, 1);
    flash.fillCircle(x, y, 12);
    this.roadContainer.add(flash);

    this.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy(),
    });

    // Flying Sparks
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const spark = this.add.graphics();
      spark.fillStyle(i % 2 === 0 ? 0xfacc15 : 0xef4444, 1);
      spark.fillCircle(x, y, 4);
      this.roadContainer.add(spark);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 55,
        y: y + Math.sin(angle) * 55,
        alpha: 0,
        duration: 360,
        ease: 'Power2.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    // Engine Smoke Puffs
    for (let s = 0; s < 4; s++) {
      const smoke = this.add.graphics();
      smoke.fillStyle(0x475569, 0.65);
      smoke.fillCircle(x + (s - 2) * 10, y - 10, 12);
      this.roadContainer.add(smoke);

      this.tweens.add({
        targets: smoke,
        y: y - 45 - s * 12,
        alpha: 0,
        scale: 1.6,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }

    // Flying Feather Particles using official feathers image asset
    if (this.textures.exists('feathers')) {
      for (let f = 0; f < 10; f++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 60;
        const feather = this.add.image(x, y, 'feathers').setDisplaySize(24, 24);
        feather.setAngle(Math.random() * 360);
        this.roadContainer.add(feather);

        this.tweens.add({
          targets: feather,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist + 25,
          angle: feather.angle + 180 + Math.random() * 180,
          scale: 0.3,
          alpha: 0,
          duration: 650 + Math.random() * 250,
          ease: 'Quad.easeOut',
          onComplete: () => feather.destroy(),
        });
      }
    }
  }

  /**
   * Cashout Celebration Handler
   */
  private handleCashoutChicken() {
    if (!this.chicken) return;

    // Celebration jump sequence
    this.tweens.add({
      targets: this.chicken,
      y: this.chickenY - 32,
      duration: 220,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Round cashout animation complete
      },
    });
  }

  /**
   * Round Reset Handler
   */
  private handleResetChicken() {
    this.currentCheckpoint = 0;
    this.highestCompletedCheckpoint = 0;
    this.isMoving = false;
    this.isCrashed = false;
    this.targetScrollX = 0;
    this.dragVelocity = 0;
    this.isUserDragging = false;

    // Remove all active barricades
    this.barricadeContainers.forEach((b) => b.destroy());
    this.barricadeContainers = [];

    // Reset Chicken position to Sidewalk Safe Zone (x = 90, y = 240)
    if (this.chicken) {
      this.chicken.setPosition(this.startX, this.chickenY);
      this.chicken.setScale(1);
      this.chicken.setAngle(0);

      const chickenSprite = this.chicken.getByName('chickenSprite') as Phaser.GameObjects.Image;
      if (chickenSprite && this.textures.exists('chicken')) {
        chickenSprite.setTexture('chicken');
      }
    }

    // Hide blue active tooltip
    if (this.activeTooltipBadge) {
      this.activeTooltipBadge.setVisible(false);
    }

    // Reset Checkpoint Markers
    this.updateCheckpointMarkers();

    // Reset Camera scroll position cleanly to 0
    if (this.cameras.main) {
      this.tweens.killTweensOf(this.cameras.main);
      this.cameras.main.scrollX = 0;
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: 0,
        duration: 350,
        ease: 'Cubic.easeOut',
      });
    }

    this.isCrashed = false;
  }

  /**
   * Golden VIP Stanchions with Red Velvet Rope Barrier (matching reference screenshot!)
   */
  private createGoldenStanchions(x: number, topY: number, bottomY: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, 0);
    const g = this.add.graphics();

    // Red Velvet Rope with sag curve connecting top and bottom stanchions
    const midY = (topY + bottomY) / 2;

    g.lineStyle(6, 0xdc2626, 1);
    g.beginPath();
    g.moveTo(0, topY + 12);
    g.lineTo(16, topY + (midY - topY) * 0.5);
    g.lineTo(24, midY);
    g.lineTo(16, midY + (bottomY - midY) * 0.5);
    g.lineTo(0, bottomY - 12);
    g.strokePath();

    g.lineStyle(2, 0xf87171, 0.9);
    g.beginPath();
    g.moveTo(0, topY + 12);
    g.lineTo(16, topY + (midY - topY) * 0.5);
    g.lineTo(24, midY);
    g.lineTo(16, midY + (bottomY - midY) * 0.5);
    g.lineTo(0, bottomY - 12);
    g.strokePath();

    // Top Golden Stanchion Post
    g.fillStyle(0xb45309, 1);
    g.fillEllipse(0, topY + 45, 24, 10);
    g.fillStyle(0xeab308, 1);
    g.fillEllipse(0, topY + 44, 20, 8);

    g.fillStyle(0xfacc15, 1);
    g.fillRect(-4, topY + 10, 8, 34);
    g.fillStyle(0xfef08a, 1);
    g.fillRect(-2, topY + 10, 3, 34);

    g.fillStyle(0xca8a04, 1);
    g.fillCircle(0, topY + 8, 9);
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(-2, topY + 6, 4);

    // Bottom Golden Stanchion Post
    g.fillStyle(0xb45309, 1);
    g.fillEllipse(0, bottomY + 15, 24, 10);
    g.fillStyle(0xeab308, 1);
    g.fillEllipse(0, bottomY + 14, 20, 8);

    g.fillStyle(0xfacc15, 1);
    g.fillRect(-4, bottomY - 24, 8, 38);
    g.fillStyle(0xfef08a, 1);
    g.fillRect(-2, bottomY - 24, 3, 38);

    g.fillStyle(0xca8a04, 1);
    g.fillCircle(0, bottomY - 26, 9);
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(-2, bottomY - 28, 4);

    container.add(g);
    return container;
  }
}



