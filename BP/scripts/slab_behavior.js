/** @format */

import { world } from "@minecraft/server";

// Subscribe to playerInteractWithblock event to detect if a player interacts with a block
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
	const { block, player, blockFace, itemStack } = event;

	const equipment = player.getComponent("equippable");
	if (!equipment) {
		return;
	}
	const selectedItem = equipment.getEquipment("Mainhand");
	if (!selectedItem) {
		return;
	}
	let adjacentBlock;
	let mergeIndirect;
	let mergeInteraction;
	if (
		block.typeId === selectedItem.typeId &&
		block.permutation?.getState("kado:double") &&
		(blockFace === "Up" || blockFace === "Down")
	) {
		switch (block.permutation?.getState("minecraft:vertical_half")) {
			case "top":
				mergeInteraction = blockFace === "Down" ? true : false;
				console.warn(
					`BLOCKFACE: ${blockFace} ~~~ SLAB: ${block.permutation?.getState(
						"minecraft:vertical_half"
					)}\nMERGE: ${mergeInteraction}`
				);
				break;
			case "bottom":
				mergeInteraction = blockFace === "Up" ? true : false;
				console.warn(
					`BLOCKFACE: ${blockFace} ~~~ SLAB: ${block.permutation?.getState(
						"minecraft:vertical_half"
					)}\nMERGE: ${mergeInteraction}`
				);
				break;
			default:
				console.warn(`Brokennnnn UP DOWN SECTION`);
				return;
		}
	}
	switch (blockFace) {
		case "North":
			adjacentBlock = block.north(1);
			mergeIndirect =
				adjacentBlock.typeId === selectedItem.typeId ? true : false;
			if (mergeIndirect === true) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			}
			console.warn(
				`BLOCKFACE: ${blockFace}\nMERGE-INDIRECT: ${mergeInteraction} ~~~ Adjacent block: ${adjacentBlock.typeId}`
			);
			break;
		case "East":
			adjacentBlock = block.east(1);
			mergeIndirect =
				adjacentBlock.typeId === selectedItem.typeId ? true : false;
			if (mergeIndirect === true) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			}
			break;
		case "South":
			adjacentBlock = block.south(1);
			mergeIndirect =
				adjacentBlock.typeId === selectedItem.typeId ? true : false;
			if (mergeIndirect === true) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			}
			break;
		case "West":
			adjacentBlock = block.west(1);
			mergeIndirect =
				adjacentBlock.typeId === selectedItem.typeId ? true : false;
			if (mergeIndirect === true) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			}
			break;
		case "Up":
			adjacentBlock = block.above(1);
			mergeIndirect =
				adjacentBlock.typeId === selectedItem.typeId ? true : false;
			if (mergeInteraction === true) {
				block.setPermutation(
					block.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			} else if (mergeIndirect === true) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			}
			break;
		case "Down":
			adjacentBlock = block.below(1);
			mergeIndirect =
				adjacentBlock.typeId === selectedItem.typeId ? true : false;
			if (mergeInteraction === true) {
				block.setPermutation(
					block.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			} else if (mergeIndirect === true) {
				adjacentBlock.setPermutation(
					adjacentBlock.permutation.withState("kado:double", true)
				);
				player.playSound("use.stone");
			}
			break;
		default:
			console.warn(`Brokennnnn SWITCH SECTION\n
					BLOCKFACE: ${blockFace} ~~~ SLAB: ${block.permutation?.getState(
				"minecraft:vertical_half"
			)}\nMERGE: ${mergeInteraction}`);
			return;
	}
});
