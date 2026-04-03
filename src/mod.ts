import { cliMain } from "./cli.ts"

/**
 * An internal helper passed to Type to make life easier
 */
export type IOContext = {
	getTypeParseName(ty: Type): string
	getTypeWriteName(ty: Type): string
	contextName: string
	skip(number: number): string
}

/**
 * A type to be generated
 */
export interface Type {
	/**
	 * A user-friendly type name
	 */
	name: string

	/**
	 * @param props the helper context
	 * @returns the code used to parse the type
	 */
	createParser(props: IOContext): string[]
	/**
	 * @param props the helper context
	 * @returns the code used to print the type
	 */
	createWriter(props: IOContext): string[]

	/**
	 * The types required to parse and print this type correctly
	 */
	references: Type[]

	/**
	 * @returns the typescript type definiton for the type
	 */
	createType(): string
}

export * from "./types.ts"

if (import.meta.main) {
	await cliMain()
}
