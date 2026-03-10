import {
  Room,
  Client,
  CloseCode,
  matchMaker,
  Messages,
  Clock,
  Delayed,
} from "colyseus";
import { MatchMakerRoomState } from "./schema/MatchMakerRoomState";

export class MatchMakerRoom extends Room {
  maxClients = 6;
  state = MatchMakerRoomState;
  matchMakeingTime = 10;
  readyClient: Client[] = [];
  startGameWaitTimer: Delayed;
  startGameTimer: number = 10;

  messages = {
    map_ready: async (client: Client) => {
      this.readyClient.push(client);
      if (this.readyClient.length === this.clients.length) {
        const room = await matchMaker.createRoom("game_room", {
          game_type: this.metadata.game_type,
          number_of_clients: this.readyClient.length,
        });

        this.broadcast("start_game", room.roomId);
        this.startGameWaitTimer.clear();
        return;
      }
      if (!this.startGameWaitTimer) {
        this.startGameWaitTimer = this.clock.setInterval(async () => {
          this.startGameTimer--;
          if (this.startGameTimer <= 0) {
            const room = await matchMaker.createRoom("game_room", {
              game_type: this.metadata.game_type,
              number_of_clients: this.readyClient.length,
            });
            this.broadcast("start_game");
            this.startGameWaitTimer.clear();
          }
        }, 1000);
      }
    },
  };
  onCreate(options: any) {
    this.setMetadata({ game_type: options.game_type });
    this.seatReservationTimeout = 30;
    const time_left = this.clock.setInterval(() => {
      this.matchMakeingTime--;
      this.broadcast("time_left", this.matchMakeingTime);
      if (this.matchMakeingTime <= 0) {
        this.clients.forEach(async (cl) => {
          await this.lock();
          cl.send("load_map");
        });
        time_left.clear();
      }
    }, 1000);
    /**
     * Called when a new room is created.
     */
  }

  onJoin(client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    console.log(client.sessionId, "joined match maker!");
  }

  onLeave(client: Client, code: CloseCode) {
    /**
     * Called when a client leaves the room.
     */
    console.log(client.sessionId, "left match maker!", code);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }
}
