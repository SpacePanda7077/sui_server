import { Room, Client, CloseCode, Messages } from "colyseus";
import { GameRoomState, InputPayload, Player } from "./schema/GameRoomState.js";
import { init, World } from "@dimforge/rapier2d-compat";
import { Map_Creator } from "../Classes/MapCreator/MapCreator.js";
import { Character } from "../Classes/Player/Player.js";
import uniqid from "uniqid";
import { Bot } from "../Classes/Bot/Bot.js";
import { pl } from "zod/v4/locales";

export class GameRoom extends Room {
  maxClients = 6;
  number_of_clients: number;
  state = new GameRoomState();
  players: { [key: string]: Character };
  bots: { [key: string]: Bot };
  world: World;
  map: Map_Creator;

  messages?: Messages<any> = {
    move: (
      client: Client,
      data: { inputPayload: InputPayload; sequence: number },
    ) => {
      const id = client.sessionId;
      const s_player = this.state.players.get(id);
      if (this.players[id] instanceof Character) {
        this.players[id].handleInput(data.inputPayload);
        s_player.sequence = data.sequence;
      }
    },

    jump: (client: Client) => {
      const id = client.sessionId;
      const dir = this.players[id].jump();
      this.broadcast("jumped", {
        id,
        vel: { x: this.players[id].VELOCITY.x, y: this.players[id].VELOCITY.y },
      });
    },
    lookat: (client: Client, target: { x: number; y: number }) => {
      const id = client.sessionId;
      const s_player = this.state.players.get(id);
      s_player.targetX = target.x;
      s_player.targetY = target.y;
    },
  };

  async onCreate(options: any) {
    this.number_of_clients = options.number_of_clients;
    console.log("num cli ", this.number_of_clients);
    await this.initialize_rapier();
    this.players = {};
    this.bots = {};
    this.map = new Map_Creator(this.world, "scifi_biom");
    this.setSimulationInterval((delta: number) => {
      this.world.step();
      for (const id in this.players) {
        this.players[id].updatePlayer(delta);
        const s_player = this.state.players.get(id);
        const position = this.players[id].rigidbody.translation();
        if (
          this.players[id].VELOCITY.x !== 0 ||
          this.players[id].VELOCITY.y !== 0
        ) {
          s_player.animation = "run";
        } else {
          s_player.animation = "idle";
        }
        s_player.x = position.x;
        s_player.y = position.y;
      }
      for (const id in this.bots) {
        this.bots[id].updateSensor();
        this.bots[id].updatePlayer(delta);

        const s_player = this.state.players.get(id);
        const position = this.bots[id].rigidbody.translation();
        if (this.bots[id].VELOCITY.x !== 0 || this.bots[id].VELOCITY.y !== 0) {
          s_player.animation = "run";
        } else {
          s_player.animation = "idle";
        }
        s_player.x = position.x;
        s_player.y = position.y;
      }
      this.broadcast("update_players", this.state.players);
    }, 1000 / 45);
  }

  onJoin(client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    const id = client.sessionId;
    console.log(client.sessionId, "joined!");
    const pos = this.map.spawn_points[`point${this.map.pointT0Occupy}`];
    this.players[id] = new Character(this.world, pos);
    this.map.pointT0Occupy = this.map.pointT0Occupy === 1 ? 2 : 1;
    const serverPlayer = new Player();
    const position = this.players[id].rigidbody.translation();
    serverPlayer.x = position.x;
    serverPlayer.y = position.y;
    serverPlayer.targetX = 0;
    serverPlayer.targetY = 0;
    serverPlayer.animation = "idle";
    serverPlayer.team_id = this.map.pointT0Occupy;
    this.state.players.set(id, serverPlayer);
    if (this.clients.length === this.number_of_clients) {
      this.addBots();
    }
  }

  onLeave(client: Client, code: CloseCode) {
    /**
     * Called when a client leaves the room.
     */
    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }

  async initialize_rapier() {
    await init();
    const gravity = { x: 0, y: 0 };
    this.world = new World(gravity);
  }
  addBots() {
    const remaining_slot = this.maxClients - this.number_of_clients;
    for (let i = 0; i < remaining_slot; i++) {
      const id = uniqid();
      const pos = this.map.spawn_points[`point${this.map.pointT0Occupy}`];
      console.log(`point${this.map.pointT0Occupy}`);
      const targetIndex = Math.floor(
        Math.random() * this.map.wander_nodes.length,
      );
      const target = this.map.wander_nodes[targetIndex];
      this.bots[id] = new Bot(this.world, pos.x, pos.y, target);
      this.map.pointT0Occupy = this.map.pointT0Occupy === 1 ? 2 : 1;
      const serverPlayer = new Player();
      const position = this.bots[id].rigidbody.translation();
      serverPlayer.x = position.x;
      serverPlayer.y = position.y;
      serverPlayer.targetX = 0;
      serverPlayer.targetY = 0;
      serverPlayer.animation = "idle";
      serverPlayer.team_id = this.map.pointT0Occupy;
      this.state.players.set(id, serverPlayer);
    }
  }
}
