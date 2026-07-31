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

~~#19: Redstone dust always renders as a fully-powered dot. Are there no states in the mcmeta data? If not, render it as a full-unpowered cross instead.~~ No change. The dot matches JE: Java applies `redstone_dust_dot` alone when all four connection sides are `none`, which is what blocksB2J maps every `redstone_signal` to (Bedrock's permutation carries no connection data, as with the flower pot). The always-fully-powered colour was real and is fixed: `redstone_signal` maps to Java's `power=0..15`, and each level now gets its own tint. The ramp itself had to be hardcoded (`REDSTONE_POWER_TINTS` in `main.py`) because it is computed in Java's `RedStoneWireBlock` source and appears in no asset we fetch - mcmeta's assets branch carries only the grass/foliage/dry_foliage colormaps, and minecraft-data carries only the state mapping.

~~#20: Barrier blocks are rendered as a missing block. For blocks like these (including end stone and end gateway), we could texture them using their item texture. Check to see if the mcmeta data has a reference to the item texture, and if so, use that instead of the missing block render (or the hardcoded overrides for endstone and end gateways).~~ A block model that draws nothing still names a `particle` texture, and barrier's points straight at `item/barrier`. Blocks whose model resolves to no elements now render as a cube of that texture when it is an `item/` one (barrier, structure_void, all 16 light blocks - one icon per level) or the block is a fluid (water, lava, bubble_column). Everything else that resolves to nothing is a block entity whose particle is an unrelated block texture - a skull's is soul sand - so those stay missing rather than drawing a confidently wrong block; `block_entity_models.py` is where to give one a real shape. End portal and end gateway have no item texture at all, so their hardcoded end stone override stays.

~~#21: Diagonal faces are modeled incorrectly in many cases. Example blocks: lecturn, tripwire hook, lever, horizontal chain, fire. Crosses like for flowers, grass, and lanterns are working correctly. The textures look to be correct in all cases.~~ The renderer derived the direction to point each billboard by negating the normal's y. That is a reflection, not a rotation: it lands back on the face's own axis only when the normal is axis-aligned (a horizontal normal has no y to negate; a vertical one is exactly reversed, which is why those need the opposite roll handedness). For any tilted normal it gives a direction the face never pointed - for a 45-degree face, one perpendicular to the real normal - so the quad was drawn a quarter turn out of its own plane. Crosses were fine because their planes turn about y and keep a horizontal normal. The roll was then measured about that same wrong axis, which for 45-degree faces made it degenerate to 0/180. The pipeline now publishes the direction to send (`facing`) rather than leaving the renderer to re-derive it, and measures the roll against world-up flattened into the face's own plane. 722 face types across 51 blocks were affected; the other 31660 are unchanged.

#22: The top face texture on observers is rotated 180 degrees from where it should be. This is true for every rotation. In this case, the top face means the face that is normally on the top of the block if the front of the observer is pointing N/S/E/W. 

#23: Hanging signs are rendered as a missing block in every permutation.

~~#24: Every wall block renders as a missing block.~~ Not a bug - walls render fine, and I had misread the data. Exactly 1 of each wall's 162 states resolves to nothing: `wall_post_bit=0` with all four `wall_connection_type_*=none`, i.e. no post and no connections. Java draws nothing for that state either (no multipart condition applies), and a placed wall always has a post or a connection, so it never shows up.

#25: The top and bottom blocks of the door blocks don't line up. The bottom block is completely correct, but the top half is totally wrong.

#26: Copper chests currently do not have a model (show up as missing), but can use the same model as a normal chest.

#27: Is there a bubble texture in the mcmeta data? If so, use that for the bubble column block instead of the water texture. Otherwise, keep the water texture.
