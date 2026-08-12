// Metro selects `.native` or `.web` at runtime. This export gives TypeScript a
// single implementation signature during repository-wide validation.
export { useLiveVoiceCapture } from "./useLiveVoiceCapture.native";
