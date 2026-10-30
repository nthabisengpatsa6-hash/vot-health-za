import { callFunction } from "./api";

export const rankSources = ({ day, symptomGroup, area }) => callFunction("rankSources", { day, symptomGroup, area });
