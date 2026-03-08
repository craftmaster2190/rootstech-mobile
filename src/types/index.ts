export interface RootstechClass {
  Date: string;
  Time: string;
  Title: string;
  Speakers: string;
  Classroom: string | null;
  Location: string;
  'Available for Viewing After Conference': string;
  url: string;
  timestamp: number; // Unix epoch timestamp in milliseconds
  isReplay: boolean; // True if this is a replay of an earlier class
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}
