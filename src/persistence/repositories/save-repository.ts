import { migrateSaveRecord } from "../migrations/save-migrations";
import {
  CURRENT_SAVE_VERSION,
  type GameSaveRecord
} from "../../types/save";
import { gameDatabase } from "../database/game-database";

export const AUTO_SAVE_ID = "autosave";
export const SAVE_VERSION = CURRENT_SAVE_VERSION;

export async function loadAutoSave(): Promise<GameSaveRecord | undefined> {
  const stored = await gameDatabase.saves.get(AUTO_SAVE_ID);

  if (!stored) {
    return undefined;
  }

  const migrated = migrateSaveRecord(stored);

  if (migrated.saveVersion !== stored.saveVersion) {
    await gameDatabase.saves.put(migrated);
  }

  return migrated;
}

export async function writeAutoSave(save: GameSaveRecord): Promise<void> {
  await gameDatabase.saves.put(save);
}

export async function deleteAutoSave(): Promise<void> {
  await gameDatabase.saves.delete(AUTO_SAVE_ID);
}
