/**
 * Nigerian States and FCT for dropdown selections
 * Based on Nigeria's 36 states plus the Federal Capital Territory
 */

export interface NigerianState {
    code: string;
    name: string;
    region: 'NORTH_CENTRAL' | 'NORTH_EAST' | 'NORTH_WEST' | 'SOUTH_EAST' | 'SOUTH_SOUTH' | 'SOUTH_WEST' | string;
}

export const NIGERIAN_STATES: NigerianState[] = [
    // North Central
    { code: 'BN', name: 'Benue', region: 'NORTH_CENTRAL' },
    { code: 'FC', name: 'FCT - Abuja', region: 'NORTH_CENTRAL' },
    { code: 'KG', name: 'Kogi', region: 'NORTH_CENTRAL' },
    { code: 'KW', name: 'Kwara', region: 'NORTH_CENTRAL' },
    { code: 'NS', name: 'Nasarawa', region: 'NORTH_CENTRAL' },
    { code: 'NI', name: 'Niger', region: 'NORTH_CENTRAL' },
    { code: 'PL', name: 'Plateau', region: 'NORTH_CENTRAL' },

    // North East
    { code: 'AD', name: 'Adamawa', region: 'NORTH_EAST' },
    { code: 'BA', name: 'Bauchi', region: 'NORTH_EAST' },
    { code: 'BO', name: 'Borno', region: 'NORTH_EAST' },
    { code: 'GM', name: 'Gombe', region: 'NORTH_EAST' },
    { code: 'TR', name: 'Taraba', region: 'NORTH_EAST' },
    { code: 'YB', name: 'Yobe', region: 'NORTH_EAST' },

    // North West
    { code: 'JG', name: 'Jigawa', region: 'NORTH_WEST' },
    { code: 'KD', name: 'Kaduna', region: 'NORTH_WEST' },
    { code: 'KN', name: 'Kano', region: 'NORTH_WEST' },
    { code: 'KT', name: 'Katsina', region: 'NORTH_WEST' },
    { code: 'KB', name: 'Kebbi', region: 'NORTH_WEST' },
    { code: 'SK', name: 'Sokoto', region: 'NORTH_WEST' },
    { code: 'ZM', name: 'Zamfara', region: 'NORTH_WEST' },

    // South East
    { code: 'AB', name: 'Abia', region: 'SOUTH_EAST' },
    { code: 'AN', name: 'Anambra', region: 'SOUTH_EAST' },
    { code: 'EB', name: 'Ebonyi', region: 'SOUTH_EAST' },
    { code: 'EN', name: 'Enugu', region: 'SOUTH_EAST' },
    { code: 'IM', name: 'Imo', region: 'SOUTH_EAST' },

    // South South
    { code: 'AK', name: 'Akwa Ibom', region: 'SOUTH_SOUTH' },
    { code: 'BY', name: 'Bayelsa', region: 'SOUTH_SOUTH' },
    { code: 'CR', name: 'Cross River', region: 'SOUTH_SOUTH' },
    { code: 'DT', name: 'Delta', region: 'SOUTH_SOUTH' },
    { code: 'ED', name: 'Edo', region: 'SOUTH_SOUTH' },
    { code: 'RV', name: 'Rivers', region: 'SOUTH_SOUTH' },

    // South West
    { code: 'EK', name: 'Ekiti', region: 'SOUTH_WEST' },
    { code: 'LA', name: 'Lagos', region: 'SOUTH_WEST' },
    { code: 'OG', name: 'Ogun', region: 'SOUTH_WEST' },
    { code: 'ON', name: 'Ondo', region: 'SOUTH_WEST' },
    { code: 'OS', name: 'Osun', region: 'SOUTH_WEST' },
    { code: 'OY', name: 'Oyo', region: 'SOUTH_WEST' },
].sort((a, b) => a.name.localeCompare(b.name));

// Default state code (Lagos - most common for cybercrime cases)
export const DEFAULT_STATE_CODE = 'LA';

// Helper to get state by code
export function getStateByCode(code: string): NigerianState | undefined {
    return NIGERIAN_STATES.find(s => s.code === code);
}

// Helper to get states by region
export function getStatesByRegion(region: NigerianState['region']): NigerianState[] {
    return NIGERIAN_STATES.filter(s => s.region === region);
}
