import Dexie, { type EntityTable } from "dexie";
import type { StoredSaveRecord } from "../../types/save";

export class GameDatabase extends Dexie {
  saves!: EntityTable<StoredSaveRecord, "id">;

  constructor() {
    super("white-camellia-will");

    this.version(1).stores({
      saves: "id, gameId, contentVersion, updatedAt"
    });
  }
}

export const gameDatabase = new GameDatabase();
