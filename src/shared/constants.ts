import { GameSettings, BoundarySettings, RedZone, TaskItem } from './types.js';

// Default campus location: Sri Ramakrishna Engineering College (SREC), Men's Hostel 2, Coimbatore
export const DEFAULT_CAMPUS_CENTER = {
  lat: 11.1005, // SREC Men's Hostel 2, Vattamalaipalayam, Coimbatore
  lng: 76.9683,
};

export const DEFAULT_SETTINGS: GameSettings = {
  durationMinutes: 10,
  hidingTimeSeconds: 60,
  hunterCount: 2,
  updateIntervalSeconds: 20,
  proximityWarningMeters: 15,
  blurRadiusMeters: 30,
  radarPulsesPerHunter: 3,
  gracePeriodSeconds: 15,
  allowTaskWin: false,
  emergencyMeetingsAllowed: 1,
  defaultFloor: 0,
  floors: [
    { level: 0, name: 'Ground Floor (Lobby & Mess)' },
    { level: 1, name: '1st Floor (Hostel 2 Rooms A)' },
    { level: 2, name: '2nd Floor (Hostel 2 Rooms B)' },
    { level: 3, name: '3rd Floor (Reading Room)' },
    { level: 4, name: 'Terrace (Out of Bounds)' },
  ],
};

export const DEFAULT_BOUNDARY: BoundarySettings = {
  center: DEFAULT_CAMPUS_CENTER,
  radius: 160, // 160 meter radius around SREC Men's Hostel 2
  name: "SREC Men's Hostel 2 Perimeter",
};

export const DEFAULT_RED_ZONES: RedZone[] = [
  {
    id: 'rz-terrace',
    name: 'Hostel 2 Roof Terrace',
    center: { lat: 11.1006, lng: 76.9684 },
    radius: 25,
    floor: 4,
    description: 'Hazard: Fall risk. Off-limits during game!',
    severity: 'danger',
  },
  {
    id: 'rz-generator',
    name: 'Electrical & Generator Room',
    center: { lat: 11.1003, lng: 76.9681 },
    radius: 20,
    floor: 0,
    description: 'High voltage electrical equipment. Entry forbidden!',
    severity: 'danger',
  },
  {
    id: 'rz-warden',
    name: 'Hostel 2 Warden Office',
    center: { lat: 11.1007, lng: 76.9682 },
    radius: 20,
    floor: 0,
    description: 'Quiet study zone / Admin office. Do not disturb.',
    severity: 'warning',
  },
  {
    id: 'rz-stairs-rear',
    name: 'Rear Service Stairwell',
    center: { lat: 11.1004, lng: 76.9685 },
    radius: 15,
    floor: 'all',
    description: 'Maintenance area and hazard.',
    severity: 'danger',
  },
];

export const DEFAULT_TASKS: TaskItem[] = [];

