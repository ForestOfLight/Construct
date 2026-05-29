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
export declare namespace PROTO {
    interface Serializer<T> {
        serialize(value: T, stream: Buffer): Generator<void, void, void>;
    }
    interface Deserializer<T> {
        deserialize(stream: Buffer): Generator<void, T, void>;
    }
    interface Serializable<T> extends Serializer<T>, Deserializer<T> {
    }
    class Buffer {
        private _buffer;
        private _data_view;
        private _length;
        private _offset;
        get end(): number;
        get front(): number;
        get data_view(): DataView;
        constructor(size?: number);
        reserve(amount: number): number;
        consume(amount: number): number;
        write(byte: number): void;
        write(bytes: Uint8Array): void;
        read(): number;
        read(amount: number): Uint8Array;
        ensure_capacity(size: number): void;
        static from_uint8array(array: Uint8Array): Buffer;
        to_uint8array(): Uint8Array;
    }
    namespace MIPS {
        function is_valid(str: string): boolean;
        function serialize(stream: PROTO.Buffer): Generator<void, string, void>;
        function deserialize(str: string): Generator<void, PROTO.Buffer, void>;
    }
    const Void: PROTO.Serializable<void>;
    const Null: PROTO.Serializable<null>;
    const Undefined: PROTO.Serializable<undefined>;
    const Int8: PROTO.Serializable<number>;
    const Int16: PROTO.Serializable<number>;
    const Int32: PROTO.Serializable<number>;
    const UInt8: PROTO.Serializable<number>;
    const UInt16: PROTO.Serializable<number>;
    const UInt32: PROTO.Serializable<number>;
    const UVarInt32: PROTO.Serializable<number>;
    const VarInt32: PROTO.Serializable<number>;
    const Float32: PROTO.Serializable<number>;
    const Float64: PROTO.Serializable<number>;
    const String: PROTO.Serializable<string>;
    const Boolean: PROTO.Serializable<boolean>;
    const UInt8Array: PROTO.Serializable<Uint8Array>;
    const Date: PROTO.Serializable<Date>;
    function Object<T extends object>(s: {
        [K in keyof T]: PROTO.Serializable<T[K]>;
    }): PROTO.Serializable<T>;
    function Array<T>(s: PROTO.Serializable<T>): PROTO.Serializable<T[]>;
    function Tuple<T extends any[]>(...s: {
        [K in keyof T]: PROTO.Serializable<T[K]>;
    }): PROTO.Serializable<T>;
    function Optional<T>(s: PROTO.Serializable<T>): PROTO.Serializable<T | undefined>;
    function Map<K, V>(kS: PROTO.Serializable<K>, vS: PROTO.Serializable<V>): PROTO.Serializable<Map<K, V>>;
    function Set<V>(s: PROTO.Serializable<V>): PROTO.Serializable<Set<V>>;
    function Cached<V>(s: PROTO.Serializable<V>, depth?: number): PROTO.Serializable<V>;
}
export declare namespace NET {
    type Meta = {
        guid: string;
        signature: string;
    };
    const Meta: PROTO.Serializable<Meta>;
    export const SIGNATURE: string;
    export let FRAG_MAX: number;
    export function serialize(buffer: PROTO.Buffer, max_size?: number): Generator<void, string[], void>;
    export function deserialize(strings: string[]): Generator<void, PROTO.Buffer, void>;
    export interface EmitOptions {
        metaOverride?: Partial<Meta>;
    }
    export function emit<S>(endpoint: string, serializer: PROTO.Serializer<S>, value: NoInfer<S>, options?: EmitOptions): Generator<void, void, void>;
    export interface ListenOptions {
        filter?: (meta: Meta) => boolean;
    }
    export function listen<D>(endpoint: string, deserializer: PROTO.Deserializer<D>, callback: (value: NoInfer<D>, meta: Meta) => Generator<void, void, void>, options?: ListenOptions): () => void;
    export {};
}
export declare namespace IPC {
    /** Sends a message with `args` to `channel` */
    function send<S>(channel: string, serializer: PROTO.Serializer<S>, value: NoInfer<S>): void;
    /** Sends an `invoke` message through IPC, and expects a result asynchronously. */
    function invoke<S, D>(channel: string, serializer: PROTO.Serializer<S>, value: NoInfer<S>, deserializer: PROTO.Deserializer<D>): Promise<NoInfer<D>>;
    /** Listens to `channel`. When a new message arrives, `listener` will be called with `listener(args)`. */
    function on<D>(channel: string, deserializer: PROTO.Deserializer<D>, listener: (value: NoInfer<D>) => void): () => void;
    /** Listens to `channel` once. When a new message arrives, `listener` will be called with `listener(args)`, and then removed. */
    function once<D>(channel: string, deserializer: PROTO.Deserializer<D>, listener: (value: NoInfer<D>) => void): () => void;
    /** Adds a handler for an `invoke` IPC. This handler will be called whenever `invoke(channel, ...args)` is called */
    function handle<D, S>(channel: string, deserializer: PROTO.Deserializer<D>, serializer: PROTO.Serializer<S>, listener: (value: NoInfer<D>) => NoInfer<S>): () => void;
}
export default IPC;
