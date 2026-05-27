import type { DynamicsFunctionalLocation } from '@involve/shared';

// Mutable for the same reason as mockSites — mock POST/PATCH push/mutate.
export const mockRooms: DynamicsFunctionalLocation[] = [
  // London HQ
  {
    msdyn_functionallocationid: 'room-001',
    msdyn_name: 'Reception',
    _new_associatedsite_value: 'site-001',
  },
  {
    msdyn_functionallocationid: 'room-002',
    msdyn_name: 'Boardroom',
    _new_associatedsite_value: 'site-001',
  },
  {
    msdyn_functionallocationid: 'room-003',
    msdyn_name: 'Meeting Room 1',
    _new_associatedsite_value: 'site-001',
  },
  // Manchester Office
  {
    msdyn_functionallocationid: 'room-004',
    msdyn_name: 'Open Floor',
    _new_associatedsite_value: 'site-002',
  },
  {
    msdyn_functionallocationid: 'room-005',
    msdyn_name: "Director's Office",
    _new_associatedsite_value: 'site-002',
  },
  // Bristol Branch
  {
    msdyn_functionallocationid: 'room-006',
    msdyn_name: 'Training Room',
    _new_associatedsite_value: 'site-003',
  },
  {
    msdyn_functionallocationid: 'room-007',
    msdyn_name: 'Reception',
    _new_associatedsite_value: 'site-003',
  },
];
