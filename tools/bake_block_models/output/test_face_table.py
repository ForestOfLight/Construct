import unittest
from decimal import Decimal

from output.face_table import (
    COVERS_SIDE,
    CULL_MASK,
    FACE_ROW_WIDTH,
    NO_CULL,
    OPAQUE_SIDE,
    _cull_column,
    build_face_types_and_refs,
    flatten_face_types,
)
from blocks.neighbor_culling import CULL_DIRECTIONS

UP = 1


class FacingInTheFaceTypeTableTest(unittest.TestCase):
    def test_an_up_face_is_published_pointing_the_other_way(self):
        block_models = {"a": [{
            "center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0],
            "roll": 180, "tintindex": -1, "uv": {"x": 0, "y": 0, "w": 16, "h": 16},
        }]}
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(face_types[result["a"][0]]["facing"], [0, -1, 0])

    def test_a_diagonal_face_is_published_pointing_where_it_looks(self):
        normal = [0, Decimal("-0.707107"), Decimal("-0.707107")]
        block_models = {"a": [{
            "center": [8, 8, 8], "width": 2, "height": 10, "normal": normal,
            "roll": 0, "tintindex": -1, "uv": {"x": 0, "y": 0, "w": 16, "h": 16},
        }]}
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(face_types[result["a"][0]]["facing"], normal)


class BuildFaceTypesAndRefsTest(unittest.TestCase):
    def _face(self, center, width=16, height=16, normal=None, roll=0, tintindex=-1, uv=None):
        return {
            "center": center, "width": width, "height": height, "normal": normal or [0, 1, 0],
            "roll": roll, "tintindex": tintindex, "uv": uv or {"x": 0, "y": 0, "w": 16, "h": 16},
        }

    def test_identical_full_descriptor_across_different_blocks_gets_same_index(self):
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [self._face([8, 16, 8])],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(result["a"][0], result["b"][0])
        self.assertEqual(len(face_types), 1)

    def test_different_shapes_get_different_indices(self):
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [self._face([4, 16, 8], width=8)],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])
        self.assertEqual(len(face_types), 2)

    def test_different_uv_gets_different_indices_even_with_same_shape(self):
        block_models = {
            "a": [self._face([8, 16, 8], uv={"x": 0, "y": 0, "w": 16, "h": 16})],
            "b": [self._face([8, 16, 8], uv={"x": 16, "y": 0, "w": 16, "h": 16})],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])
        self.assertEqual(len(face_types), 2)

    def test_block_face_lists_become_flat_lists_of_plain_integers(self):
        block_models = {
            "a": [self._face([8, 16, 8]), self._face([4, 16, 8], width=8)],
        }
        _face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(result["a"], [0, 1])
        for ref in result["a"]:
            self.assertIsInstance(ref, int)

    def test_a_missing_face_never_shares_a_face_type_with_an_identical_intact_one(self):
        # both draw the same white quad, so every value they dedup on matches;
        # only the flag separates them, and merging would make an unresolved
        # face render as a normal one (or the reverse)
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [dict(self._face([8, 16, 8]), missing=True)],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])
        self.assertNotIn("missing", face_types[result["a"][0]])
        self.assertTrue(face_types[result["b"][0]]["missing"])

    def test_face_types_table_reproduces_original_face_descriptor(self):
        block_models = {
            "a": [self._face(
                [1, 2, 3], width=3, height=4, normal=[1, 0, 0], roll=90, tintindex=0,
                uv={"x": 1, "y": 2, "w": 3, "h": 4},
            )],
        }
        face_types, result = build_face_types_and_refs(block_models)
        face_type = face_types[result["a"][0]]
        self.assertEqual(face_type["center"], [1, 2, 3])
        self.assertEqual(face_type["width"], 3)
        self.assertEqual(face_type["height"], 4)
        # the table carries the direction to point the billboard, resolved
        # from the face's normal (identical to it for anything but a face
        # pointing straight up or down)
        self.assertEqual(face_type["facing"], [1, 0, 0])
        self.assertNotIn("normal", face_type)
        self.assertEqual(face_type["roll"], 90)
        self.assertEqual(face_type["tintindex"], 0)
        self.assertEqual(face_type["uv"], {"x": 1, "y": 2, "w": 3, "h": 4})

    def test_a_full_cubes_faces_carry_their_cull_into_the_table(self):
        block_models = {"a": [
            self._face([8, 16, 8]),
            self._face([8, 8, 8]),
        ]}
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(face_types[result["a"][0]]["cull"], UP)
        # a face floating in the middle of the block carries no cull at all,
        # rather than a null the renderer would have to test for
        self.assertNotIn("cull", face_types[result["a"][1]])

    def test_two_faces_alike_but_for_their_cull_stay_separate_face_types(self):
        # same quad, same texture, but one sits on the block top and one a
        # pixel below it; merging them would cull the floating one
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [self._face([8, 15, 8])],
        }
        _face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])


class FlattenFaceTypesTest(unittest.TestCase):
    """The descriptors go out as bare numbers, FACE_ROW_WIDTH to a face, and
    the renderer builds a descriptor back out of a row only for the faces a
    build draws (see FaceTable.js). These tests pin the layout the two sides
    agree on."""

    def _descriptor(self, **overrides):
        descriptor = {
            "center": [8, 16, 8], "width": 16, "height": 12,
            "facing": [0, -1, 0], "roll": 180, "tintindex": -1,
            "uv": {"x": 32, "y": 64, "w": 16, "h": 16},
        }
        descriptor.update(overrides)
        return descriptor

    def test_a_face_becomes_one_row_of_its_fields_in_order(self):
        rows, _missing = flatten_face_types([self._descriptor(cull=1)])
        self.assertEqual(rows, [
            1,            # cull
            0, -1, 0,     # facing
            8, 16, 8,     # center
            16, 12,       # width, height
            180,          # roll
            -1,           # tintindex
            32, 64, 16, 16,  # uv x, y, w, h
        ])

    def test_a_row_is_exactly_as_wide_as_the_renderer_expects(self):
        rows, _missing = flatten_face_types([self._descriptor(cull=1)])
        self.assertEqual(len(rows), FACE_ROW_WIDTH)

    def test_faces_land_at_their_own_index_times_the_row_width(self):
        rows, _missing = flatten_face_types([
            self._descriptor(cull=0), self._descriptor(cull=3), self._descriptor(cull=5),
        ])
        self.assertEqual(len(rows), 3 * FACE_ROW_WIDTH)
        for index, cull in enumerate([0, 3, 5]):
            self.assertEqual(rows[index * FACE_ROW_WIDTH], cull)

    def test_a_face_no_neighbor_can_hide_takes_the_no_cull_stand_in(self):
        # a row is bare numbers and can't leave a slot out the way the
        # descriptor left the field off; NO_CULL is not a cull index, so the
        # renderer can tell it apart and drop the field again
        rows, _missing = flatten_face_types([self._descriptor()])
        self.assertEqual(rows[0], NO_CULL)
        self.assertNotIn(NO_CULL, range(6))

    def test_missing_faces_come_back_as_indices_rather_than_a_column(self):
        rows, missing = flatten_face_types([
            self._descriptor(), self._descriptor(missing=True), self._descriptor(),
        ])
        self.assertEqual(missing, [1])
        self.assertEqual(len(rows), 3 * FACE_ROW_WIDTH)

    def test_no_missing_faces_gives_an_empty_list_not_a_row_of_flags(self):
        _rows, missing = flatten_face_types([self._descriptor(), self._descriptor()])
        self.assertEqual(missing, [])

    def test_every_field_of_a_descriptor_survives_the_flattening(self):
        # the guarantee the encoding rests on: nothing is dropped, only
        # written differently
        descriptor = self._descriptor(cull=4, missing=True)
        rows, missing = flatten_face_types([descriptor])
        rebuilt = {
            "center": rows[4:7], "width": rows[7], "height": rows[8],
            "facing": rows[1:4], "roll": rows[9], "tintindex": rows[10],
            "uv": {"x": rows[11], "y": rows[12], "w": rows[13], "h": rows[14]},
            "cull": rows[0],
            "missing": 0 in missing,
        }
        self.assertEqual(rebuilt, descriptor)


class CullColumnTest(unittest.TestCase):
    """The cull column carries the direction plus the two cover bits, since
    neither bit can be set on a face without a cull direction to begin with."""

    def test_a_face_no_neighbor_can_hide_writes_the_sentinel(self):
        self.assertEqual(_cull_column({}), NO_CULL)

    def test_the_direction_survives_the_flags(self):
        column = _cull_column({"cull": 5, "covers": True, "opaque": True})
        self.assertEqual(column & CULL_MASK, 5)
        self.assertTrue(column & COVERS_SIDE)
        self.assertTrue(column & OPAQUE_SIDE)

    def test_a_cullable_face_that_covers_nothing_carries_neither_flag(self):
        column = _cull_column({"cull": 2})
        self.assertEqual(column, 2)

    def test_every_direction_stays_distinguishable_from_the_sentinel(self):
        for cull in range(len(CULL_DIRECTIONS)):
            for covers in (False, True):
                for opaque in (False, covers):
                    column = _cull_column(
                        {"cull": cull, "covers": covers, "opaque": opaque})
                    self.assertNotEqual(column, NO_CULL)
                    self.assertEqual(column & CULL_MASK, cull)


if __name__ == "__main__":
    unittest.main()
