// Fixed chip options for the onboarding wizard's single-select steps.
export const YEAR_OF_STUDY_OPTIONS = ["1st year", "2nd year", "3rd year", "Master's", "PhD"];

export const SMOKER_OPTIONS = ["No", "Occasionally", "Yes", "Prefer not to say"];

export const PETS_OPTIONS = ["No pets", "Have a pet", "Open to pets", "Prefer not to say"];

// "5+" is stored as the integer 5 (meaning "5 or more").
export const ACCOMMODATES_OPTIONS = ["1", "2", "3", "4", "5+"];

export function accommodatesLabelToInt(label: string): number {
  return parseInt(label, 10);
}

export function accommodatesIntToLabel(value: number): string {
  return value >= 5 ? "5+" : String(value);
}

export const MIN_SELF_PHOTO_COUNT = 2;
export const MAX_SELF_PHOTO_COUNT = 5;
export const MIN_FLAT_PHOTO_COUNT = 4;
export const MAX_FLAT_PHOTO_COUNT = 8;
