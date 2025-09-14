/** @format */

// Import necessary modules from Minecraft server API
import { system } from "@minecraft/server";

// This object will contain the handler for the 'onPlayerInteract' event
const slabBlockComponent = {
	// Handles all interactions with an already placed slab.
	onPlayerInteract(e) {
		// Destructure event data for easier access
		const { block, player, face } = e;

		// Get the equipment component for the player
		const equipment = player.getComponent("equippable");

		// Get the selected item from the player's mainhand
		const selectedItem = equipment.getEquipment("Mainhand");

		// Check if a valid item is being held
		if (!selectedItem) {
			return;
		}

		const verticalHalf = block.permutation.getState(
			"minecraft:vertical_half"
		);
		const isDoubleSlab = block.permutation.getState("kado:double");

		// Case 1: Merging to a double slab (clicking on the top of a bottom slab or bottom of a top slab)
		// This logic only applies if the item in hand is the same type as the block.
		const isMergingSlab =
			selectedItem.typeId === block.typeId &&
			!isDoubleSlab &&
			((verticalHalf === "bottom" && face === "Up") ||
				(verticalHalf === "top" && face === "Down"));

		if (isMergingSlab) {
			// Prevent the default action (placing a new block)
			e.cancel = true;

			// Set the block to a double slab
			block.setPermutation(block.permutation.withState("kado:double", true));

			// Remove water if the block was waterlogged
			block.setWaterlogged(false);
		}

		// Case 2: Placing a new block next to the existing slab (works for both single and double slabs)
		const isPlacingNextTo = face !== "Up" && face !== "Down";

		// This condition is separate to allow placing ANY block next to a slab
		if (isPlacingNextTo) {
			// Manually handle the placement, so cancel the default action
			e.cancel = true;

			// Get the adjacent block by calculating its location
			const blockLocation = block.location;
			const dimension = player.dimension;

			// Map the face string to a location offset
			const faceOffsets = {
				Up: { x: 0, y: 1, z: 0 },
				Down: { x: 0, y: -1, z: 0 },
				North: { x: 0, y: 0, z: -1 },
				South: { x: 0, y: 0, z: 1 },
				West: { x: -1, y: 0, z: 0 },
				East: { x: 1, y: 0, z: 0 },
			};

			const offset = faceOffsets[face];
			const adjacentLocation = {
				x: blockLocation.x + offset.x,
				y: blockLocation.y + offset.y,
				z: blockLocation.z + offset.z,
			};

			const adjacentBlock = dimension.getBlock(adjacentLocation);

			// Check if the adjacent block has valid placement conditions
			if (
				adjacentBlock &&
				(adjacentBlock.typeId === "minecraft:air" || adjacentBlock.isLiquid)
			) {
				// Set the adjacent block's type to the selected item's type
				adjacentBlock.setType(selectedItem.typeId);
			}
		}

		// If any of the above conditions were met, proceed with item reduction and sound
		if (isMergingSlab || isPlacingNextTo) {
			// Reduce item count if not in creative mode
			if (player.getGameMode() !== "creative") {
				if (selectedItem.amount > 1) {
					selectedItem.amount -= 1;
					equipment.setEquipment("Mainhand", selectedItem);
				} else if (selectedItem.amount === 1) {
					equipment.setEquipment("Mainhand", undefined); // Clear the slot
				}
			}

			// Play the stone block placement sound
			player.playSound("use.stone");
		}
	},

	catch(error) {
		// Log any errors for debugging.
		console.warn(`[Slab Behavior] An error occurred: ${error.message}`);
	},
};

// Register the custom component
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent(
		"kado:slab_behavior",
		slabBlockComponent
	);
});
