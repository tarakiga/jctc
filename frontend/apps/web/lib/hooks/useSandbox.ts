'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SandboxState {
  isActive: boolean;
  activatedAt: string | null;
  syntheticDataCount: number;
  lastResetAt: string | null;
}

interface SandboxStore extends SandboxState {
  activateSandbox: () => void;
  deactivateSandbox: () => void;
  generateSyntheticData: (count: number) => Promise<void>;
  resetSandbox: () => Promise<void>;
}

// Zustand store with persistence
export const useSandboxStore = create<SandboxStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      activatedAt: null,
      syntheticDataCount: 0,
      lastResetAt: null,

      activateSandbox: () => {
        set({
          isActive: true,
          activatedAt: new Date().toISOString(),
        });
      },

      deactivateSandbox: () => {
        set({
          isActive: false,
          activatedAt: null,
        });
      },

      generateSyntheticData: async (count: number) => {
        // Simulate API call to generate synthetic data
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        set((state) => ({
          syntheticDataCount: state.syntheticDataCount + count,
        }));
      },

      resetSandbox: async () => {
        // Simulate API call to reset sandbox
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        set({
          syntheticDataCount: 0,
          lastResetAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'jctc-sandbox-storage',
    }
  )
);

// Synthetic data generation templates
export const SYNTHETIC_DATA_TEMPLATES = [
  {
    id: 'fraud-cases',
    name: 'Fraud Cases',
    description: 'Generate realistic fraud and financial crime cases',
    count: 10,
    entities: ['cases', 'parties', 'evidence', 'legal_instruments'],
  },
  {
    id: 'harassment-cases',
    name: 'Harassment Cases',
    description: 'Generate cyber harassment and stalking cases',
    count: 8,
    entities: ['cases', 'parties', 'evidence'],
  },
  {
    id: 'complete-workflow',
    name: 'Complete Investigation Workflow',
    description: 'Generate cases with full lifecycle: evidence, forensics, prosecution',
    count: 5,
    entities: ['cases', 'parties', 'evidence', 'devices', 'forensics', 'legal_instruments', 'charges'],
  },
  {
    id: 'users-and-teams',
    name: 'Training Users',
    description: 'Generate test users with different roles (investigator, prosecutor, admin)',
    count: 15,
    entities: ['users'],
  },
];

export interface SyntheticDataTemplate {
  id: string;
  name: string;
  description: string;
  count: number;
  entities: string[];
}

// Simulated data generation function
export const generateSyntheticData = async (
  templateId: string
): Promise<{
  success: boolean;
  generated: number;
  message: string;
}> => {
  const template = SYNTHETIC_DATA_TEMPLATES.find((t) => t.id === templateId);
  
  if (!template) {
    return {
      success: false,
      generated: 0,
      message: 'Template not found',
    };
  }

  // Simulate generation delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    success: true,
    generated: template.count,
    message: `Generated ${template.count} ${template.name.toLowerCase()} successfully`,
  };
};

// Sandbox warnings and guidelines
export const SANDBOX_WARNINGS = [
  'Sandbox mode isolates training data from production data',
  'All actions in sandbox mode will not affect real cases',
  'Sandbox data can be reset at any time without affecting production',
  'Users should be informed they are in training mode',
  'Do not use real PII or sensitive information in sandbox mode',
];

export const SANDBOX_GUIDELINES = [
  {
    title: 'Activate Sandbox Mode',
    description: 'Enable sandbox mode to isolate training activities from production data',
  },
  {
    title: 'Generate Synthetic Data',
    description: 'Create realistic test cases, users, and evidence for training purposes',
  },
  {
    title: 'Conduct Training',
    description: 'Train users on case management, evidence handling, and workflows',
  },
  {
    title: 'Reset When Complete',
    description: 'Clear all synthetic data and reset sandbox to clean state',
  },
  {
    title: 'Deactivate Sandbox',
    description: 'Return to production mode when training is complete',
  },
];

// Get sandbox status summary
export const getSandboxStatus = (state: SandboxState): {
  statusText: string;
  statusColor: string;
  canGenerate: boolean;
  canReset: boolean;
} => {
  if (!state.isActive) {
    return {
      statusText: 'Sandbox Inactive',
      statusColor: 'neutral',
      canGenerate: false,
      canReset: false,
    };
  }

  if (state.syntheticDataCount === 0) {
    return {
      statusText: 'Sandbox Active - No Data',
      statusColor: 'blue',
      canGenerate: true,
      canReset: false,
    };
  }

  return {
    statusText: 'Sandbox Active - Training Mode',
    statusColor: 'green',
    canGenerate: true,
    canReset: true,
  };
};
