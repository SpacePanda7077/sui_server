import { MapSchema, Schema, type } from "@colyseus/schema";
import uniqid from "uniqid";

export const MAXLOBBYCOUNT = 5;

export class MatchMakerRoomState extends Schema {}
