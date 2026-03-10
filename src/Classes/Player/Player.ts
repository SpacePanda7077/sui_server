import {
  ColliderDesc,
  KinematicCharacterController,
  QueryFilterFlags,
  RigidBody,
  RigidBodyDesc,
  World,
} from "@dimforge/rapier2d-compat";
import { ANGLE_BETWEEN, Normalize } from "../Math/Math";
import { InputPayload } from "../../rooms/schema/GameRoomState";
import { de } from "zod/v4/locales";

export class Character {
  world: World;
  character_controller: KinematicCharacterController;
  VELOCITY: { x: number; y: number };
  z: number;
  INPUT_VECTOR: { x: number; y: number };
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
  ANGLE: number;

  constructor(world: World, position: { x: number; y: number }) {
    this.world = world;
    this.addPhysics(position.x, position.y);
    this.createPhysicsvalues();
  }

  createPhysicsvalues() {
    this.ANGLE = 0;
    this.DIR = 1;
    this.VELOCITY = { x: 0, y: 0 };
    this.INPUT_VECTOR = { x: 0, y: 0 };
    this.DIVE = false;
    this.SPEED = 100;
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
  }

  updatePlayer(delta: number, target?: Character) {
    this.calculateGravity();
    const norm_iv = Normalize(this.INPUT_VECTOR.x, this.INPUT_VECTOR.y);
    this.VELOCITY.x = norm_iv.x * this.SPEED * (delta / 1000);
    this.VELOCITY.y = norm_iv.y * this.SPEED * (delta / 1000);

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
    this.updateVisuals();
  }

  handleInput(inputPayload: InputPayload) {
    if (inputPayload.right) {
      this.INPUT_VECTOR.x = 1;
    } else if (inputPayload.left) {
      this.INPUT_VECTOR.x = -1;
    } else {
      this.INPUT_VECTOR.x = 0;
    }

    if (inputPayload.up) {
      this.INPUT_VECTOR.y = -1;
    } else if (inputPayload.down) {
      this.INPUT_VECTOR.y = 1;
    } else {
      this.INPUT_VECTOR.y = 0;
    }
  }

  jump() {
    if (this.z <= 0) {
      this.z_speed += this.JUMP_FORCE;
      let dir = 0;
      const dirx = Math.sign(this.VELOCITY.x);
      const diry = Math.sign(this.VELOCITY.y);
      if ((dirx === 1 || dirx === -1) && (diry === 1 || diry === -1)) {
        dir = dirx;
      } else if ((dirx === 1 || dirx === -1) && (diry === 0 || diry === 0)) {
        dir = dirx;
      } else if ((dirx === 0 || dirx === 0) && (diry === 1 || diry === -1)) {
        dir = diry;
      } else {
        dir = 0;
      }
      return dir;
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

  updateVisuals() {
    const position = this.rigidbody.translation();
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
  flipPlayer(target: { x: number; y: number }) {
    const position = this.rigidbody.translation();
    const dir = target.x - position.x;
    this.DIR = Math.sign(dir);
  }
}
