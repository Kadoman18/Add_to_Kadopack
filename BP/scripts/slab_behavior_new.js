/** @format */

// Import necessary modules from Minecraft server API
import { system, world } from "@minecraft/server";

// This object will contain the handler for the 'onItemUseOn' event
const slabBlockComponent = {
	onItemUseOn(event) {
		// Destructure event data for easier access
		const {
			block,
			source: player,
			blockFace,
			faceLocation,
			itemStack,
		} = event;

		// Exit early if the block is invalid or the item is not a slab
		if (
			!block ||
			!block.isValid() ||
			!itemStack ||
			!itemStack.typeId.includes("slab")
		) {
			return;
		}

		const equipment = player.getComponent("equippable");
		if (!equipment) {
			event.cancel = true;
			return;
		}
		const selectedItem = equipment.getEquipment("Mainhand");
		if (!selectedItem) {
			event.cancel = true;
			return;
		}

		let wasActionTaken = false;


		//Attempt to get permutation states; handle cases where block may not have these states
		const verticalHalf = block.permutation.hasState("minecraft:vertical_half")
			? block.permutation?.getState("minecraft:vertical_half")
			: null;
		const isDoubleSlab = block.permutation.hasState("kado:double")
			? block.permutation?.getState("kado:double")
			: false;

		// Check for merging with the existing slab
		const isMergingSlab =
			selectedItem.typeId === block.typeId &&
			!isDoubleSlab &&
			((verticalHalf === "top" &&
				(blockFace === "Down" || faceLocation.y < 0.5)) ||
				(verticalHalf === "bottom" &&
					(blockFace === "Up" || faceLocation.y >= 0.5)));

		if (isMergingSlab) {
			block.setPermutation(block.permutation.withState("kado:double", true));
			block.setWaterlogged(false);
			wasActionTaken = true;
		}

		// Fallback to regular placement logic if no merging occurred
		if (!wasActionTaken) {
			const adjacentBlock = block.getSide(blockFace);
			if (adjacentBlock && (adjacentBlock.isAir || adjacentBlock.isLiquid)) {
				let newSlabState;
				if (blockFace === "Up" || blockFace === "Down") {
					newSlabState = blockFace === "Up" ? "bottom" : "top";
				} else {
					newSlabState = faceLocation.y >= 0.5 ? "top" : "bottom";
				}
				adjacentBlock.setPermutation(
					adjacentBlock.permutation
						.withType(selectedItem.typeId)
						.withState("minecraft:vertical_half", newSlabState)
						.withState("kado:double", false)
				);
				wasActionTaken = true;
			}
		}

		if (wasActionTaken) {
			if (player.getGameMode() !== "creative") {
				if (selectedItem.amount > 1) {
					selectedItem.amount--;
					equipment.setEquipment("Mainhand", selectedItem);
				} else if (selectedItem.amount === 1) {
					equipment.setEquipment("Mainhand", undefined);
				}
			}
			player.playSound("use.stone");
		}
	},

	catch(error) {
		console.warn(`[Slab Behavior] An error occurred: ${error.message}`);
	},
};
// --- Subscriptions ---
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	// Register the custom block component
	blockComponentRegistry.registerCustomComponent(
		"kado:slab_behavior",
		slabBlockComponent
	);
	// Subscribe to the onItemUseOn event for general slab behavior
	world.beforeEvents.itemUse.subscribe((event) =>
		slabBlockComponent.onItemUseOn(event)
	);
});
