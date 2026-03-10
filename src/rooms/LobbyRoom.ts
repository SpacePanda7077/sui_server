import { Room, Client, CloseCode, matchMaker, Messages } from "colyseus";
import { LobbyRoomState } from "./schema/LobbyRoomState.js";

export class LobbyRoom extends Room {
  maxClients = 3;
  state = new LobbyRoomState();

  messages = {
    join_lobby: async (
      client: Client,
      data: { game_type: string; team_id: string },
    ) => {
      await this.findRoom(data.game_type);
    },
  };

  onCreate(options: any) {
    /**
     * Called when a new room is created.
     */
  }

  onJoin(client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    console.log(client.sessionId, "joined lobby!");
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

  async findRoom(game_type: string) {
    const allRooms = await matchMaker.query({ name: "match_maker_room" });
    if (allRooms.length >= this.state.MaxLobbyPerServer) {
      console.log("[Server Full]: Server is full !!!");
      return;
    }
    console.log(allRooms);
    const available_room = allRooms.find(
      (room) =>
        !room.locked &&
        !room.private &&
        room.metadata.game_type === game_type &&
        room.maxClients - room.clients >= this.clients.length,
    );
    if (available_room) {
      console.log(available_room);
      this.clients.forEach(async (cl) => {
        const reservation = await matchMaker.reserveSeatFor(available_room, {});
        cl.send("consume_reservation", reservation);
      });
    } else {
      const room = await matchMaker.createRoom("match_maker_room", {
        game_type,
      });
      this.clients.forEach(async (cl) => {
        const reservation = await matchMaker.reserveSeatFor(room, {});
        console.log(reservation);
        cl.send("consume_reservation", reservation);
      });
    }
  }
}
