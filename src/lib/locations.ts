import locationsData from "@/data/nigeria-locations.json";

export interface NigeriaStateEntry {
  state: string;
  lgas: string[];
}

const NIGERIA_LOCATIONS: NigeriaStateEntry[] = locationsData as NigeriaStateEntry[];

export function getAllStates(): string[] {
  return NIGERIA_LOCATIONS.map((entry) => entry.state);
}

export function getLgasForState(stateName: string): string[] {
  const entry = NIGERIA_LOCATIONS.find(
    (item) => item.state.toLowerCase() === stateName.trim().toLowerCase()
  );
  return entry ? entry.lgas : [];
}
