import { eofArray } from "@andylovescode/binspec"
import { bitmask, enumerated, f64, struct, u64 } from "../src/types.ts"

const testBitmask = bitmask("TestingBitmask")
	.field("a", 0b00000001)
	.field("b", 0b00000010)
	.field("c", 0b00000100)
	.field("d", 0b00001000)
	.field("e", 0b00010000)
	.field("f", 0b00100000)
	.field("g", 0b01000000)
	.field("h", 0b10000000)

const pingUnix = struct("PingUnix")
	.field("timestampNs", u64())
	.field("bmask", testBitmask)

// don't do this in production, this is a dumb way of notating time
const pingSecondsSince2000 = struct("PingSecondsSince2000")
	.field("secondsSince2000", f64())

const ping = enumerated("Ping")
	.variant(0, pingUnix)
	.variant(420, pingSecondsSince2000)

const packetBuffer = eofArray(ping)

export default [packetBuffer]
