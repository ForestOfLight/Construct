export class Vector {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static magnitude(vec) {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    }

    static normalize(vec) {
        const l = Vector.magnitude(vec); return new Vector(vec.x / l, vec.y / l, vec.z / l);
    }

    static cross(a, b) {
        return new Vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    
    static dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static angleBetween(a, b) {
        return Math.acos(Vector.dot(a, b) / (Vector.magnitude(a) * Vector.magnitude(b)));
    }

    static subtract(a, b) {
        return new Vector(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    static add(a, b) {
        return new Vector(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    static floor(vec) {
        return new Vector(Math.floor(vec.x), Math.floor(vec.y), Math.floor(vec.z));
    }

    static multiply(vec, num) {
        if (typeof num === "number")
            return new Vector(vec.x * num, vec.y * num, vec.z * num);
        return new Vector(vec.x * num.x, vec.y * num.y, vec.z * num.z);
    }

    static volume(a, b) {
        return Math.abs((a.x - b.x) * (a.y - b.y) * (a.z - b.z));
    }

    static projection(a, b) {
        const scale = Vector.dot(a, b) / (b.x * b.x + b.y * b.y + b.z * b.z);
        return new Vector(b.x * scale, b.y * scale, b.z * scale);
    }

    static rejection(a, b) {
        const scale = Vector.dot(a, b) / (b.x * b.x + b.y * b.y + b.z * b.z);
        return new Vector(a.x - b.x * scale, a.y - b.y * scale, a.z - b.z * scale);
    }

    static reflect(v, n) {
        const scale = 2 * Vector.dot(v, n);
        return new Vector(v.x - n.x * scale, v.y - n.y * scale, v.z - n.z * scale);
    }

    static lerp(a, b, t) {
        return new Vector(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    }

    static distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    static intersect(maxA, minA, maxB, minB) {
        return (maxA.x >= minB.x && minA.x <= maxB.x) &&
            (maxA.y >= minB.y && minA.y <= maxB.y) &&
            (maxA.z >= minB.z && minA.z <= maxB.z);
    }

    static from(object) {
        if (object instanceof Vector)
            return object;
        if (Array.isArray(object))
            return new Vector(object[0], object[1], object[2]);
        const { x = 0, y = 0, z = 0 } = object ?? {};
        return new Vector(x, y, z);
    }

    static sort(vec1, vec2) {
        const [x1, x2] = vec1.x < vec2.x ? [vec1.x, vec2.x] : [vec2.x, vec1.x];
        const [y1, y2] = vec1.y < vec2.y ? [vec1.y, vec2.y] : [vec2.y, vec1.y];
        const [z1, z2] = vec1.z < vec2.z ? [vec1.z, vec2.z] : [vec2.z, vec1.z];
        return [new Vector(x1, y1, z1), new Vector(x2, y2, z2)];
    }

    distance(vec) { return Vector.distance(this, vec); }
    lerp(vec, t) { return Vector.lerp(this, vec, t); }
    projection(vec) { return Vector.projection(this, vec); }
    reflect(vec) { return Vector.reflect(this, vec); }
    rejection(vec) { return Vector.rejection(this, vec); }
    cross(vec) { return Vector.cross(this, vec); }
    dot(vec) { return Vector.dot(this, vec); }
    floor() { return Vector.floor(this); }
    volume(vec) { return Vector.volume(this, vec); }
    add(vec) { return Vector.add(this, vec); }
    subtract(vec) { return Vector.subtract(this, vec); }
    multiply(num) { return Vector.multiply(this, num); }

    set(x, y, z) {
        this.x = x;
        this.y = y; 
        this.z = z;
        return this;
    }

    setFrom(vec) {
        this.x = vec.x;
        this.y = vec.y;
        this.z = vec.z;
        return this;
    }
    
    addInPlace(vec) {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }
    
    subtractInPlace(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        return this;
    }
    
    floorInPlace() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }

    multiplyInPlace(num) {
        if (typeof num === "number") {
            this.x *= num; this.y *= num; this.z *= num;
            return this;
        }
        this.x *= num.x; this.y *= num.y; this.z *= num.z;
        return this;
    }

    get length() { return Vector.magnitude(this); }
    get normalized() { return Vector.normalize(this); }
    toString() { return `<${this.x}, ${this.y}, ${this.z}>`; }
}

Vector.up = Object.freeze(new Vector(0, 1, 0));
Vector.down = Object.freeze(new Vector(0, -1, 0));
Vector.north = Object.freeze(new Vector(0, 0, -1));
Vector.south = Object.freeze(new Vector(0, 0, 1));
Vector.east = Object.freeze(new Vector(1, 0, 0));
Vector.west = Object.freeze(new Vector(-1, 0, 0));
Vector.zero = Object.freeze(new Vector(0, 0, 0));
