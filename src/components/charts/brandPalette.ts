import { useTheme } from "../../context/ThemeContext";

/**
 * One categorical palette for every chart in the dashboard, built from the two
 * Buyology brand colours so the charts read as part of the same system as the
 * rest of the UI rather than as a stock template.
 *
 * It has to change with the theme, because neither brand colour works on both
 * card surfaces:
 *
 *  - American Blue #402F75 clears 4.6:1 on a white card but only ~1.6:1 on the
 *    dark one, where it all but vanishes. Dark mode uses its published tint
 *    #8C82AC instead (~5.6:1 on gray-900).
 *  - Mikado Yellow #FFBE12 is the reverse: ~9.9:1 on dark, ~1.8:1 on white, so
 *    a hairline drawn in it disappears in light mode. Light mode uses the
 *    darkened gold #B8890D (~3.3:1 on white), which still reads as the brand's
 *    gold.
 *
 * Every pairing clears the 3:1 that WCAG asks of non-text graphics, and blue
 * against gold separates under all three common colour-vision deficiencies.
 */
export type ChartPalette = {
  /** First series — the headline measure. */
  primary: string;
  /** Second series. */
  secondary: string;
  /** Third series, where one is needed. */
  tertiary: string;
  /** Un-filled remainder of a gauge or meter. */
  track: string;
  /** Axis labels and legend text. */
  axis: string;
  /** Grid hairlines. */
  grid: string;
};

const LIGHT: ChartPalette = {
  primary: "#402F75",
  secondary: "#B8890D",
  tertiary: "#8C82AC",
  track: "#E4E7EC",
  axis: "#667085",
  grid: "rgba(102, 112, 133, 0.15)",
};

const DARK: ChartPalette = {
  primary: "#8C82AC",
  secondary: "#FFBE12",
  tertiary: "#D9D5E3",
  track: "rgba(255, 255, 255, 0.10)",
  axis: "#98A2B3",
  grid: "rgba(152, 162, 179, 0.18)",
};

/** The palette for the theme currently on screen. */
export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return theme === "dark" ? DARK : LIGHT;
}
