/**
 * @license
 * MIT License
 *
 * Copyright (c) 2026 OmniacDev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { ScriptEventSource, system } from '@minecraft/server';
var UTIL;
(function (UTIL) {
    function generate_id() {
        const r = (Math.random() * 0x100000000) >>> 0;
        return r.toString(16).padStart(8, '0').toUpperCase();
    }
    UTIL.generate_id = generate_id;
})(UTIL || (UTIL = {}));
export var PROTO;
(function (PROTO) {
    class Buffer {
        get end() {
            return this._length + this._offset;
        }
        get front() {
            return this._offset;
        }
        get data_view() {
            return this._data_view;
        }
        constructor(size = 256) {
            this._buffer = new Uint8Array(size);
            this._data_view = new DataView(this._buffer.buffer);
            this._length = 0;
            this._offset = 0;
        }
        reserve(amount) {
            this.ensure_capacity(amount);
            const end = this.end;
            this._length += amount;
            return end;
        }
        consume(amount) {
            if (amount > this._length)
                throw new Error('not enough bytes');
            const front = this.front;
            this._length -= amount;
            this._offset += amount;
            return front;
        }
        write(input) {
            if (typeof input === 'number') {
                const offset = this.reserve(1);
                this._buffer[offset] = input;
            }
            else {
                const offset = this.reserve(input.length);
                this._buffer.set(input, offset);
            }
        }
        read(amount) {
            if (amount === undefined) {
                const offset = this.consume(1);
                return this._buffer[offset];
            }
            else {
                const offset = this.consume(amount);
                return this._buffer.slice(offset, offset + amount);
            }
        }
        ensure_capacity(size) {
            if (this.end + size > this._buffer.length) {
                const larger_buffer = new Uint8Array((this.end + size) * 2);
                larger_buffer.set(this._buffer.subarray(this._offset, this.end), 0);
                this._buffer = larger_buffer;
                this._offset = 0;
                this._data_view = new DataView(this._buffer.buffer);
            }
        }
        static from_uint8array(array) {
            const buffer = new Buffer();
            buffer._buffer = array;
            buffer._length = array.length;
            buffer._offset = 0;
            buffer._data_view = new DataView(array.buffer);
            return buffer;
        }
        to_uint8array() {
            return this._buffer.subarray(this._offset, this.end);
        }
    }
    PROTO.Buffer = Buffer;
    let MIPS;
    (function (MIPS) {
        function is_valid(str) {
            return str.startsWith('(0x') && str.endsWith(')');
        }
        MIPS.is_valid = is_valid;
        function* serialize(stream) {
            const uint8array = stream.to_uint8array();
            let str = '(0x';
            for (let i = 0; i < uint8array.length; i++) {
                const hex = uint8array[i].toString(16).padStart(2, '0').toUpperCase();
                str += hex;
                yield;
            }
            str += ')';
            return str;
        }
        MIPS.serialize = serialize;
        function* deserialize(str) {
            if (is_valid(str)) {
                const buffer = new Buffer();
                const hex_str = str.slice(3, str.length - 1);
                for (let i = 0; i < hex_str.length; i++) {
                    const hex = hex_str[i] + hex_str[++i];
                    buffer.write(parseInt(hex, 16));
                    yield;
                }
                return buffer;
            }
            return new Buffer();
        }
        MIPS.deserialize = deserialize;
    })(MIPS = PROTO.MIPS || (PROTO.MIPS = {}));
    PROTO.Void = {
        *serialize() { },
        *deserialize() { }
    };
    PROTO.Null = {
        *serialize() { },
        *deserialize() {
            return null;
        }
    };
    PROTO.Undefined = {
        *serialize() { },
        *deserialize() {
            return undefined;
        }
    };
    PROTO.Int8 = {
        *serialize(value, stream) {
            stream.data_view.setInt8(stream.reserve(1), value);
        },
        *deserialize(stream) {
            return stream.data_view.getInt8(stream.consume(1));
        }
    };
    PROTO.Int16 = {
        *serialize(value, stream) {
            stream.data_view.setInt16(stream.reserve(2), value);
        },
        *deserialize(stream) {
            return stream.data_view.getInt16(stream.consume(2));
        }
    };
    PROTO.Int32 = {
        *serialize(value, stream) {
            stream.data_view.setInt32(stream.reserve(4), value);
        },
        *deserialize(stream) {
            return stream.data_view.getInt32(stream.consume(4));
        }
    };
    PROTO.UInt8 = {
        *serialize(value, stream) {
            stream.data_view.setUint8(stream.reserve(1), value);
        },
        *deserialize(stream) {
            return stream.data_view.getUint8(stream.consume(1));
        }
    };
    PROTO.UInt16 = {
        *serialize(value, stream) {
            stream.data_view.setUint16(stream.reserve(2), value);
        },
        *deserialize(stream) {
            return stream.data_view.getUint16(stream.consume(2));
        }
    };
    PROTO.UInt32 = {
        *serialize(value, stream) {
            stream.data_view.setUint32(stream.reserve(4), value);
        },
        *deserialize(stream) {
            return stream.data_view.getUint32(stream.consume(4));
        }
    };
    PROTO.UVarInt32 = {
        *serialize(value, stream) {
            value >>>= 0;
            while (value >= 0x80) {
                stream.write((value & 0x7f) | 0x80);
                value >>>= 7;
                yield;
            }
            stream.write(value);
        },
        *deserialize(stream) {
            let value = 0;
            for (let size = 0; size < 5; size++) {
                const byte = stream.read();
                value |= (byte & 0x7f) << (size * 7);
                yield;
                if ((byte & 0x80) == 0)
                    break;
            }
            return value >>> 0;
        }
    };
    PROTO.VarInt32 = {
        *serialize(value, stream) {
            const zigzag = (value << 1) ^ (value >> 31);
            yield* PROTO.UVarInt32.serialize(zigzag, stream);
        },
        *deserialize(stream) {
            const zigzag = yield* PROTO.UVarInt32.deserialize(stream);
            return (zigzag >>> 1) ^ -(zigzag & 1);
        }
    };
    PROTO.Float32 = {
        *serialize(value, stream) {
            stream.data_view.setFloat32(stream.reserve(4), value);
        },
        *deserialize(stream) {
            return stream.data_view.getFloat32(stream.consume(4));
        }
    };
    PROTO.Float64 = {
        *serialize(value, stream) {
            stream.data_view.setFloat64(stream.reserve(8), value);
        },
        *deserialize(stream) {
            return stream.data_view.getFloat64(stream.consume(8));
        }
    };
    PROTO.String = {
        *serialize(value, stream) {
            yield* PROTO.UVarInt32.serialize(value.length, stream);
            for (let i = 0; i < value.length; i++) {
                const code = value.charCodeAt(i);
                yield* PROTO.UVarInt32.serialize(code, stream);
            }
        },
        *deserialize(stream) {
            const length = yield* PROTO.UVarInt32.deserialize(stream);
            let value = '';
            for (let i = 0; i < length; i++) {
                const code = yield* PROTO.UVarInt32.deserialize(stream);
                value += globalThis.String.fromCharCode(code);
            }
            return value;
        }
    };
    PROTO.Boolean = {
        *serialize(value, stream) {
            stream.write(value ? 1 : 0);
        },
        *deserialize(stream) {
            return stream.read() !== 0;
        }
    };
    PROTO.UInt8Array = {
        *serialize(value, stream) {
            yield* PROTO.UVarInt32.serialize(value.length, stream);
            stream.write(value);
        },
        *deserialize(stream) {
            const length = yield* PROTO.UVarInt32.deserialize(stream);
            return stream.read(length);
        }
    };
    PROTO.Date = {
        *serialize(value, stream) {
            yield* PROTO.Float64.serialize(value.getTime(), stream);
        },
        *deserialize(stream) {
            return new globalThis.Date(yield* PROTO.Float64.deserialize(stream));
        }
    };
    function Object(s) {
        return {
            *serialize(value, stream) {
                for (const key in s) {
                    yield* s[key].serialize(value[key], stream);
                }
            },
            *deserialize(stream) {
                const result = {};
                for (const key in s) {
                    result[key] = yield* s[key].deserialize(stream);
                }
                return result;
            }
        };
    }
    PROTO.Object = Object;
    function Array(s) {
        return {
            *serialize(value, stream) {
                yield* PROTO.UVarInt32.serialize(value.length, stream);
                for (const item of value) {
                    yield* s.serialize(item, stream);
                }
            },
            *deserialize(stream) {
                const result = [];
                const length = yield* PROTO.UVarInt32.deserialize(stream);
                for (let i = 0; i < length; i++) {
                    result[i] = yield* s.deserialize(stream);
                }
                return result;
            }
        };
    }
    PROTO.Array = Array;
    function Tuple(...s) {
        return {
            *serialize(value, stream) {
                for (let i = 0; i < s.length; i++) {
                    yield* s[i].serialize(value[i], stream);
                }
            },
            *deserialize(stream) {
                const result = [];
                for (let i = 0; i < s.length; i++) {
                    result[i] = yield* s[i].deserialize(stream);
                }
                return result;
            }
        };
    }
    PROTO.Tuple = Tuple;
    function Optional(s) {
        return {
            *serialize(value, stream) {
                const def = value !== undefined;
                yield* PROTO.Boolean.serialize(def, stream);
                if (def)
                    yield* s.serialize(value, stream);
            },
            *deserialize(stream) {
                const def = yield* PROTO.Boolean.deserialize(stream);
                if (def)
                    return yield* s.deserialize(stream);
                return undefined;
            }
        };
    }
    PROTO.Optional = Optional;
    function Map(kS, vS) {
        return {
            *serialize(value, stream) {
                yield* PROTO.UVarInt32.serialize(value.size, stream);
                for (const [k, v] of value) {
                    yield* kS.serialize(k, stream);
                    yield* vS.serialize(v, stream);
                }
            },
            *deserialize(stream) {
                const size = yield* PROTO.UVarInt32.deserialize(stream);
                const result = new globalThis.Map();
                for (let i = 0; i < size; i++) {
                    const k = yield* kS.deserialize(stream);
                    const v = yield* vS.deserialize(stream);
                    result.set(k, v);
                }
                return result;
            }
        };
    }
    PROTO.Map = Map;
    function Set(s) {
        return {
            *serialize(set, stream) {
                yield* PROTO.UVarInt32.serialize(set.size, stream);
                for (const v of set) {
                    yield* s.serialize(v, stream);
                }
            },
            *deserialize(stream) {
                const size = yield* PROTO.UVarInt32.deserialize(stream);
                const result = new globalThis.Set();
                for (let i = 0; i < size; i++) {
                    const v = yield* s.deserialize(stream);
                    result.add(v);
                }
                return result;
            }
        };
    }
    PROTO.Set = Set;
    function Cached(s, depth = 16) {
        const cache = new globalThis.Map();
        return {
            *serialize(value, stream) {
                const hit = cache.get(value);
                if (hit !== undefined) {
                    stream.write(hit);
                    cache.delete(value);
                    cache.set(value, hit);
                }
                else {
                    const buffer = new PROTO.Buffer();
                    yield* s.serialize(value, buffer);
                    const bytes = buffer.to_uint8array();
                    stream.write(bytes);
                    cache.set(value, bytes);
                    if (cache.size > depth) {
                        const first = cache.keys().next().value;
                        cache.delete(first);
                    }
                }
            },
            *deserialize(stream) {
                return yield* s.deserialize(stream);
            }
        };
    }
    PROTO.Cached = Cached;
})(PROTO || (PROTO = {}));
export var NET;
(function (NET) {
    const Endpoint = PROTO.String;
    const Meta = PROTO.Object({
        guid: PROTO.String,
        signature: PROTO.String
    });
    const Header = PROTO.Object({
        meta: Meta,
        index: PROTO.UVarInt32,
        final: PROTO.Boolean
    });
    const LISTENERS = new Map();
    NET.SIGNATURE = 'mcbe-ipc:v3';
    NET.FRAG_MAX = 2048;
    function* serialize(buffer, max_size = Infinity) {
        const uint8array = buffer.to_uint8array();
        const result = [];
        let acc_str = '';
        let acc_size = 0;
        for (let i = 0; i < uint8array.length; i++) {
            const char_code = uint8array[i] | (uint8array[++i] << 8);
            const utf16_size = char_code <= 0x7f ? 1 : char_code <= 0x7ff ? 2 : char_code <= 0xffff ? 3 : 4;
            const char_size = char_code > 0xff ? utf16_size : 2;
            if (acc_size + char_size > max_size) {
                result.push(acc_str);
                acc_str = '';
                acc_size = 0;
            }
            if (char_code > 0xff) {
                acc_str += String.fromCharCode(char_code);
                acc_size += utf16_size;
            }
            else {
                acc_str += char_code.toString(16).padStart(2, '0').toUpperCase();
                acc_size += 2;
            }
            yield;
        }
        result.push(acc_str);
        return result;
    }
    NET.serialize = serialize;
    function* deserialize(strings) {
        const buffer = new PROTO.Buffer();
        for (let i = 0; i < strings.length; i++) {
            const str = strings[i];
            for (let j = 0; j < str.length; j++) {
                const char_code = str.charCodeAt(j);
                if (char_code <= 0xff) {
                    const hex = str[j] + str[++j];
                    const hex_code = parseInt(hex, 16);
                    buffer.write(hex_code & 0xff);
                    buffer.write(hex_code >> 8);
                }
                else {
                    buffer.write(char_code & 0xff);
                    buffer.write(char_code >> 8);
                }
                yield;
            }
            yield;
        }
        return buffer;
    }
    NET.deserialize = deserialize;
    system.afterEvents.scriptEventReceive.subscribe(event => {
        system.runJob((function* () {
            if (event.sourceType !== ScriptEventSource.Server)
                return;
            const [serialized_endpoint, serialized_header] = event.id.split(':');
            if (!PROTO.MIPS.is_valid(serialized_endpoint))
                return;
            const endpoint_stream = yield* PROTO.MIPS.deserialize(serialized_endpoint);
            const endpoint = yield* Endpoint.deserialize(endpoint_stream);
            const listeners = LISTENERS.get(endpoint);
            if (listeners !== undefined && PROTO.MIPS.is_valid(serialized_header)) {
                const header_stream = yield* PROTO.MIPS.deserialize(serialized_header);
                const header = yield* Header.deserialize(header_stream);
                for (const listener of [...listeners]) {
                    try {
                        yield* listener(header, event.message);
                    }
                    catch (e) {
                        console.error(`[MCBE-IPC] listener error while handling packet on "${endpoint}":`, e);
                    }
                }
            }
        })());
    });
    function register(endpoint, listener) {
        let listeners = LISTENERS.get(endpoint);
        if (listeners === undefined) {
            listeners = new Array();
            LISTENERS.set(endpoint, listeners);
        }
        listeners.push(listener);
        return () => {
            const idx = listeners.indexOf(listener);
            if (idx !== -1)
                listeners.splice(idx, 1);
            if (listeners.length === 0) {
                LISTENERS.delete(endpoint);
            }
        };
    }
    function* emit(endpoint, serializer, value, options) {
        const guid = options?.metaOverride?.guid ?? UTIL.generate_id();
        const signature = options?.metaOverride?.signature ?? NET.SIGNATURE;
        const endpoint_stream = new PROTO.Buffer();
        yield* Endpoint.serialize(endpoint, endpoint_stream);
        const serialized_endpoint = yield* PROTO.MIPS.serialize(endpoint_stream);
        const packet_stream = new PROTO.Buffer();
        yield* serializer.serialize(value, packet_stream);
        const serialized_packets = yield* serialize(packet_stream, NET.FRAG_MAX);
        for (let i = 0; i < serialized_packets.length; i++) {
            const serialized_packet = serialized_packets[i];
            const header = {
                meta: { guid, signature },
                index: i,
                final: i === serialized_packets.length - 1
            };
            const header_stream = new PROTO.Buffer();
            yield* Header.serialize(header, header_stream);
            const serialized_header = yield* PROTO.MIPS.serialize(header_stream);
            system.sendScriptEvent(`${serialized_endpoint}:${serialized_header}`, serialized_packet);
        }
    }
    NET.emit = emit;
    function listen(endpoint, deserializer, callback, options) {
        const buffer = new Map();
        const listener = function* (header, fragment) {
            let packet = buffer.get(header.meta.guid);
            if (packet === undefined) {
                if (options?.filter?.(header.meta) === false)
                    return;
                packet = { size: -1, fragments: [], received: 0 };
                buffer.set(header.meta.guid, packet);
            }
            if (header.final) {
                packet.size = header.index + 1;
            }
            if (packet.fragments[header.index] === undefined) {
                packet.fragments[header.index] = fragment;
                packet.received++;
            }
            else {
                throw new Error(`received duplicate fragment ${header.index} for packet ${header.meta.guid}`);
            }
            if (packet.size !== -1 && packet.size === packet.received) {
                const stream = yield* deserialize(packet.fragments);
                const value = yield* deserializer.deserialize(stream);
                yield* callback(value, header.meta);
                buffer.delete(header.meta.guid);
            }
        };
        return register(endpoint, listener);
    }
    NET.listen = listen;
})(NET || (NET = {}));
export var IPC;
(function (IPC) {
    /** Sends a message with `args` to `channel` */
    function send(channel, serializer, value) {
        system.runJob(NET.emit(`ipc:${channel}:send`, serializer, value));
    }
    IPC.send = send;
    /** Sends an `invoke` message through IPC, and expects a result asynchronously. */
    function invoke(channel, serializer, value, deserializer) {
        const id = UTIL.generate_id();
        return new Promise(resolve => {
            const terminate = NET.listen(`ipc:${channel}:handle`, deserializer, function* (value, meta) {
                if (meta.signature.includes(`+correlation`) && meta.guid !== id)
                    return;
                resolve(value);
                terminate();
            }, {
                filter: meta => !meta.signature.includes(`+correlation`) || meta.guid === id
            });
            system.runJob(NET.emit(`ipc:${channel}:invoke`, serializer, value, {
                metaOverride: {
                    guid: id,
                    signature: `${NET.SIGNATURE}+correlation`
                }
            }));
        });
    }
    IPC.invoke = invoke;
    /** Listens to `channel`. When a new message arrives, `listener` will be called with `listener(args)`. */
    function on(channel, deserializer, listener) {
        return NET.listen(`ipc:${channel}:send`, deserializer, function* (value) {
            listener(value);
        });
    }
    IPC.on = on;
    /** Listens to `channel` once. When a new message arrives, `listener` will be called with `listener(args)`, and then removed. */
    function once(channel, deserializer, listener) {
        const terminate = NET.listen(`ipc:${channel}:send`, deserializer, function* (value) {
            listener(value);
            terminate();
        });
        return terminate;
    }
    IPC.once = once;
    /** Adds a handler for an `invoke` IPC. This handler will be called whenever `invoke(channel, ...args)` is called */
    function handle(channel, deserializer, serializer, listener) {
        return NET.listen(`ipc:${channel}:invoke`, deserializer, function* (value, meta) {
            const result = listener(value);
            yield* NET.emit(`ipc:${channel}:handle`, serializer, result, {
                metaOverride: meta.signature.includes(`+correlation`)
                    ? {
                        guid: meta.guid,
                        signature: `${NET.SIGNATURE}+correlation`
                    }
                    : undefined
            });
        });
    }
    IPC.handle = handle;
})(IPC || (IPC = {}));
export default IPC;
