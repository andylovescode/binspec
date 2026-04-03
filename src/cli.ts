import { Command } from "@cliffy/command"
import { resolve, toFileUrl } from "@std/path"
import { TypefileWriter } from "./writer.ts"

const command = new Command()
	.name("binspec")
	.description("a binary spec compiler")
	.arguments("<input-file:string> <out-file:string>")
	.action(async (_props, file, outfile) => {
		const imported = await import(
			toFileUrl(resolve(Deno.cwd(), file)).toString()
		)
		const writer = new TypefileWriter()

		for (const type of imported.default) {
			writer.addType(type)
		}

		await Deno.writeTextFile(resolve(Deno.cwd(), outfile), writer.write())
	})

export async function cliMain(): Promise<void> {
	await command.parse(Deno.args)
}
