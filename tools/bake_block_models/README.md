# bake_block_models

Bakes the data the textured block preview renderer draws from: one texture
atlas plus two generated JS modules, built from Java's own block model and
texture data (misode/mcmeta) and the Bedrock↔Java state mapping
(PrismarineJS/minecraft-data).

Outputs, all written in place:

- `packs/RP/textures/particle/vanilla_block_atlas.png`
- `packs/BP/scripts/blockAtlas.js`
- `packs/BP/scripts/blockModels.js`

## Running it

```
pip install -r tools/bake_block_models/requirements.txt
python tools/bake_block_models/main.py
```

It pulls ~100MB over the network, so it is a deliberate step to run when
Minecraft updates rather than something a build triggers. Regolith also runs
it as the `fetch_block_models` filter on the release profile; the only
difference there is that `ROOT_DIR` points at the project root, since a
filter's working directory is regolith's temp export.

## Tests

```
cd tools/bake_block_models && python -m unittest discover -p "test_*.py"
```

Each test file sits beside the module it covers.

## Layout

`main.py` runs the pipeline end to end and is the only file that knows the
whole shape of it. Everything else answers one question:

| Folder | Question |
| --- | --- |
| `sources/` | What does upstream say? Fetching mcmeta and blocksB2J, plus the fixups for the places blocksB2J describes a Bedrock block wrongly. |
| `java/` | What does Java's model format mean? Blockstate variants and multipart, model parent chains, and hardcoded shapes for blocks Java draws in code rather than from data. |
| `geometry/` | Where does a face sit and which way does it read? Decimal vector math, rotation, and the mapping from a Java face onto a Bedrock billboard's facing and roll. |
| `blocks/` | What faces does this block state draw? The per-state pipeline, stand-ins for blocks with no geometry, and the passes that cut the face count. |
| `atlas/` | Which pixels does a face sample? Texture packing, the tints baked into those pixels, and projection into atlas coordinates. |
| `output/` | How does the renderer read it? Deduplication into a face table, reduced lookup keys, and the files themselves. |

The pipeline runs in roughly that order, and the dependencies point the same
way: `sources` → `java` → `blocks` → `output`, with `geometry` and `atlas`
used from wherever they are needed.
