import { registerDimensions } from "./dimensions.js";
import { initGlitchItemHandler } from "./glitch_item.js";
import { buildSafeLandingPlatform } from "./platform.js";

// Register twin custom dimensions in system.beforeEvents.startup
registerDimensions();

// Initialize THE GLITCH dimensional travel item interactions
initGlitchItemHandler();

export { registerDimensions, initGlitchItemHandler, buildSafeLandingPlatform };
