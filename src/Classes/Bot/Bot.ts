import {
  ColliderDesc,
  KinematicCharacterController,
  QueryFilterFlags,
  Ray,
  RigidBody,
  RigidBodyDesc,
  World,
} from "@dimforge/rapier2d-compat";
import { Character } from "../Player/Player";
import { ANGLE_BETWEEN } from "../Math/Math";

export class Bot {
  world: World;
  character_controller: KinematicCharacterController;
  VELOCITY: { x: number; y: number };
  z: number;
  JUMP_HEIGHT: number;
  JUMP_TIME: number;
  GRAVITY: number;
  JUMP_FORCE: number;

  SPEED: number;
  rigidbody: RigidBody;
  collider: any;
  DIVE: boolean;
  z_speed: number;
  z_floor: number;
  z_velocity_y: number;

  DIR: number;

  TARGETPOSITION: { x: number; y: number };
  rayCount: number;
  sensors: Ray[];
  dir: { x: number; y: number; length: number }[];

  interest: number[];
  danger: number[];
  ANGLE: number;
  target: { x: number; y: number };

  constructor(
    world: World,
    x: number,
    y: number,
    target: { x: number; y: number },
  ) {
    this.world = world;
    this.addPhysics(x, y);
    this.createPhysicsvalues();
    this.target = target;
  }

  createPhysicsvalues() {
    this.DIR = 1;
    this.VELOCITY = { x: 0, y: 0 };
    this.TARGETPOSITION = {
      x: this.rigidbody.translation().x,
      y: this.rigidbody.translation().y,
    };
    this.DIVE = false;
    this.SPEED = 60;
    this.JUMP_HEIGHT = 0.7;
    this.JUMP_TIME = 0.7;
    this.GRAVITY = (2 * this.JUMP_HEIGHT) / (this.JUMP_TIME * this.JUMP_TIME);
    this.JUMP_FORCE = (2 * this.JUMP_HEIGHT) / this.JUMP_TIME;
    this.z = 0;
    this.z_speed = 0;
    this.z_floor = this.rigidbody.translation().y;
    this.z_velocity_y = 0;
  }

  addPhysics(x: number, y: number) {
    const rbDesc = RigidBodyDesc.kinematicPositionBased().setTranslation(x, y);
    this.rigidbody = this.world.createRigidBody(rbDesc);
    const colDesc = ColliderDesc.cuboid(12, 12).setTranslation(0, -6);
    this.collider = this.world.createCollider(colDesc, this.rigidbody);
    this.character_controller = this.world.createCharacterController(0.02);
    this.character_controller.setUp({ x: 0, y: -1 });
    this.rayCount = 8;
    this.dir = [];
    this.sensors = [];
    this.interest = [];
    this.danger = [];
    for (let i = 0; i < this.rayCount; i++) {
      const angle = (i / this.rayCount) * Math.PI * 2;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const position = this.rigidbody.translation();
      const ray = new Ray(position, dir);
      this.dir[i] = { x: dir.x, y: dir.y, length: 0 };
      this.sensors[i] = ray;
    }
  }

  updatePlayer(delta: number) {
    this.calculateGravity();
    const pos = this.rigidbody.translation();
    //console.log(target_pos);
    const angle = ANGLE_BETWEEN(
      { x: pos.x, y: pos.y },
      { x: this.target.x, y: this.target.y },
    );
    this.setInterest({ x: Math.cos(angle), y: Math.sin(angle) });
    this.setDanger();
    const dir = this.choose_desired_dir();
    this.VELOCITY.x = dir.x * this.SPEED * (delta / 1000);
    this.VELOCITY.y = dir.y * this.SPEED * (delta / 1000);
    this.character_controller.computeColliderMovement(
      this.collider,
      {
        x: this.VELOCITY.x,
        y: this.VELOCITY.y,
      },
      QueryFilterFlags.EXCLUDE_KINEMATIC,
    );

    const computedMovement = this.character_controller.computedMovement();

    const position = this.rigidbody.translation();
    //this.z_floor = position.y;
    const nextPosition = {
      x: position.x + computedMovement.x,
      y: position.y + computedMovement.y,
    };

    this.rigidbody.setNextKinematicTranslation(nextPosition);
  }

  updateSensor() {
    const position = this.rigidbody.translation();
    this.sensors.forEach((s) => {
      s.origin = position;
    });
  }

  setInterest(targetDir: { x: number; y: number }) {
    for (let i = 0; i < this.sensors.length; i++) {
      const dir = this.sensors[i].dir;
      const d = this.getDotProduct(dir, targetDir);
      const len = Math.max(0, d);
      this.interest[i] = len;
    }
  }

  setDanger() {
    for (let i = 0; i < this.sensors.length; i++) {
      const hit = this.world.castRay(
        this.sensors[i],
        80,
        true,
        QueryFilterFlags.EXCLUDE_KINEMATIC,
      );

      if (hit) {
        this.danger[i] = 1;
      } else {
        this.danger[i] = 0;
      }
    }
  }
  choose_desired_dir() {
    for (let i = 0; i < this.sensors.length; i++) {
      if (this.danger[i] > 0) {
        this.interest[i] = 0;
      }
      const length = this.interest[i] * 50;
      this.dir[i].length = length;
    }
    const chosen_dir = { x: 0, y: 0 };
    for (let i = 0; i < this.sensors.length; i++) {
      chosen_dir.x += this.sensors[i].dir.x * this.interest[i];
      chosen_dir.y += this.sensors[i].dir.y * this.interest[i];
    }
    const dir = this.normalize(chosen_dir.x, chosen_dir.y);
    return dir;
  }
  getDotProduct(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return a.x * b.x + a.y * b.y;
  }

  jump(serverDir?: { x: number; y: number }) {
    if (this.z <= 0) {
      this.z_speed += this.JUMP_FORCE;
      let dir = 0;
      const vel = {
        x: serverDir ? serverDir.x : this.VELOCITY.x,
        y: serverDir ? serverDir.y : this.VELOCITY.y,
      };
      const dirx = Math.sign(vel.x);
      const diry = Math.sign(vel.y);
      if ((dirx === 1 || dirx === -1) && (diry === 1 || diry === -1)) {
        dir = dirx;
      } else if ((dirx === 1 || dirx === -1) && (diry === 0 || diry === 0)) {
        dir = dirx;
      } else if ((dirx === 0 || dirx === 0) && (diry === 1 || diry === -1)) {
        dir = diry;
      } else {
        dir = 0;
      }
    }
  }

  calculateGravity() {
    this.z_speed -= this.GRAVITY * 0.03;
    this.z += this.z_speed;
    if (this.z <= 0) {
      this.z = 0;
      this.z_speed = 0;
    }
  }

  lookAtTarget(target: { x: number; y: number }) {
    const position = this.rigidbody.translation();

    const angle = ANGLE_BETWEEN(
      { x: position.x, y: position.y },
      { x: target.x, y: target.y },
    );
    if (this.DIR < 0) {
      this.ANGLE = Math.PI - angle;
    } else {
      this.ANGLE = angle;
    }
  }
  normalize(x: number, y: number) {
    const length = Math.sqrt(x * x + y * y);

    if (length === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: x / length,
      y: y / length,
    };
  }
}
