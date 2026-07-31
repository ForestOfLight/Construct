# RENDER BUGS

This is a list of known rendering bugs for the Block Preview Render system. Much of this data is auto-generated from mcmeta and minecraft-data, so many of these bugs will be on the data processing side. Check out the regolith filter `fetch_block_models` for the code that processes the mcmeta data and generates the model data used by the Block Preview Render system.

Keep in mind that, although we're rendering this in Bedrock edition, the render should be consistent with Java Edition, since that's where the source of the data is coming from.

Hardcoding overrides for specific blocks is not ideal, but if the mcmeta data is incomplete, then we may have to do that. If a block is missing mcmeta data, ask me if it should be hardcoded or if it should be rendered as a missing block.

~~#1 The textures for all top and bottom faces of blocks point south, instead of having the correct orientation.~~

~~#2: The sides of the bottom half of stairs are currently using the wrong uv. They are using the top half of the texture when they should be using the bottom half. Since the model is imported from mcmeta, is the data incorrect from there?~~

~~#3: The top and bottom faces of pumpkins, jack-o-lanterns, and carved pumpking spin when the block is rotated. These faces should always point north. Is this a bug in the mcmeta data, or is it a bug in the Block Preview Render system? Keep in mind that end portal frames, which use the same "cardinal_direction" & "direction" states, are currently rotate the top face correctly, but the bottom face is rotated when it shouldn't be.~~ By design, matches JE.

~~#4: Pumpkins are rendered as a white cube instead of the their texture.~~

~~#5: The texture of the top face of stairs for weirdo_direction 3 & 2 are stretched. Then the stairs are upside down, it's the bottom face that is stretched instead of the top face.~~

~~#6: end_portal blocks are rendered as a white cube. If this model/texture needs to be hardcoded, let me know.~~

~~#7: The sides of the cake texture are squished too small for the model. The model is correct, the texture is not.~~

~~#8: The top and bottom faces of pistons bases are facing 180 degrees from where they should. Check to see that an override for pistons doesn't already exist (causing them to display incorrectly).~~

~~#9: The sides of grass blocks are using a grayscale texture (dirt texture is in color, grass texture at the top is in grayscale).~~

~~#10: Other incorrectly (fully) grayscale blocks (should use "carried" texture instead): short_grass, large_fern~~

~~#11: End gateway shows a white cube.~~

~~#12 Buttons models are rotated 180 degrees from where they should be when on walls (facing_direction 2, 3, 4, 5). Levers and rails seem to have the same bug, but use different block states. Fix buttons first, then check on levers and rails.~~

~~#13: Blocks missing a texture or model render as an opaque white cube, when instead they should render as see-through blue cube. Check commit 98c129bb8d - chore: create rollback point for how missing blocks were rendered before. This makes broken block models/textures more obvious and more elegant at the same time.~~

~~#14: Flower pot is always rendered with a flower in it, even if no flower is present. Let me know if this is something that needs to be hardcoded, or if the mcmeta data is incorrect. I would like the flower pot to never show a flower in it, since bedrock doesn't store that data in the permutation.~~

~~#15: The top and bottom faces of command blocks are facing 180 degrees from where they should. Looks like it might be the same type of bug as #1, but this time the block I'm looking at's facing_direction is 5 and the top and bottom textures both point west instead of east. Seems to occur for the barrel as well, which also uses facing_direction.~~

~~#16: End gateway and end portal blocks use a black texture. Have them use the end stone texture instead. They're a special case because they use a shader instead of a texture, but the shader is not available in the data.~~

~~#17: Sides of blocks with facing_direction are rotated 180 degrees from where they should be. Not in all cases though. Command block and piston back and front faces are rotated correctly, but barrels' front and back faces are rotated incorrectly. Check to see if the mcmeta data is correct for these blocks, or if the Block Preview Render system is rotating them incorrectly.~~

~~#18: The missing block render is slightly too small so that the edges of the cube are not touching. Seems to be correct in debug mode, but not in normal mode.~~

~~#19: Redstone dust always renders as a fully-powered dot. Are there no states in the mcmeta data? If not, render it as a full-unpowered cross instead.~~

~~#20: Barrier blocks are rendered as a missing block. For blocks like these (including end stone and end gateway), we could texture them using their item texture. Check to see if the mcmeta data has a reference to the item texture, and if so, use that instead of the missing block render (or the hardcoded overrides for endstone and end gateways).~~

~~#21: Diagonal faces are modeled incorrectly in many cases. Example blocks: lecturn, tripwire hook, lever, horizontal chain, fire. Crosses like for flowers, grass, and lanterns are working correctly. The textures look to be correct in all cases.~~

~~#22: The top face texture on observers is rotated 180 degrees from where it should be. This is true for every rotation. In this case, the top face means the face that is normally on the top of the block if the front of the observer is pointing N/S/E/W.~~

~~#23: Hanging signs are rendered as a missing block in every permutation.~~

~~#24: Copper chests currently do not have a model (show up as missing), but can use the same model as a normal chest.~~

~~#25: Is there a bubble texture in the mcmeta data? If so, use that for the bubble column block instead of the water texture. Otherwise, keep the water texture.~~

~~#26: Hanging signs with states attached_bit = false and hanging = true have their chains rotated 90 degrees from where they should be. Hanging signs with states attached_bit = true and hanging = true and ground_sign_direction = 2,6,10,14 have their whole model rotated 90 degrees from where it should be.~~ A model element's own "rotation" turns right-handed about its axis, the opposite way round from the blockstate-level "y", and both were going through the same function - so every y-rotated element turned the wrong way. Only ever visible where the rotated elements aren't symmetric, which is why crosses looked fine.

~~#27: Chests are using the wrong textures for certain faces. Here's what needs to change:
- bottom texture is using the texture that should be the top texture of the chest base
- top texture is using the texture should be the bottom texture of the chest lid
- top texture of the chest base should be on the bottom of the chest base
- bottom texture of the chest lid should be on the top of the chest lid
- The front and back texture of the base are swapped. The front texture should be on the back, and the back texture should be on the front.
- On the lock, every texture is upside down.
This set of changes points to a problem with the model data.~~ It was: the shape was converted by hand from a CEM template's box-uv unwrap, whose slots are named in Java's entity model space, and that space is flipped in Y and Z against the block space this pipeline works in. Every rect in block_entity_models.json is the canonical unwrap - it was which face each one was handed to that was off.
