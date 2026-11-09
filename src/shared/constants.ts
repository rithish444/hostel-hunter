import { GameSettings, BoundarySettings, RedZone, TaskItem } from './types.js';

// Default hostel location (can be customized or centered to user's real GPS)
// We default to a representative college / hostel campus coordinates
export const DEFAULT_CAMPUS_CENTER = {
  lat: 12.9716, // Bangalore / typical tech hub campus latitude
  lng: 77.5946,
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
  allowTaskWin: true,
  emergencyMeetingsAllowed: 1,
  defaultFloor: 0,
  floors: [
    { level: 0, name: 'Ground Floor (Lobby & Mess)' },
    { level: 1, name: '1st Floor (Dorm A)' },
    { level: 2, name: '2nd Floor (Dorm B)' },
    { level: 3, name: '3rd Floor (Reading Room)' },
    { level: 4, name: 'Terrace (Out of Bounds)' },
  ],
};

export const DEFAULT_BOUNDARY: BoundarySettings = {
  center: DEFAULT_CAMPUS_CENTER,
  radius: 120, // 120 meter radius around hostel
  name: 'Hostel Complex Perimeter',
};

export const DEFAULT_RED_ZONES: RedZone[] = [
  {
    id: 'rz-terrace',
    name: 'Terrace & Parapet',
    center: { lat: 12.9718, lng: 77.5948 },
    radius: 25,
    floor: 4,
    description: 'Hazard: Fall risk. Off-limits during game!',
    severity: 'danger',
  },
  {
    id: 'rz-generator',
    name: 'Electrical & Generator Room',
    center: { lat: 12.9712, lng: 77.5943 },
    radius: 18,
    floor: 0,
    description: 'High voltage electrical equipment. Entry forbidden!',
    severity: 'danger',
  },
  {
    id: 'rz-warden',
    name: 'Warden Quarters & Admin',
    center: { lat: 12.9721, lng: 77.5944 },
    radius: 20,
    floor: 0,
    description: 'Quiet study zone / Admin office. Do not disturb.',
    severity: 'warning',
  },
  {
    id: 'rz-stairs-rear',
    name: 'Damaged Rear Emergency Stairwell',
    center: { lat: 12.9714, lng: 77.5951 },
    radius: 15,
    floor: 'all',
    description: 'Construction and wet floor hazard.',
    severity: 'danger',
  },
];

export const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 'task-water',
    title: 'Sanitize Water Dispenser',
    description: 'Locate the water dispenser in the ground floor mess and scan the checkpoint QR.',
    floor: 0,
    location: { lat: 12.9715, lng: 77.5945 },
    code: 'WATER_DISPENSER_GF',
    completed: false,
    type: 'qr',
  },
  {
    id: 'task-wifi',
    title: 'Inspect Floor 1 WiFi Router',
    description: 'Find the WiFi access point near Dorm A-102 and scan the equipment QR.',
    floor: 1,
    location: { lat: 12.9717, lng: 77.5947 },
    code: 'ROUTER_FLOOR_1',
    completed: false,
    type: 'qr',
  },
  {
    id: 'task-circuit',
    title: 'Align Electrical Fuses',
    description: 'Solve the quick electrical bypass puzzle to balance power on Floor 2.',
    floor: 2,
    location: { lat: 12.9716, lng: 77.5949 },
    code: 'FUSE_CIRCUIT_F2',
    completed: false,
    type: 'minigame',
    minigameType: 'fuses',
  },
  {
    id: 'task-notice',
    title: 'Check Library Logbook',
    description: 'Scan the hostel study room logbook QR code on Floor 3.',
    floor: 3,
    location: { lat: 12.9719, lng: 77.5946 },
    code: 'LIBRARY_LOG_F3',
    completed: false,
    type: 'qr',
  },
  {
    id: 'task-firstaid',
    title: 'Inspect First Aid Station',
    description: 'Verify first aid supplies in the medical closet on Ground Floor.',
    floor: 0,
    location: { lat: 12.9713, lng: 77.5944 },
    code: 'FIRST_AID_GF',
    completed: false,
    type: 'qr',
  },
];
