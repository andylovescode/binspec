type IO = {
	ptr: number
	buffer: Uint8Array
	dataView: DataView
	littleEndian: boolean
}
function createIOContext(buffer: Uint8Array = new Uint8Array(10000)): IO {
	return {
		ptr: 0,
		buffer,
		dataView: new DataView(buffer.buffer),
		littleEndian: true,
	}
}

/*
	Fused
*/
export type Fused = Goober | Goober2
export function parseFused(parseInput: IO | Uint8Array): Fused {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const sign = parseUnsigned8(context)
	if (sign === 12) {
		return parseGoober(context)
	}
	if (sign === 24) {
		return parseGoober2(context)
	}
	throw new Error("invalid variant")
}
export function writeFused(
	val: Fused,
	context: IO = createIOContext(),
): Uint8Array {
	if (val.type === "Goober") {
		writeUnsigned8(12, context)
		writeGoober(val, context)
	} else if (val.type === "Goober2") {
		writeUnsigned8(24, context)
		writeGoober2(val, context)
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
	Goober
*/
export type Goober = {
	a: number
	b: number
	c: number
	d: number
	e: number
	type: "Goober"
}
export function parseGoober(parseInput: IO | Uint8Array): Goober {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const [a, b, c, d, e] = [
		parseUnsigned8(context),
		parseUnsigned32(context),
		parseUnsigned64(context),
		parseFloat64(context),
		parseFloat32(context),
	]
	return { a, b, c, d, e, type: "Goober" }
}
export function writeGoober(
	val: Goober,
	context: IO = createIOContext(),
): Uint8Array {
	if (val.type !== "Goober") {
		throw new Error("Expected an object with type 'Goober'")
	}
	writeUnsigned8(val.a, context)
	writeUnsigned32(val.b, context)
	writeUnsigned64(val.c, context)
	writeFloat64(val.d, context)
	writeFloat32(val.e, context)
	return context.buffer.slice(0, context.ptr)
}

/*
	Unsigned32
*/
export type Unsigned32 = number
export function parseUnsigned32(parseInput: IO | Uint8Array): Unsigned32 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	return context.dataView.getUint32(
		(context.ptr += 4) - 4,
		context.littleEndian,
	)
}
export function writeUnsigned32(
	val: Unsigned32,
	context: IO = createIOContext(),
): Uint8Array {
	context.dataView.setUint32((context.ptr += 4) - 4, val, context.littleEndian)
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

/*
	Float32
*/
export type Float32 = number
export function parseFloat32(parseInput: IO | Uint8Array): Float32 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	return context.dataView.getFloat32(
		(context.ptr += 4) - 4,
		context.littleEndian,
	)
}
export function writeFloat32(
	val: Float32,
	context: IO = createIOContext(),
): Uint8Array {
	context.dataView.setFloat32((context.ptr += 4) - 4, val, context.littleEndian)
	return context.buffer.slice(0, context.ptr)
}

/*
	Goober2
*/
export type Goober2 = {
	a: number
	b: number
	c: number
	d: number
	e: number
	type: "Goober2"
}
export function parseGoober2(parseInput: IO | Uint8Array): Goober2 {
	const context = parseInput instanceof Uint8Array
		? createIOContext(parseInput)
		: parseInput
	const [a, b, c, d, e] = [
		parseUnsigned8(context),
		parseUnsigned32(context),
		parseUnsigned64(context),
		parseFloat64(context),
		parseFloat32(context),
	]
	return { a, b, c, d, e, type: "Goober2" }
}
export function writeGoober2(
	val: Goober2,
	context: IO = createIOContext(),
): Uint8Array {
	if (val.type !== "Goober2") {
		throw new Error("Expected an object with type 'Goober2'")
	}
	writeUnsigned8(val.a, context)
	writeUnsigned32(val.b, context)
	writeUnsigned64(val.c, context)
	writeFloat64(val.d, context)
	writeFloat32(val.e, context)
	return context.buffer.slice(0, context.ptr)
}
