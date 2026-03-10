import { ColliderDesc, RigidBodyDesc, World } from "@dimforge/rapier2d-compat";
import fs from "fs";
export class Map_Creator {
  world: World;
  spawn_points: { [key: string]: { x: number; y: number } };
  pointT0Occupy: number;
  wander_nodes: { x: number; y: number }[];
  constructor(world: World, name: string) {
    this.world = world;
    this.spawn_points = {};
    this.createMap(name);
    this.pointT0Occupy = 1;
    this.wander_nodes = [];
  }
  createMap(name: string) {
    fs.readFile(`src/Maps/${name}.json`, "utf-8", (err, data) => {
      const mapdata = JSON.parse(data);
      const collisionLayer = mapdata.layers.find(
        (layer: any) => layer.name === "collision",
      );
      const positionLayer = mapdata.layers.find(
        (layer: any) => layer.name === "positions",
      );
      const wanderLayer = mapdata.layers.find(
        (layer: any) => layer.name === "wander_nodes",
      );
      if (!collisionLayer || !positionLayer || !wanderLayer) {
        console.log(
          "[Load Map Error] : Couldnt find Collision or Positions Layer",
        );
        return;
      }
      collisionLayer.objects.forEach((obj: any) => {
        const objs = {
          x: obj.x as number,
          y: obj.y as number,
          width: obj.width as number,
          height: obj.height as number,
        };
        this.createCollision(objs);
      });

      positionLayer.objects.forEach((pos: any) => {
        this.spawn_points[pos.name] = { x: pos.x, y: pos.y };
      });
      console.log(this.spawn_points);

      wanderLayer.objects.forEach((pos: any) => {
        this.wander_nodes.push({ x: pos.x, y: pos.y });
      });
    });
  }
  createCollision(obj: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const rbDesc = RigidBodyDesc.fixed().setTranslation(
      obj.x + obj.width / 2,
      obj.y + obj.height / 2,
    );
    const rb = this.world.createRigidBody(rbDesc);
    const colDesc = ColliderDesc.cuboid(obj.width / 2, obj.height / 2);
    this.world.createCollider(colDesc, rb);
  }
}
