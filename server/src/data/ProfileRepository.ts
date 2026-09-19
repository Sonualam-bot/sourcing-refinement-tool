import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Profile } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Isolates the one piece of "persistence" this app has (the supplied sample
 * dataset) from everything else. Services depend on this repository, never
 * on the file path or JSON shape directly - if the data source ever changed
 * (a real DB, a different file), only this file would move.
 */
export class ProfileRepository {
  private profiles: Profile[];

  constructor() {
    const raw = readFileSync(join(__dirname, "profiles.json"), "utf-8");
    this.profiles = JSON.parse(raw) as Profile[];
  }

  getAll(): Profile[] {
    return this.profiles;
  }
}
