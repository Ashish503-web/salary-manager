// Palette based on the validated reference instance (dataviz skill).
// Categorical slots are assigned in fixed order — never cycled/reused by rank.
export const CATEGORICAL = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

export const SEQUENTIAL_BLUE = "#2a78d6";

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
};

// Fixed gender -> color mapping so identity never shifts across charts/filters.
export const GENDER_COLORS: Record<string, string> = {
  FEMALE: CATEGORICAL[4], // magenta
  MALE: CATEGORICAL[0], // blue
  OTHER: CATEGORICAL[6], // violet
};
