import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { buildSafeLandingPlatform } from "./platform.js";

export const GLITCH_ITEM_ID = "before_alpha:the_glitch";

export const DIMENSIONS = {
    OVERWORLD: "minecraft:overworld",
    JAVA_ALPHA: "before_alpha:java_alpha",
    BEDROCK_BETA: "before_alpha:bedrock_beta"
};

/**
 * Calculates the next dimension in the 3-phase quantum cycle.
 * Overworld -> Java Alpha -> Bedrock Beta -> Overworld
 * @param {string} currentDimId
 * @returns {string}
 */
export function getNextDimension(currentDimId) {
    if (currentDimId === DIMENSIONS.OVERWORLD) {
        return DIMENSIONS.JAVA_ALPHA;
    }
    if (currentDimId === DIMENSIONS.JAVA_ALPHA) {
        return DIMENSIONS.BEDROCK_BETA;
    }
    return DIMENSIONS.OVERWORLD;
}

/**
 * Executes safe dimensional travel with pre-loaded ticking area and platform construction.
 * @param {import("@minecraft/server").Player} player
 * @param {string} targetDimensionId
 */
export async function executeSafeWarp(player, targetDimensionId) {
    const dimension = world.getDimension(targetDimensionId);
    if (!dimension) return;

    const targetLoc = { x: 0, y: 65, z: 0 };
    const cleanDimId = targetDimensionId.replace(/[^a-zA-Z0-9_]/g, "_");
    const areaId = `warp_${cleanDimId}`;

    // 1. Ensure chunk readiness via TickingAreaManager to avoid void fall or disconnect
    try {
        if (world.tickingAreaManager && typeof world.tickingAreaManager.createTickingArea === "function") {
            const hasArea = typeof world.tickingAreaManager.hasTickingArea === "function"
                && world.tickingAreaManager.hasTickingArea(areaId);
            if (!hasArea) {
                await world.tickingAreaManager.createTickingArea(areaId, {
                    dimension,
                    from: { x: targetLoc.x - 8, y: 0, z: targetLoc.z - 8 },
                    to: { x: targetLoc.x + 8, y: 128, z: targetLoc.z + 8 }
                });
            }
        }
    } catch {
        // Ticking area quota limit or area already exists; continue with warp
    }

    // 2. Build Safe Landing Platform at y=64 (air clearance at y=65..67)
    buildSafeLandingPlatform(dimension, targetLoc.x, targetLoc.y, targetLoc.z);

    // 3. Teleport Player to safe spawn position (0.5, 65, 0.5)
    try {
        player.teleport({ x: targetLoc.x + 0.5, y: 65, z: targetLoc.z + 0.5 }, { dimension });
    } catch {
        try {
            player.teleport({ x: targetLoc.x + 0.5, y: 65, z: targetLoc.z + 0.5 });
        } catch {
            // Suppress unhandled engine teleport error
        }
    }

    // 4. Release temporary travel ticking area after 60 ticks (3s buffer) to respect 10-area quota
    system.runTimeout(() => {
        try {
            if (world.tickingAreaManager && typeof world.tickingAreaManager.hasTickingArea === "function") {
                if (world.tickingAreaManager.hasTickingArea(areaId)) {
                    world.tickingAreaManager.removeTickingArea(areaId);
                }
            }
        } catch {
            // Ignore cleanup errors
        }
    }, 60);
}

/**
 * Handles sneak-use instant quick cycle warp.
 * @param {import("@minecraft/server").Player} player
 */
export async function handleQuickCycle(player) {
    const currentDimId = player.dimension ? player.dimension.id : DIMENSIONS.OVERWORLD;
    const nextDimId = getNextDimension(currentDimId);

    try {
        if (player.onScreenDisplay && typeof player.onScreenDisplay.setActionBar === "function") {
            player.onScreenDisplay.setActionBar(`§5§l[THE GLITCH] §dQuantum cycle engaged: Warping to ${nextDimId}...`);
        }
    } catch {}

    try {
        if (typeof player.playSound === "function") {
            player.playSound("portal.travel", { pitch: 1.4, volume: 0.8 });
        }
    } catch {}

    await executeSafeWarp(player, nextDimId);
}

/**
 * Displays modal UI dialog for dimensional destination selection.
 * @param {import("@minecraft/server").Player} player
 */
export async function openGlitchMatrixUI(player) {
    const currentDimId = player.dimension ? player.dimension.id : "unknown";
    const loc = player.location || { x: 0, y: 0, z: 0 };

    const form = new ActionFormData()
        .title("§5§lTHE GLITCH §r§8| Dimensional Navigator")
        .body(
            `§7Current Reality: §e${currentDimId}\n` +
            `§7Coordinates: §a${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)}\n\n` +
            `Select destination space-time continuum:`
        )
        .button("Overworld\n§8Vanilla Reality")
        .button("Java Alpha Dimension\n§8Alpha 1.1.2_01 Timeline")
        .button("Bedrock Beta Dimension\n§8MCPE 0.1.0 Timeline")
        .button("Cancel Navigation");

    let response;
    try {
        response = await form.show(player);
    } catch {
        return;
    }

    if (!response || response.canceled || response.selection === undefined) {
        return;
    }

    let targetDimId = null;
    let label = "";

    if (response.selection === 0) {
        targetDimId = DIMENSIONS.OVERWORLD;
        label = "Overworld";
    } else if (response.selection === 1) {
        targetDimId = DIMENSIONS.JAVA_ALPHA;
        label = "Java Alpha Dimension";
    } else if (response.selection === 2) {
        targetDimId = DIMENSIONS.BEDROCK_BETA;
        label = "Bedrock Beta Dimension";
    } else {
        return;
    }

    try {
        if (player.onScreenDisplay && typeof player.onScreenDisplay.setActionBar === "function") {
            player.onScreenDisplay.setActionBar(`§5§l[THE GLITCH] §dStabilizing wormhole to ${label}...`);
        }
    } catch {}

    try {
        if (typeof player.playSound === "function") {
            player.playSound("portal.travel", { pitch: 1.2, volume: 1.0 });
        }
    } catch {}

    await executeSafeWarp(player, targetDimId);
}

/**
 * Registers the itemUse event listener for before_alpha:the_glitch.
 */
export function initGlitchItemHandler() {
    world.afterEvents.itemUse.subscribe((event) => {
        if (!event.itemStack || event.itemStack.typeId !== GLITCH_ITEM_ID) {
            return;
        }

        const player = event.source;
        if (!player) return;

        if (player.isSneaking) {
            handleQuickCycle(player);
        } else {
            openGlitchMatrixUI(player);
        }
    });
}
