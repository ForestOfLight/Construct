"""Exact vector arithmetic on the Decimal coordinates the pipeline carries.

Decimal rather than float throughout: quads are compared for equality all
over the pipeline - deduplicating face types, spotting coplanar or contiguous
neighbors - and float drift would make identical geometry read as different.
"""

from decimal import Decimal

# A billboard has no world-up to orient against only when it points exactly
# along it. Anything else, however steeply tilted, still has one.
_VERTICAL_TOLERANCE = Decimal("0.999999")


def dot(a, b):
    return sum(Decimal(x) * Decimal(y) for x, y in zip(a, b))


def project(vec, axis):
    """How far `vec` reaches along the unit vector `axis`, unsigned."""
    return abs(dot(vec, axis))


def negated(vec):
    return [-Decimal(c) for c in vec]


def offset(point, axis, distance):
    return [Decimal(c) + distance * Decimal(a) for c, a in zip(point, axis)]


def flatten_into_plane(vec, normal):
    """`vec` with its component along the unit vector `normal` removed, so it
    lies in the plane `normal` is perpendicular to."""
    along = dot(vec, normal)
    return [Decimal(a) - along * Decimal(b) for a, b in zip(vec, normal)]


def is_vertical(normal):
    """Whether `normal` points straight up or straight down."""
    return abs(Decimal(normal[1])) >= _VERTICAL_TOLERANCE


def is_cardinal(normal):
    """Whether `normal` points exactly along one world axis."""
    return sorted(abs(Decimal(c)) for c in normal) == [Decimal(0), Decimal(0), Decimal(1)]
