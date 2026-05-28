import { assert } from "@std/assert"
import type { IOContext, Type } from "./mod.ts"

function createNumberType(mode: "f" | "i" | "u", bits: number): Type {
	const power = Math.log2(bits)
	const bytes = bits / 8

	assert(power === Math.round(power))

	const prefix = mode === "f"
		? "Float"
		: mode === "i"
		? "Integer"
		: mode === "u"
		? "Unsigned"
		: ""

	const methodId = mode === "f"
		? "Float"
		: mode === "i"
		? "Int"
		: mode === "u"
		? "Uint"
		: ""

	const name = prefix + bits
	const bigInt = mode !== "f" && bytes > 4

	return {
		name,
		references: [],
		createType() {
			return bigInt ? "bigint" : "number"
		},
		createParser(ctx) {
			let result = `${ctx.contextName}.dataView.get`

			if (bigInt) {
				result += "Big"
			}

			result += methodId

			result += bits

			result += "("

			result += ctx.skip(bytes)

			if (bytes > 1) {
				result += `, ${ctx.contextName}.littleEndian`
			}

			result += ")"

			return ["return " + result]
		},
		createWriter(ctx) {
			let result = `${ctx.contextName}.dataView.set`

			if (bigInt) {
				result += "Big"
			}

			result += methodId

			result += bits

			result += "("

			result += ctx.skip(bytes)

			result += `,`

			result += "val"

			if (bytes > 1) {
				result += `, ${ctx.contextName}.littleEndian`
			}

			result += ")"

			return [result]
		},
	}
}

/**Unsigned 8-bit integer */
export function u8(): Type {
	return createNumberType("u", 8)
}
/**Unsigned 16-bit integer */
export function u16(): Type {
	return createNumberType("u", 16)
}
/**Unsigned 32-bit integer */
export function u32(): Type {
	return createNumberType("u", 32)
}
/**Unsigned 64-bit integer */
export function u64(): Type {
	return createNumberType("u", 64)
}

/**32-bit float */
export function f32(): Type {
	return createNumberType("f", 32)
}
/**64-bit float */
export function f64(): Type {
	return createNumberType("f", 64)
}

/**signed 16-bit integer */
export function i16(): Type {
	return createNumberType("i", 16)
}
/**signed 32-bit integer */
export function i32(): Type {
	return createNumberType("i", 32)
}
/**signed 64-bit integer */
export function i64(): Type {
	return createNumberType("i", 64)
}

/**
 * A sequence of types packed into an object
 */
export class Pack implements Type {
	name: string
	fields: [string, Type][] = []

	get references(): Type[] {
		return this.fields.map((it) => it[1])
	}

	constructor(name: string) {
		this.name = name
	}

	createParser(props: IOContext): string[] {
		const result: string[] = []

		result.push(
			`const [${this.fields.map((it) => it[0]).join(",")}] = [${
				this.fields.map((it) =>
					props.getTypeParseName(it[1]) + `(${props.contextName})`
				)
			}]`,
		)

		result.push(
			`return {type:${JSON.stringify(this.name)},${
				this.fields.map((it) => it[0]).join(",")
			}}`,
		)

		return result
	}

	createWriter(props: IOContext): string[] {
		const result: string[] = []

		result.push(
			`if (val.type !== ${
				JSON.stringify(this.name)
			}) throw new Error("Expected an object with type '${this.name}'");`,
		)

		for (const [field, type] of this.fields) {
			result.push(
				`${props.getTypeWriteName(type)}(val.${field}, ${props.contextName})`,
			)
		}

		return result
	}

	createType(): string {
		let result = "{"

		for (const [field, type] of this.fields) {
			result += `${field}:${type.name},`
		}

		result += `type:${JSON.stringify(this.name)}`

		result += `}`

		return result
	}

	/**
	 * Add a field
	 * @param name the name of the field to add
	 * @param type the type of the field to add
	 * @returns this
	 */
	field(name: string, type: Type): this {
		this.fields.push([name, type])

		return this
	}
}

/**
 * Semantically equivalent to a Rust enum, or a discriminated union
 */
export class Enum implements Type {
	name: string
	variants: [number, Pack][] = []
	signType: Type = u8()

	constructor(name: string) {
		this.name = name
	}

	get references(): Type[] {
		return [this.signType, ...this.variants.map((it) => it[1])]
	}

	/**
	 * Adds a variant to the union
	 * @param sign the number used to indicate this union variant
	 * @param struct the struct associated with said number
	 * @returns this
	 */
	variant(sign: number, struct: Pack): this {
		this.variants.push([sign, struct])
		return this
	}

	/**
	 * Represent the union variant with something other than a u8
	 * @param type the number type used to indicate variant
	 * @returns this
	 */
	prefixType(type: Type): this {
		this.signType = type
		return this
	}

	createParser(props: IOContext): string[] {
		const result: string[] = []

		result.push(
			`const sign = ${
				props.getTypeParseName(this.signType)
			}(${props.contextName})`,
		)

		for (const [sign, type] of this.variants) {
			result.push(`if (sign === ${sign}) {`)

			result.push(
				`return ${props.getTypeParseName(type)}(${props.contextName})`,
			)

			result.push(`}`)
		}

		result.push(`throw new Error('invalid variant ' + sign);`)

		return result
	}
	createWriter(props: IOContext): string[] {
		const result: string[] = []

		let isFirst = true

		for (const [sign, type] of this.variants) {
			result.push(
				`${isFirst ? "" : "else "}if (val.type === ${
					JSON.stringify(type.name)
				}) {`,
			)

			isFirst = false

			result.push(
				`${
					props.getTypeWriteName(this.signType)
				}(${sign},${props.contextName})`,
			)
			result.push(`${props.getTypeWriteName(type)}(val,${props.contextName})`)

			result.push("}")
		}

		result.push("else {")

		result.push("throw new Error('invalid variant')")

		result.push("}")

		return result
	}
	createType(): string {
		return this.variants.map((it) => it[1].name).join(" | ")
	}
}

/** Create a struct type */
export function struct(name: string): Pack {
	return new Pack(name)
}

/** Create a discriminated union/structured enum type */
export function enumerated(name: string): Enum {
	return new Enum(name)
}

/**
 * Represents a number with flags meaning certain things
 */
export class Bitmask implements Type {
	name: string

	constructor(name: string) {
		this.name = name
	}

	get references(): Type[] {
		return [this.number]
	}

	fields: [string, number][] = []
	number: Type = u8()

	withNumberType(type: Type): this {
		this.number = type
		return this
	}

	field(name: string, bits: number): this {
		this.fields.push([name, bits])
		return this
	}
	createParser(props: IOContext): string[] {
		const result: string[] = []

		result.push(
			`const num = ${
				props.getTypeParseName(this.number)
			}(${props.contextName})`,
		)

		result.push(`return {`)
		for (const [field, bits] of this.fields) {
			result.push(`${field}: (num & ${bits}) === ${bits},`)
		}
		result.push(`}`)

		return result
	}
	createWriter(props: IOContext): string[] {
		const result: string[] = []

		let num = `0`

		for (const [field, bits] of this.fields) {
			num += `| (val.${field} ? ${bits} : 0)`
		}

		result.push(
			`${props.getTypeWriteName(this.number)}(${num},${props.contextName})`,
		)

		return result
	}
	createType(): string {
		let result = `{`

		for (const [field] of this.fields) {
			result += `${field}: boolean,`
		}

		result += `}`

		return result
	}
}

/**
 * Create a bitmask type
 */
export function bitmask(name: string): Bitmask {
	return new Bitmask(name)
}

/**
 * Create an array type that reaches until EOF (breaks if not at EOF)
 */
export function eofArray(type: Type): Type {
	return {
		name: `${type.name}EofArray`,
		createParser(props: IOContext): string[] {
			const result: string[] = []

			result.push(`const result = []`)

			result.push(`while (!${props.contextName}.eof) {`)

			result.push(
				`result.push(${props.getTypeParseName(type)}(${props.contextName}))`,
			)

			result.push(`}`)

			result.push(`return result`)

			return result
		},
		createWriter(props: IOContext): string[] {
			const result: string[] = []

			result.push(`for (const item of val) {`)

			result.push(`${props.getTypeWriteName(type)}(item,${props.contextName})`)

			result.push(`}`)

			return result
		},
		createType(): string {
			return `${type.name}[]`
		},
		references: [type],
	}
}

/**
 * Create a null-terminated string type
 */
export function nullString(): Type {
	return {
		name: "NullString",
		createParser(props: IOContext): string[] {
			const result = []

			result.push(
				`const endLocation = ${props.contextName}.buffer.indexOf(0, ${props.contextName}.ptr)`,
			)

			result.push(
				`const bytes = ${props.contextName}.buffer.slice(${props.contextName}.ptr, endLocation)`,
			)

			result.push(`${props.contextName}.ptr = endLocation + 1`)

			result.push(`return new TextDecoder().decode(bytes)`)

			return result
		},
		createWriter(props: IOContext): string[] {
			const result = []

			result.push(`const bytes = new TextEncoder().encode(val)`)

			result.push(
				`${props.contextName}.buffer.set(bytes,${props.contextName}.ptr)`,
			)
			result.push(
				`${props.contextName}.buffer.set([0], ${props.contextName}.ptr + bytes.length)`,
			)
			result.push(`${props.contextName}.ptr += bytes.length + 1`)

			return result
		},
		references: [],
		createType(): string {
			return `string`
		},
	}
}

/**
 * Create the type for a varint
 * @param size The bit size of the varint
 * @returns A varint type
 */
export function varint(size: 32 | 64 = 32): Type {
	const big = size === 64
	const segment = big ? "0x7Fn" : "0x7F"
	const cont = big ? "0x80n" : "0x80"
	const n = big ? "n" : ""

	return {
		name: `Varint${size}`,
		createParser(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(`let num = 0${n}`)
			lines.push(`let pos = 0${n}`)

			lines.push("while (true) {")

			lines.push(
				`const current = ${big ? "BigInt(" : ""}${props.contextName}.buffer[${
					props.skip(1)
				}]${big ? ")" : ""}`,
			)

			lines.push(`num |= (current & ${segment}) << pos`)

			lines.push(`if (current & ${cont}) { pos += 7${n} } else break;`)

			lines.push(`}`)

			lines.push(`return num`)

			return lines
		},
		createWriter(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(`let state = val`)

			lines.push(`while (true) {`)

			lines.push(`if (state < 128) {`)
			lines.push(
				`${props.contextName}.buffer[${props.skip(1)}] = Number(state)`,
			)
			lines.push(`break`)
			lines.push(`}`)

			lines.push(
				`${props.contextName}.buffer[${
					props.skip(1)
				}] = Number((state & ${segment}) | ${cont})`,
			)
			lines.push(`state ${big ? ">>=" : ">>>="} 7${n}`)

			lines.push(`}`)

			return lines
		},
		references: [],
		createType(): string {
			if (big) {
				return "bigint"
			}
			return "number"
		},
	}
}

/**
 * @param lengthType The type used to enclude the string length
 * @returns A string type
 */
export function string(lengthType: Type = u32()): Type {
	return {
		name: "String" + lengthType.name,
		createParser(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(
				`const length = ${
					props.getTypeParseName(lengthType)
				}(${props.contextName})`,
			)

			lines.push(
				`const slice = ${props.contextName}.buffer.slice(${props.contextName}.ptr, ${props.contextName}.ptr + length)`,
			)

			lines.push(`${props.contextName}.ptr += length`)

			lines.push(`return new TextDecoder().decode(slice)`)

			return lines
		},
		createWriter(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(
				`${
					props.getTypeWriteName(lengthType)
				}(val.length,${props.contextName})`,
			)

			lines.push(`const encoded = new TextEncoder().encode(val)`)

			lines.push(
				`${props.contextName}.buffer.set(encoded, ${props.contextName}.ptr)`,
			)

			lines.push(`${props.contextName}.ptr += encoded.length`)

			return lines
		},
		references: [],
		createType(): string {
			return "string"
		},
	}
}

/**
 * @param lengthType The type used to enclude the buffer length
 * @returns A Uint8Array type
 */
export function buffer(lengthType: Type = u32()): Type {
	return {
		name: "Buffer" + lengthType.name,
		createParser(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(
				`const length = ${
					props.getTypeParseName(lengthType)
				}(${props.contextName})`,
			)

			lines.push(
				`const slice = ${props.contextName}.buffer.slice(${props.contextName}.ptr, ${props.contextName}.ptr + length)`,
			)

			lines.push(`${props.contextName}.ptr += length`)

			lines.push(`return slice`)

			return lines
		},
		createWriter(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(
				`${
					props.getTypeWriteName(lengthType)
				}(val.length,${props.contextName})`,
			)

			lines.push(
				`${props.contextName}.buffer.set(val, ${props.contextName}.ptr)`,
			)

			lines.push(`${props.contextName}.ptr += val.length`)

			return lines
		},
		references: [],
		createType(): string {
			return "Uint8Array"
		},
	}
}

/**
 * @param item The type of each item in the array
 * @param length The type used to encode the array length
 * @returns An array type
 */
export function array(item: Type, length: Type = u32()): Type {
	return {
		name: `${item.name}Array${length.name}`,
		createParser(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(
				`const length = ${
					props.getTypeParseName(length)
				}(${props.contextName})`,
			)

			lines.push(`const result = []`)

			lines.push(`for (let i = 0; i < length; i++) {`)

			lines.push(
				`result.push(${props.getTypeParseName(item)}(${props.contextName}))`,
			)

			lines.push(`}`)

			lines.push(`return result`)

			return lines
		},
		createWriter(props: IOContext): string[] {
			const lines: string[] = []

			lines.push(
				`${props.getTypeWriteName(length)}(val.length,${props.contextName})`,
			)

			lines.push(`for (const item of val) {`)
			lines.push(`${props.getTypeWriteName(item)}(item,${props.contextName})`)
			lines.push(`}`)

			return lines
		},
		references: [item, length],
		createType(): string {
			return `${item.name}[]`
		},
	}
}
