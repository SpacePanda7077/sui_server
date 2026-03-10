import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") sequence: number;
  @type("number") targetX: number;
  @type("number") targetY: number;
  @type("string") animation: string;
  @type("number") team_id: number;
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

export interface InputPayload {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}
