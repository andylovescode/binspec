export type IO = {
	ptr: number
	buffer: Uint8Array
	dataView: DataView
	littleEndian: boolean
	eof: boolean
}
export function createIOContext(
	buffer: Uint8Array = new Uint8Array(10000),
): IO {
	return {
		ptr: 0,
		buffer,
		dataView: new DataView(buffer.buffer),
		littleEndian: true,
		get eof() {
			return this.ptr >= this.buffer.length
		},
	}
}

/*
	PingEofArray
*/
export type PingEofArray = Ping[]
export function parsePingEofArray(parseInput: IO | Uint8Array): PingEofArray {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const result = []
	while (!context.eof) {
		result.push(parsePing(context))
	}
	return result
}
export function writePingEofArray(
	val: PingEofArray,
	context: IO = createIOContext(),
): Uint8Array {
	for (const item of val) {
		writePing(item, context)
	}
	return context.buffer.slice(0, context.ptr)
}

/*
	Ping
*/
export type Ping = PingUnix | PingSecondsSince2000
export function parsePing(parseInput: IO | Uint8Array): Ping {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const sign = parseUnsigned8(context)
	if (sign === 0) {
		return parsePingUnix(context)
	}
	if (sign === 420) {
		return parsePingSecondsSince2000(context)
	}
	throw new Error("invalid variant " + sign)
}
export function writePing(
	val: Ping,
	context: IO = createIOContext(),
): Uint8Array {
	if (val.type === "PingUnix") {
		writeUnsigned8(0, context)
		writePingUnix(val, context)
	} else if (val.type === "PingSecondsSince2000") {
		writeUnsigned8(420, context)
		writePingSecondsSince2000(val, context)
	} else {
		throw new Error("invalid variant")
	}
	return context.buffer.slice(0, context.ptr)
}

/*
	Unsigned8
*/
export type Unsigned8 = number
export function parseUnsigned8(parseInput: IO | Uint8Array): Unsigned8 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	return context.dataView.getUint8(context.ptr++)
}
export function writeUnsigned8(
	val: Unsigned8,
	context: IO = createIOContext(),
): Uint8Array {
	context.dataView.setUint8(context.ptr++, val)
	return context.buffer.slice(0, context.ptr)
}

/*
	PingUnix
*/
export type PingUnix = {
	timestampNs: Unsigned64
	bmask: TestingBitmask
	str: NullString
	vstr: StringVarint32
	varint: Varint32
	varlong: Varint64
	type: "PingUnix"
}
export function parsePingUnix(parseInput: IO | Uint8Array): PingUnix {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const [timestampNs, bmask, str, vstr, varint, varlong] = [
		parseUnsigned64(context),
		parseTestingBitmask(context),
		parseNullString(context),
		parseStringVarint32(context),
		parseVarint32(context),
		parseVarint64(context),
	]
	return { type: "PingUnix", timestampNs, bmask, str, vstr, varint, varlong }
}
export function writePingUnix(
	val: PingUnix,
	context: IO = createIOContext(),
): Uint8Array {
	if (val.type !== "PingUnix") {
		throw new Error("Expected an object with type 'PingUnix'")
	}
	writeUnsigned64(val.timestampNs, context)
	writeTestingBitmask(val.bmask, context)
	writeNullString(val.str, context)
	writeStringVarint32(val.vstr, context)
	writeVarint32(val.varint, context)
	writeVarint64(val.varlong, context)
	return context.buffer.slice(0, context.ptr)
}

/*
	Unsigned64
*/
export type Unsigned64 = number
export function parseUnsigned64(parseInput: IO | Uint8Array): Unsigned64 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	return Number(
		context.dataView.getBigUint64((context.ptr += 8) - 8, context.littleEndian),
	)
}
export function writeUnsigned64(
	val: Unsigned64,
	context: IO = createIOContext(),
): Uint8Array {
	context.dataView.setBigUint64(
		(context.ptr += 8) - 8,
		BigInt(val),
		context.littleEndian,
	)
	return context.buffer.slice(0, context.ptr)
}

/*
	TestingBitmask
*/
export type TestingBitmask = {
	a: boolean
	b: boolean
	c: boolean
	d: boolean
	e: boolean
	f: boolean
	g: boolean
	h: boolean
}
export function parseTestingBitmask(
	parseInput: IO | Uint8Array,
): TestingBitmask {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const num = parseUnsigned8(context)
	return {
		a: (num & 1) === 1,
		b: (num & 2) === 2,
		c: (num & 4) === 4,
		d: (num & 8) === 8,
		e: (num & 16) === 16,
		f: (num & 32) === 32,
		g: (num & 64) === 64,
		h: (num & 128) === 128,
	}
}
export function writeTestingBitmask(
	val: TestingBitmask,
	context: IO = createIOContext(),
): Uint8Array {
	writeUnsigned8(
		0 | (val.a ? 1 : 0) | (val.b ? 2 : 0) | (val.c ? 4 : 0) | (val.d ? 8 : 0) |
			(val.e ? 16 : 0) | (val.f ? 32 : 0) | (val.g ? 64 : 0) |
			(val.h ? 128 : 0),
		context,
	)
	return context.buffer.slice(0, context.ptr)
}

/*
	NullString
*/
export type NullString = string
export function parseNullString(parseInput: IO | Uint8Array): NullString {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const endLocation = context.buffer.indexOf(0, context.ptr)
	const bytes = context.buffer.slice(context.ptr, endLocation)
	context.ptr = endLocation + 1
	return new TextDecoder().decode(bytes)
}
export function writeNullString(
	val: NullString,
	context: IO = createIOContext(),
): Uint8Array {
	const bytes = new TextEncoder().encode(val)
	context.buffer.set(bytes, context.ptr)
	context.buffer.set([0], context.ptr + bytes.length)
	context.ptr += bytes.length + 1
	return context.buffer.slice(0, context.ptr)
}

/*
	StringVarint32
*/
export type StringVarint32 = string
export function parseStringVarint32(
	parseInput: IO | Uint8Array,
): StringVarint32 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const length = parseVarint32(context)
	const slice = context.buffer.slice(context.ptr, context.ptr + length)
	context.ptr += length
	return new TextDecoder().decode(slice)
}
export function writeStringVarint32(
	val: StringVarint32,
	context: IO = createIOContext(),
): Uint8Array {
	writeVarint32(val.length, context)
	context.buffer.set(new TextEncoder().encode(val), context.ptr)
	context.ptr += val.length
	return context.buffer.slice(0, context.ptr)
}

/*
	Varint32
*/
export type Varint32 = number
export function parseVarint32(parseInput: IO | Uint8Array): Varint32 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	let num = 0
	let pos = 0
	while (true) {
		const current = context.buffer[context.ptr++]
		if (current & 0x80) pos += 7
		num |= (current & 0x7F) << pos
		if (!(current & 0x80)) break
	}
	return num
}
export function writeVarint32(
	val: Varint32,
	context: IO = createIOContext(),
): Uint8Array {
	let state = val
	while (true) {
		if (state < 128) {
			context.buffer[context.ptr++] = Number(state)
			break
		}
		context.buffer[context.ptr++] = Number((state & 0x7F) | 0x80)
		state >>>= 7
	}
	return context.buffer.slice(0, context.ptr)
}

/*
	Varint64
*/
export type Varint64 = bigint
export function parseVarint64(parseInput: IO | Uint8Array): Varint64 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	let num = 0n
	let pos = 0n
	while (true) {
		const current = BigInt(context.buffer[context.ptr++])
		if (current & 0x80n) pos += 7n
		num |= (current & 0x7Fn) << pos
		if (!(current & 0x80n)) break
	}
	return num
}
export function writeVarint64(
	val: Varint64,
	context: IO = createIOContext(),
): Uint8Array {
	let state = val
	while (true) {
		if (state < 128) {
			context.buffer[context.ptr++] = Number(state)
			break
		}
		context.buffer[context.ptr++] = Number((state & 0x7Fn) | 0x80n)
		state >>= 7n
	}
	return context.buffer.slice(0, context.ptr)
}

/*
	PingSecondsSince2000
*/
export type PingSecondsSince2000 = {
	secondsSince2000: Float64
	type: "PingSecondsSince2000"
}
export function parsePingSecondsSince2000(
	parseInput: IO | Uint8Array,
): PingSecondsSince2000 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const [secondsSince2000] = [parseFloat64(context)]
	return { type: "PingSecondsSince2000", secondsSince2000 }
}
export function writePingSecondsSince2000(
	val: PingSecondsSince2000,
	context: IO = createIOContext(),
): Uint8Array {
	if (val.type !== "PingSecondsSince2000") {
		throw new Error("Expected an object with type 'PingSecondsSince2000'")
	}
	writeFloat64(val.secondsSince2000, context)
	return context.buffer.slice(0, context.ptr)
}

/*
	Float64
*/
export type Float64 = number
export function parseFloat64(parseInput: IO | Uint8Array): Float64 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	return context.dataView.getFloat64(
		(context.ptr += 8) - 8,
		context.littleEndian,
	)
}
export function writeFloat64(
	val: Float64,
	context: IO = createIOContext(),
): Uint8Array {
	context.dataView.setFloat64((context.ptr += 8) - 8, val, context.littleEndian)
	return context.buffer.slice(0, context.ptr)
}
