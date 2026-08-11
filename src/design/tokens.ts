export const colors = {
  canvasLight: "#EFE9E1",
  surfaceLight: "#F6F1EA",
  surfaceRaisedLight: "#FFFDF9",
  textPrimaryLight: "#211E1B",
  textSecondaryLight: "#766E65",
  textTertiaryLight: "#A2988C",
  borderLight: "#DED5CB",
  canvasRecording: "#1B1713",
  surfaceRecording: "#15120F",
  surfaceRaisedRecording: "#201C17",
  textPrimaryRecording: "#F4EEE4",
  textSecondaryRecording: "#9A8F82",
  textTertiaryRecording: "#6C6358",
  borderRecording: "#2B251F",
  ember: "#E8894C",
  emberLight: "#A85A2C",
  emberSoftRecording: "#291F18",
} as const;

export const fontFamily = {
  sans: "InstrumentSans_400Regular",
  sansMedium: "InstrumentSans_500Medium",
  serif: "InstrumentSerif_400Regular",
  mono: "JetBrainsMono_400Regular",
} as const;

export const layout = {
  mobileGutter: 24,
  tabletGutter: 26,
  desktopGutter: 40,
  desktopRecordingGutter: 46,
  desktopRail: 212,
  desktopBreakpoint: 1000,
  tabletBreakpoint: 480,
  workspaceWidth: 712,
  recordingWorkspaceWidth: 788,
} as const;
