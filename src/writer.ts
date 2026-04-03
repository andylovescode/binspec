import { Type } from "./mod.ts"

export class TypefileWriter {
	types: Type[] = []

	addType(type: Type): void {
		if (this.types.map((it) => it.name).includes(type.name)) {
			return
		}

		this.types.push(type)

		for (const sub of type.references) {
			this.addType(sub)
		}
	}

	getTypeParseName(type: Type): string {
		return `parse${type.name}`
	}
	getTypeWriteName(type: Type): string {
		return `write${type.name}`
	}

	write(): string {
		const lines: string[] = []

		lines.push(
			`type IO = { ptr: number; buffer: Uint8Array; dataView: DataView; littleEndian: boolean }`,
		)

		lines.push(
			`function createIOContext(buffer: Uint8Array = new Uint8Array(10000)): IO {`,
		)
		lines.push(
			`return { ptr: 0, buffer, dataView: new DataView(buffer.buffer), littleEndian: true }`,
		)
		lines.push(`}`)

		for (const type of this.types) {
			lines.push("", "/*", `\t${type.name}`, "*/")

			lines.push(`export type ${type.name} = ${type.createType()};`)

			lines.push(
				`export function ${
					this.getTypeParseName(type)
				}(parseInput: IO | Uint8Array): ${type.name} {`,
			)

			lines.push(
				`const context = parseInput instanceof Uint8Array ? createIOContext(parseInput) : parseInput`,
			)

			const ctx = {
				getTypeParseName: this.getTypeParseName.bind(this),
				getTypeWriteName: this.getTypeWriteName.bind(this),
				contextName: "context",
				skip(n: number): string {
					if (n === 1) return `(${this.contextName}.ptr++)`
					return `((${this.contextName}.ptr += ${n}) - ${n})`
				},
			}

			lines.push(
				...type.createParser(ctx),
			)

			lines.push(`}`)

			lines.push(
				`export function ${
					this.getTypeWriteName(type)
				}(val: ${type.name}, context: IO = createIOContext()): Uint8Array {`,
			)

			lines.push(...type.createWriter(ctx))

			lines.push(`return context.buffer.slice(0,context.ptr)`)

			lines.push(`}`)
		}

		return lines.join("\n")
	}
}
