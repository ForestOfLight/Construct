/** @license MIT
 * AddonAPIKit - Copyright (c) 2026 ForestOfLight
 * MCBE-IPC - Copyright (c) 2026 OmniacDev
 * See LICENSE for details.
 */

// src/MCBE-IPC/ipc.js
import { ScriptEventSource, system } from "@minecraft/server";
var UTIL;
(function(UTIL2) {
  function generate_id() {
    const r = Math.random() * 4294967296 >>> 0;
    return r.toString(16).padStart(8, "0").toUpperCase();
  }
  UTIL2.generate_id = generate_id;
})(UTIL || (UTIL = {}));
var PROTO;
(function(PROTO2) {
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
        throw new Error("not enough bytes");
      const front = this.front;
      this._length -= amount;
      this._offset += amount;
      return front;
    }
    write(input) {
      if (typeof input === "number") {
        const offset = this.reserve(1);
        this._buffer[offset] = input;
      } else {
        const offset = this.reserve(input.length);
        this._buffer.set(input, offset);
      }
    }
    read(amount) {
      if (amount === void 0) {
        const offset = this.consume(1);
        return this._buffer[offset];
      } else {
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
  PROTO2.Buffer = Buffer;
  let MIPS;
  (function(MIPS2) {
    function is_valid(str) {
      return str.startsWith("(0x") && str.endsWith(")");
    }
    MIPS2.is_valid = is_valid;
    function* serialize(stream) {
      const uint8array = stream.to_uint8array();
      let str = "(0x";
      for (let i = 0; i < uint8array.length; i++) {
        const hex = uint8array[i].toString(16).padStart(2, "0").toUpperCase();
        str += hex;
        yield;
      }
      str += ")";
      return str;
    }
    MIPS2.serialize = serialize;
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
    MIPS2.deserialize = deserialize;
  })(MIPS = PROTO2.MIPS || (PROTO2.MIPS = {}));
  PROTO2.Void = {
    *serialize() {
    },
    *deserialize() {
    }
  };
  PROTO2.Null = {
    *serialize() {
    },
    *deserialize() {
      return null;
    }
  };
  PROTO2.Undefined = {
    *serialize() {
    },
    *deserialize() {
      return void 0;
    }
  };
  PROTO2.Int8 = {
    *serialize(value, stream) {
      stream.data_view.setInt8(stream.reserve(1), value);
    },
    *deserialize(stream) {
      return stream.data_view.getInt8(stream.consume(1));
    }
  };
  PROTO2.Int16 = {
    *serialize(value, stream) {
      stream.data_view.setInt16(stream.reserve(2), value);
    },
    *deserialize(stream) {
      return stream.data_view.getInt16(stream.consume(2));
    }
  };
  PROTO2.Int32 = {
    *serialize(value, stream) {
      stream.data_view.setInt32(stream.reserve(4), value);
    },
    *deserialize(stream) {
      return stream.data_view.getInt32(stream.consume(4));
    }
  };
  PROTO2.UInt8 = {
    *serialize(value, stream) {
      stream.data_view.setUint8(stream.reserve(1), value);
    },
    *deserialize(stream) {
      return stream.data_view.getUint8(stream.consume(1));
    }
  };
  PROTO2.UInt16 = {
    *serialize(value, stream) {
      stream.data_view.setUint16(stream.reserve(2), value);
    },
    *deserialize(stream) {
      return stream.data_view.getUint16(stream.consume(2));
    }
  };
  PROTO2.UInt32 = {
    *serialize(value, stream) {
      stream.data_view.setUint32(stream.reserve(4), value);
    },
    *deserialize(stream) {
      return stream.data_view.getUint32(stream.consume(4));
    }
  };
  PROTO2.UVarInt32 = {
    *serialize(value, stream) {
      value >>>= 0;
      while (value >= 128) {
        stream.write(value & 127 | 128);
        value >>>= 7;
        yield;
      }
      stream.write(value);
    },
    *deserialize(stream) {
      let value = 0;
      for (let size = 0; size < 5; size++) {
        const byte = stream.read();
        value |= (byte & 127) << size * 7;
        yield;
        if ((byte & 128) == 0)
          break;
      }
      return value >>> 0;
    }
  };
  PROTO2.VarInt32 = {
    *serialize(value, stream) {
      const zigzag = value << 1 ^ value >> 31;
      yield* PROTO2.UVarInt32.serialize(zigzag, stream);
    },
    *deserialize(stream) {
      const zigzag = yield* PROTO2.UVarInt32.deserialize(stream);
      return zigzag >>> 1 ^ -(zigzag & 1);
    }
  };
  PROTO2.Float32 = {
    *serialize(value, stream) {
      stream.data_view.setFloat32(stream.reserve(4), value);
    },
    *deserialize(stream) {
      return stream.data_view.getFloat32(stream.consume(4));
    }
  };
  PROTO2.Float64 = {
    *serialize(value, stream) {
      stream.data_view.setFloat64(stream.reserve(8), value);
    },
    *deserialize(stream) {
      return stream.data_view.getFloat64(stream.consume(8));
    }
  };
  PROTO2.String = {
    *serialize(value, stream) {
      yield* PROTO2.UVarInt32.serialize(value.length, stream);
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        yield* PROTO2.UVarInt32.serialize(code, stream);
      }
    },
    *deserialize(stream) {
      const length = yield* PROTO2.UVarInt32.deserialize(stream);
      let value = "";
      for (let i = 0; i < length; i++) {
        const code = yield* PROTO2.UVarInt32.deserialize(stream);
        value += globalThis.String.fromCharCode(code);
      }
      return value;
    }
  };
  PROTO2.Boolean = {
    *serialize(value, stream) {
      stream.write(value ? 1 : 0);
    },
    *deserialize(stream) {
      return stream.read() !== 0;
    }
  };
  PROTO2.UInt8Array = {
    *serialize(value, stream) {
      yield* PROTO2.UVarInt32.serialize(value.length, stream);
      stream.write(value);
    },
    *deserialize(stream) {
      const length = yield* PROTO2.UVarInt32.deserialize(stream);
      return stream.read(length);
    }
  };
  PROTO2.Date = {
    *serialize(value, stream) {
      yield* PROTO2.Float64.serialize(value.getTime(), stream);
    },
    *deserialize(stream) {
      return new globalThis.Date(yield* PROTO2.Float64.deserialize(stream));
    }
  };
  function Object2(s) {
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
  PROTO2.Object = Object2;
  function Array2(s) {
    return {
      *serialize(value, stream) {
        yield* PROTO2.UVarInt32.serialize(value.length, stream);
        for (const item of value) {
          yield* s.serialize(item, stream);
        }
      },
      *deserialize(stream) {
        const result = [];
        const length = yield* PROTO2.UVarInt32.deserialize(stream);
        for (let i = 0; i < length; i++) {
          result[i] = yield* s.deserialize(stream);
        }
        return result;
      }
    };
  }
  PROTO2.Array = Array2;
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
  PROTO2.Tuple = Tuple;
  function Optional(s) {
    return {
      *serialize(value, stream) {
        const def = value !== void 0;
        yield* PROTO2.Boolean.serialize(def, stream);
        if (def)
          yield* s.serialize(value, stream);
      },
      *deserialize(stream) {
        const def = yield* PROTO2.Boolean.deserialize(stream);
        if (def)
          return yield* s.deserialize(stream);
        return void 0;
      }
    };
  }
  PROTO2.Optional = Optional;
  function Map2(kS, vS) {
    return {
      *serialize(value, stream) {
        yield* PROTO2.UVarInt32.serialize(value.size, stream);
        for (const [k, v] of value) {
          yield* kS.serialize(k, stream);
          yield* vS.serialize(v, stream);
        }
      },
      *deserialize(stream) {
        const size = yield* PROTO2.UVarInt32.deserialize(stream);
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
  PROTO2.Map = Map2;
  function Set(s) {
    return {
      *serialize(set, stream) {
        yield* PROTO2.UVarInt32.serialize(set.size, stream);
        for (const v of set) {
          yield* s.serialize(v, stream);
        }
      },
      *deserialize(stream) {
        const size = yield* PROTO2.UVarInt32.deserialize(stream);
        const result = new globalThis.Set();
        for (let i = 0; i < size; i++) {
          const v = yield* s.deserialize(stream);
          result.add(v);
        }
        return result;
      }
    };
  }
  PROTO2.Set = Set;
  function Cached(s, depth = 16) {
    const cache = new globalThis.Map();
    return {
      *serialize(value, stream) {
        const hit = cache.get(value);
        if (hit !== void 0) {
          stream.write(hit);
          cache.delete(value);
          cache.set(value, hit);
        } else {
          const buffer = new PROTO2.Buffer();
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
  PROTO2.Cached = Cached;
})(PROTO || (PROTO = {}));
var NET;
(function(NET2) {
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
  const LISTENERS = /* @__PURE__ */ new Map();
  NET2.SIGNATURE = "mcbe-ipc:v3";
  NET2.FRAG_MAX = 2048;
  function* serialize(buffer, max_size = Infinity) {
    const uint8array = buffer.to_uint8array();
    const result = [];
    let acc_str = "";
    let acc_size = 0;
    for (let i = 0; i < uint8array.length; i++) {
      const char_code = uint8array[i] | uint8array[++i] << 8;
      const utf16_size = char_code <= 127 ? 1 : char_code <= 2047 ? 2 : char_code <= 65535 ? 3 : 4;
      const char_size = char_code > 255 ? utf16_size : 2;
      if (acc_size + char_size > max_size) {
        result.push(acc_str);
        acc_str = "";
        acc_size = 0;
      }
      if (char_code > 255) {
        acc_str += String.fromCharCode(char_code);
        acc_size += utf16_size;
      } else {
        acc_str += char_code.toString(16).padStart(2, "0").toUpperCase();
        acc_size += 2;
      }
      yield;
    }
    result.push(acc_str);
    return result;
  }
  NET2.serialize = serialize;
  function* deserialize(strings) {
    const buffer = new PROTO.Buffer();
    for (let i = 0; i < strings.length; i++) {
      const str = strings[i];
      for (let j = 0; j < str.length; j++) {
        const char_code = str.charCodeAt(j);
        if (char_code <= 255) {
          const hex = str[j] + str[++j];
          const hex_code = parseInt(hex, 16);
          buffer.write(hex_code & 255);
          buffer.write(hex_code >> 8);
        } else {
          buffer.write(char_code & 255);
          buffer.write(char_code >> 8);
        }
        yield;
      }
      yield;
    }
    return buffer;
  }
  NET2.deserialize = deserialize;
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    system.runJob((function* () {
      if (event.sourceType !== ScriptEventSource.Server)
        return;
      const [serialized_endpoint, serialized_header] = event.id.split(":");
      if (!PROTO.MIPS.is_valid(serialized_endpoint))
        return;
      const endpoint_stream = yield* PROTO.MIPS.deserialize(serialized_endpoint);
      const endpoint = yield* Endpoint.deserialize(endpoint_stream);
      const listeners = LISTENERS.get(endpoint);
      if (listeners !== void 0 && PROTO.MIPS.is_valid(serialized_header)) {
        const header_stream = yield* PROTO.MIPS.deserialize(serialized_header);
        const header = yield* Header.deserialize(header_stream);
        for (const listener of [...listeners]) {
          try {
            yield* listener(header, event.message);
          } catch (e) {
            console.error(`[MCBE-IPC] listener error while handling packet on "${endpoint}":`, e);
          }
        }
      }
    })());
  });
  function register(endpoint, listener) {
    let listeners = LISTENERS.get(endpoint);
    if (listeners === void 0) {
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
    const signature = options?.metaOverride?.signature ?? NET2.SIGNATURE;
    const endpoint_stream = new PROTO.Buffer();
    yield* Endpoint.serialize(endpoint, endpoint_stream);
    const serialized_endpoint = yield* PROTO.MIPS.serialize(endpoint_stream);
    const packet_stream = new PROTO.Buffer();
    yield* serializer.serialize(value, packet_stream);
    const serialized_packets = yield* serialize(packet_stream, NET2.FRAG_MAX);
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
  NET2.emit = emit;
  function listen(endpoint, deserializer, callback, options) {
    const buffer = /* @__PURE__ */ new Map();
    const listener = function* (header, fragment) {
      let packet = buffer.get(header.meta.guid);
      if (packet === void 0) {
        if (options?.filter?.(header.meta) === false)
          return;
        packet = { size: -1, fragments: [], received: 0 };
        buffer.set(header.meta.guid, packet);
      }
      if (header.final) {
        packet.size = header.index + 1;
      }
      if (packet.fragments[header.index] === void 0) {
        packet.fragments[header.index] = fragment;
        packet.received++;
      } else {
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
  NET2.listen = listen;
})(NET || (NET = {}));
var IPC;
(function(IPC2) {
  function send(channel, serializer, value) {
    system.runJob(NET.emit(`ipc:${channel}:send`, serializer, value));
  }
  IPC2.send = send;
  function invoke(channel, serializer, value, deserializer) {
    const id = UTIL.generate_id();
    return new Promise((resolve) => {
      const terminate = NET.listen(`ipc:${channel}:handle`, deserializer, function* (value2, meta) {
        if (meta.signature.includes(`+correlation`) && meta.guid !== id)
          return;
        resolve(value2);
        terminate();
      }, {
        filter: (meta) => !meta.signature.includes(`+correlation`) || meta.guid === id
      });
      system.runJob(NET.emit(`ipc:${channel}:invoke`, serializer, value, {
        metaOverride: {
          guid: id,
          signature: `${NET.SIGNATURE}+correlation`
        }
      }));
    });
  }
  IPC2.invoke = invoke;
  function on(channel, deserializer, listener) {
    return NET.listen(`ipc:${channel}:send`, deserializer, function* (value) {
      listener(value);
    });
  }
  IPC2.on = on;
  function once(channel, deserializer, listener) {
    const terminate = NET.listen(`ipc:${channel}:send`, deserializer, function* (value) {
      listener(value);
      terminate();
    });
    return terminate;
  }
  IPC2.once = once;
  function handle(channel, deserializer, serializer, listener) {
    return NET.listen(`ipc:${channel}:invoke`, deserializer, function* (value, meta) {
      const result = listener(value);
      yield* NET.emit(`ipc:${channel}:handle`, serializer, result, {
        metaOverride: meta.signature.includes(`+correlation`) ? {
          guid: meta.guid,
          signature: `${NET.SIGNATURE}+correlation`
        } : void 0
      });
    });
  }
  IPC2.handle = handle;
})(IPC || (IPC = {}));

// src/Errors/APIErrorEnum.js
var APIErrorEnum = Object.freeze({
  Unknown: 0,
  Success: 1,
  Caller: 2,
  Server: 3
});

// src/Errors/APICallerError.js
var APICallerError = class extends Error {
  constructor(error) {
    const message = error.name + ": " + error.message;
    super(message);
    this.thrownError = error;
    this.errorCode = APIErrorEnum.Caller;
    this.name = "APICallerError";
  }
};

// src/Errors/APIServerError.js
var APIServerError = class extends Error {
  constructor(error) {
    const message = error.name + ": " + error.message;
    super(message);
    this.thrownError = error;
    this.errorCode = APIErrorEnum.Server;
    this.name = "APIServerError";
  }
};

// src/Errors/APIVersionMismatchError.js
var APIVersionMismatchError = class extends Error {
  constructor(serverApiVersion, callerApiVersion) {
    super(`API version numbers do not match (${callerApiVersion} != ${serverApiVersion}). Please use API version ${serverApiVersion}.`);
    this.name = "APIVersionMismatchError";
  }
};

// src/APIModels.js
var VoidModel = PROTO.Void;
var ErrorModel = PROTO.Optional(PROTO.Object({
  code: PROTO.Int8,
  name: PROTO.Optional(PROTO.String),
  message: PROTO.Optional(PROTO.String)
}));
var ReturnModelShell = {
  apiVersion: PROTO.String,
  data: void 0,
  error: ErrorModel
};
var CallModelShell = {
  apiVersion: PROTO.String,
  parameterMap: void 0
};
var EndpointModel = PROTO.String;
var EndpointsModel = PROTO.Array(EndpointModel);

// src/APIController.js
var APIController = class {
  #endpoints = {};
  get endpoints() {
    return this.#endpoints;
  }
  addEndpoint(endpoint, callback, parameterModel, returnModel) {
    this.#endpoints[endpoint] = { callback, parameterModel, returnModel };
  }
};

// src/EndpointsController.js
var EndpointsController = class extends APIController {
  #api;
  constructor(api) {
    super();
    this.#api = api;
    this.addEndpoint("endpoints", this.getEndpoints, VoidModel, EndpointsModel);
    this.addEndpoint("endpoints:has", this.hasEndpoint, EndpointModel, PROTO.Boolean);
  }
  getEndpoints() {
    return this.#api.endpoints;
  }
  hasEndpoint(endpoint) {
    return this.getEndpoints().includes(endpoint);
  }
};

// src/AddonAPIServer.js
var AddonAPIServer = class {
  #name;
  #version;
  #allEndpoints;
  constructor(name, version) {
    this.#name = name;
    this.#version = version;
    const endpointsController = new EndpointsController(this);
    this.setupController(endpointsController);
  }
  get name() {
    return this.#name;
  }
  get version() {
    return this.#version;
  }
  get endpointBase() {
    return this.#name + ":";
  }
  get endpoints() {
    return this.#allEndpoints;
  }
  setupController(apiController) {
    for (const [endpoint, features] of Object.entries(apiController.endpoints)) {
      const { callback, parameterModel, returnModel } = features;
      const boundCallback = callback.bind(apiController);
      this.#setupEndpoint(endpoint, boundCallback, parameterModel, returnModel);
    }
  }
  #setupEndpoint(endpoint, callback, parameterModel, returnDataModel) {
    const returnPacketModel = this.#resolveReturnModel(returnDataModel);
    const endpointPath = this.endpointBase + endpoint;
    IPC.handle(endpointPath, parameterModel, returnPacketModel, (callPacket) => {
      const apiVersion = callPacket.apiVersion;
      const parameters = Object.values(callPacket.parameterMap);
      return this.#handleCallback(apiVersion, callback, parameters);
    });
    this.#allEndpoints.push(endpointPath);
  }
  #handleCallback(apiVersion, callback, parameters) {
    try {
      this.#assertVersionsMatch(apiVersion);
      const returnValue = callback(...parameters);
      return this.#bundleReturnPacket({ code: APIErrorEnum.Success }, returnValue);
    } catch (error) {
      if (error instanceof APICallerError) {
        const errorPacket2 = this.#resolveErrorPacket(error);
        return this.#bundleReturnPacket(errorPacket2);
      }
      console.error(error);
      const apiError = new APIServerError(error);
      const errorPacket = this.#resolveErrorPacket(apiError);
      return this.#bundleReturnPacket(errorPacket);
    }
  }
  #assertVersionsMatch(versionToCheck) {
    if (versionToCheck !== this.version) {
      const apiVersionMismatchError = new APIVersionMismatchError(this.version, versionToCheck);
      throw new APICallerError(apiVersionMismatchError);
    }
  }
  #resolveReturnModel(returnDataModel) {
    let returnModel = { ...ReturnModelShell };
    returnModel.data = returnDataModel;
    returnModel = PROTO.Object(returnModel);
    return returnModel;
  }
  #bundleReturnPacket(errorPacket, returnValue = void 0) {
    return {
      apiVersion: this.version,
      data: returnValue,
      error: errorPacket
    };
  }
  #resolveErrorPacket(error) {
    return {
      code: error.errorCode,
      name: error.thrownError.name,
      message: error.thrownError.message
    };
  }
};

// src/AddonAPICaller.js
import { system as system2 } from "@minecraft/server";

// src/Errors/APIEndpointNotFoundError.js
var APIEndpointNotFoundError = class extends Error {
  constructor(endpoint) {
    super(`Endpoint "${endpoint}" was not found.`);
    this.name = "APIEndpointNotFoundError";
  }
};

// src/AddonAPICaller.js
var AddonAPICaller = class _AddonAPICaller {
  static #validEndpointCache = [];
  static async call(endpoint, parameterModel, parameterMap, returnDataModel) {
    await _AddonAPICaller.#tryPopulateEndpointCache(endpoint);
    if (_AddonAPICaller.#endpointExists(endpoint)) {
      const response = await IPC.invoke(endpoint, parameterModel, parameterMap, returnDataModel).then((result) => result.value);
      return _AddonAPICaller.#unwrapPacket(response);
    } else {
      throw new APIEndpointNotFoundError(endpoint);
    }
  }
  static async #tryPopulateEndpointCache(endpoint) {
    if (_AddonAPICaller.#validEndpointCache.length === 0) {
      const endpointBase = endpoint.split(":")[0];
      await _AddonAPICaller.#populateValidEndpointCache(endpointBase);
    }
  }
  static #endpointExists(endpoint) {
    return _AddonAPICaller.#validEndpointCache.includes(endpoint);
  }
  static async #populateValidEndpointCache(endpointBase) {
    const endpointsEndpoint = endpointBase + ":endpoints";
    const validEndpoints = await IPC.invoke(endpointsEndpoint, VoidModel, void 0, PROTO.Boolean);
    _AddonAPICaller.#validEndpointCache.push(...validEndpoints);
  }
  static #unwrapPacket(packet) {
    const { data, error } = packet;
    if (error.code === APIErrorEnum.Success)
      return data;
    else
      _AddonAPICaller.#throwAPIError(packet.error);
  }
  static #throwAPIError(errorData) {
    switch (errorData.code) {
      case APIErrorEnum.Caller:
        throw new APICallerError(errorData);
      case APIErrorEnum.Server:
        throw new APIServerError(errorData);
      case APIErrorEnum.Unknown:
      default:
        throw new Error(errorData.message);
    }
  }
};
export {
  APICallerError,
  APIController,
  APIErrorEnum,
  AddonAPICaller,
  AddonAPIServer,
  PROTO,
  VoidModel
};
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
