type IO = { ptr: number; buffer: Uint8Array; dataView: DataView; littleEndian: boolean }
function createIOContext(buffer: Uint8Array = new Uint8Array(10000)): IO {
return { ptr: 0, buffer, dataView: new DataView(buffer.buffer), littleEndian: true }
}

/*
	Ping
*/
export type Ping = PingUnix | PingSecondsSince2000;
export function parsePing(parseInput: IO | Uint8Array): Ping {
const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput
const sign = parseUnsigned8(context)
if (sign === 0) {
return parsePingUnix(context)
}
if (sign === 420) {
return parsePingSecondsSince2000(context)
}
throw new Error('invalid variant');
}
export function writePing(val: Ping, context: IO = createIOContext()): Uint8Array {
if (val.type === "PingUnix") {
writeUnsigned8(0,context)
writePingUnix(val,context)
}
else if (val.type === "PingSecondsSince2000") {
writeUnsigned8(420,context)
writePingSecondsSince2000(val,context)
}
else {
throw new Error('invalid variant')
}
return context.buffer.slice(0,context.ptr)
}

/*
	Unsigned8
*/
export type Unsigned8 = number;
export function parseUnsigned8(parseInput: IO | Uint8Array): Unsigned8 {
const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput
return context.dataView.getUint8((context.ptr++))
}
export function writeUnsigned8(val: Unsigned8, context: IO = createIOContext()): Uint8Array {
context.dataView.setUint8((context.ptr++),val)
return context.buffer.slice(0,context.ptr)
}

/*
	PingUnix
*/
export type PingUnix = {timestampNs:number,type:"PingUnix"};
export function parsePingUnix(parseInput: IO | Uint8Array): PingUnix {
const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput
const [timestampNs] = [parseUnsigned64(context)]
return {timestampNs,type:"PingUnix"}
}
export function writePingUnix(val: PingUnix, context: IO = createIOContext()): Uint8Array {
if (val.type !== "PingUnix") throw new Error("Expected an object with type 'PingUnix'");
writeUnsigned64(val.timestampNs, context)
return context.buffer.slice(0,context.ptr)
}

/*
	Unsigned64
*/
export type Unsigned64 = number;
export function parseUnsigned64(parseInput: IO | Uint8Array): Unsigned64 {
const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput
return Number(context.dataView.getBigUint64(((context.ptr += 8) - 8), context.littleEndian))
}
export function writeUnsigned64(val: Unsigned64, context: IO = createIOContext()): Uint8Array {
context.dataView.setBigUint64(((context.ptr += 8) - 8),BigInt(val), context.littleEndian)
return context.buffer.slice(0,context.ptr)
}

/*
	PingSecondsSince2000
*/
export type PingSecondsSince2000 = {secondsSince2000:number,type:"PingSecondsSince2000"};
export function parsePingSecondsSince2000(parseInput: IO | Uint8Array): PingSecondsSince2000 {
const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput
const [secondsSince2000] = [parseFloat64(context)]
return {secondsSince2000,type:"PingSecondsSince2000"}
}
export function writePingSecondsSince2000(val: PingSecondsSince2000, context: IO = createIOContext()): Uint8Array {
if (val.type !== "PingSecondsSince2000") throw new Error("Expected an object with type 'PingSecondsSince2000'");
writeFloat64(val.secondsSince2000, context)
return context.buffer.slice(0,context.ptr)
}

/*
	Float64
*/
export type Float64 = number;
export function parseFloat64(parseInput: IO | Uint8Array): Float64 {
const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput
return context.dataView.getFloat64(((context.ptr += 8) - 8), context.littleEndian)
}
export function writeFloat64(val: Float64, context: IO = createIOContext()): Uint8Array {
context.dataView.setFloat64(((context.ptr += 8) - 8),val, context.littleEndian)
return context.buffer.slice(0,context.ptr)
}