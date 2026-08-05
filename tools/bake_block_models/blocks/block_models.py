"""Resolves every Bedrock block state in the mapping to the list of faces
that draws it."""

from sources.fixups import corrected_java_state
from java.block_entities import resolve_block_entity
from java.blockstates import resolve_java_state
from geometry.billboard import billboard_roll, face_size
from blocks.face_reduction import (
    cull_interior_faces,
    join_coplanar_faces,
    merge_coincident_faces,
)
from blocks.stand_ins import WHITE_CUBE_FACES, stand_in_cube
from atlas.packing import flipped, tinted
from atlas.tints import state_tint

# Carried on a face only while the reduction passes need them, and taken off
# before anything downstream sees a face: the texture axes so a quad's extent
# can be measured within its own plane, and the element it came off so a
# buried face can ask whether that element is a box or a bare plane.
_TRANSIENT_FIELDS = ("uv_u", "uv_v", "element")


def build_block_models(mcmeta, b2j, atlas, stats=None):
    """Returns {bedrock_state: [face, ...]}, with faces still naming their
    textures rather than atlas rects. Adds every texture used to `atlas`, and
    accumulates into `stats` (a blocks.face_reduction.ReductionStats) if given."""
    block_models = {}
    for bedrock_state, java_state in b2j.items():
        java_block_id, properties = corrected_java_state(bedrock_state, java_state)
        elements = (resolve_java_state(mcmeta, java_block_id, properties)
                    or resolve_block_entity(java_block_id, properties))
        if not elements:
            block_models[bedrock_state] = _unresolved_block(
                mcmeta, java_block_id, properties, atlas
            )
            continue
        faces = _faces_of_elements(elements, java_block_id, properties)
        block_models[bedrock_state] = _reduce(faces, mcmeta, atlas, stats)
    return block_models


def _unresolved_block(mcmeta, java_block_id, properties, atlas):
    """The faces to draw for a block whose model gave us no geometry: a
    stand-in cube where one is honest, the missing-block cube otherwise."""
    stand_in = stand_in_cube(mcmeta, java_block_id, properties)
    if not stand_in:
        return [dict(face) for face in WHITE_CUBE_FACES]
    for face in stand_in:
        atlas.add(mcmeta, face["texture"])
    return stand_in


def _faces_of_elements(elements, java_block_id, properties):
    tint = state_tint(java_block_id, properties)
    faces = []
    for element_index, element in enumerate(elements):
        for face in element["faces"].values():
            width, height = face_size(face["extent"], face["uv_u"], face["uv_v"])
            # A quad with no area covers no pixels whatever it is textured
            # with, and Java models are full of them - the four "sides" of a
            # flat plane, every face an element's blockstate rotation
            # flattened to nothing. Dropping them here keeps them out of the
            # atlas and the face table entirely.
            if width == 0 or height == 0:
                continue
            faces.append({
                "center": face["center"],
                "width": width,
                "height": height,
                "normal": face["normal"],
                "texture": _texture_of(face, tint),
                "uv": face["uv"],
                "roll": billboard_roll(face["normal"], face["uv_v"]),
                "tintindex": face["tintindex"],
                "uv_u": face["uv_u"],
                "uv_v": face["uv_v"],
                "element": element_index,
            })
    return faces


def _texture_of(face, tint):
    texture = flipped(face["texture"], face["flip"])
    # a tintindex is Java's "this face takes the block's color"; a face
    # without one is drawn as authored, which is how the redstone dot model's
    # overlay stays out of the power ramp
    if tint and face["tintindex"] >= 0:
        texture = tinted(texture, tint)
    return texture


def _reduce(faces, mcmeta, atlas, stats):
    faces = merge_coincident_faces(faces)
    # Opacity is what says whether one face can hide another, and only the
    # atlas knows it, so the textures go in before the culling pass rather
    # than after it. A face culled below leaves its texture in the atlas
    # unused, which costs a little packed area and nothing else.
    for face in faces:
        atlas.add(mcmeta, face["texture"])
    before = len(faces)
    faces, culled = cull_interior_faces(faces, atlas)
    faces, joined = join_coplanar_faces(faces)
    _drop_transient_fields(faces)
    if stats is not None:
        stats.faces_before += before
        stats.faces_after += len(faces)
        stats.culled += culled
        stats.joined += joined
    return faces


def _drop_transient_fields(faces):
    for face in faces:
        for field in _TRANSIENT_FIELDS:
            face.pop(field, None)
