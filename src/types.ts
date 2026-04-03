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
			return "number"
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

			if (bigInt) {
				result = `Number(${result})`
			}

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

			if (bigInt) {
				result += `BigInt(val)`
			} else {
				result += `val`
			}

			if (bytes > 1) {
				result += `, ${ctx.contextName}.littleEndian`
			}

			result += ")"

			return [result]
		},
	}
}

export function u8(): Type {
	return createNumberType("u", 8)
}
export function u16(): Type {
	return createNumberType("u", 16)
}
export function u32(): Type {
	return createNumberType("u", 32)
}
export function u64(): Type {
	return createNumberType("u", 64)
}

export function f32(): Type {
	return createNumberType("f", 32)
}
export function f64(): Type {
	return createNumberType("f", 64)
}

export function i16(): Type {
	return createNumberType("i", 16)
}
export function i32(): Type {
	return createNumberType("i", 32)
}
export function i64(): Type {
	return createNumberType("i", 64)
}

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
			`return {${this.fields.map((it) => it[0]).join(",")},type:${
				JSON.stringify(this.name)
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
			result += `${field}:${type.createType()},`
		}

		result += `type:${JSON.stringify(this.name)}`

		result += `}`

		return result
	}

	field(name: string, type: Type): this {
		this.fields.push([name, type])

		return this
	}
}

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

	variant(sign: number, struct: Pack): this {
		this.variants.push([sign, struct])
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

		result.push(`throw new Error('invalid variant');`)

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

export function struct(name: string): Pack {
	return new Pack(name)
}
export function enumerated(name: string): Enum {
	return new Enum(name)
}
