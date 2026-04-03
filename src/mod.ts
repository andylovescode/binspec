import { cliMain } from "./cli.ts"

export type Parse = { ptr: number; buffer: Uint8Array; dataView: DataView }
export type IOContext = {
	getTypeParseName(ty: Type): string
	getTypeWriteName(ty: Type): string
	contextName: string
	skip(number: number): string
}

export interface Type {
	name: string
	createParser(props: IOContext): string[]
	createWriter(props: IOContext): string[]

	references: Type[]
	createType(): string
}

export * from "./types.ts"

if (import.meta.main) {
	await cliMain()
}
