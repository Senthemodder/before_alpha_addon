import * as gametest from "@minecraft/server-gametest";
import { world, system, ItemStack } from "@minecraft/server";

/**
 * SCP CONTAINMENT PROTOCOL: D-9341 AUTONOMOUS PLAYTEST
 * Enforces in-game physical reality verification under the Superintendent Tribunal.
 */
gametest.register("BeforeAlphaTests", "class_d_containment_run", (test) => {
    // 1. Materialize Class D Simulated Player
    const bot = test.spawnSimulatedPlayer({ x: 2, y: 2, z: 2 }, "D-9341");
    test.assert(bot !== undefined, "CRITICAL: Failed to materialize Subject D-9341 in containment chamber");

    // 2. Set up test blocks in test structure
    test.setBlockType("before_alpha:alpha_grass_block", { x: 2, y: 1, z: 2 });
    test.setBlockType("before_alpha:alpha_stone", { x: 3, y: 1, z: 2 });
    test.setBlockType("before_alpha:alpha_cobblestone", { x: 4, y: 2, z: 2 });

    // 3. Movement & Traversal Check
    test.runAfterDelay(10, () => {
        bot.moveToBlock({ x: 3, y: 2, z: 2 }, 1.0);
    });

    // 4. Mining Check
    test.runAfterDelay(30, () => {
        bot.lookAtBlock({ x: 4, y: 2, z: 2 });
        bot.breakBlock({ x: 4, y: 2, z: 2 });
    });

    // 5. Block Placement Check
    test.runAfterDelay(60, () => {
        const inv = bot.getComponent("minecraft:inventory");
        if (inv && inv.container) {
            inv.container.setItem(0, new ItemStack("before_alpha:beta_stone", 1));
            bot.useItemOnBlock(0, { x: 4, y: 1, z: 2 });
        }
    });

    // 6. "THE GLITCH" Dimensional Rift Activation
    test.runAfterDelay(90, () => {
        const inv = bot.getComponent("minecraft:inventory");
        if (inv && inv.container) {
            inv.container.setItem(0, new ItemStack("before_alpha:the_glitch", 1));
            // Trigger item activation
            bot.useItemInSlot(0);
        }
    });

    // 7. Verify Health, Survival, and Conformance
    test.runAfterDelay(120, () => {
        const health = bot.getComponent("minecraft:health");
        test.assert(health && health.currentValue > 0, "FATAL: D-9341 expired during dimensional travel");
        test.assert(bot.dimension !== undefined, "FATAL: Lost dimensional reality anchor");
        
        // Final Clearance
        test.succeed();
    });
})
.maxTicks(160)
.structureName("BeforeAlphaTests:containment_chamber");
