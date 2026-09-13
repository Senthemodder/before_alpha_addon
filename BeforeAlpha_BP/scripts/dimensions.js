import { system } from "@minecraft/server";

export const NOSTALGIA_DIMENSIONS = {
    JAVA_ALPHA: "before_alpha:java_alpha",
    BEDROCK_BETA: "before_alpha:bedrock_beta"
};

export function registerDimensions() {
    system.beforeEvents.startup.subscribe((event) => {
        event.dimensionRegistry.registerCustomDimension(NOSTALGIA_DIMENSIONS.JAVA_ALPHA);
        event.dimensionRegistry.registerCustomDimension(NOSTALGIA_DIMENSIONS.BEDROCK_BETA);
    });
}
