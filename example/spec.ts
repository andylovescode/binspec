import { enumerated, f32, f64, struct, u32, u64, u8 } from "../src/types.ts"

const bigTest = struct("Goober")
	.field("a", u8())
	.field("b", u32())
	.field("c", u64())
	.field("d", f64())
	.field("e", f32())

const bigTest2 = struct("Goober2")
	.field("a", u8())
	.field("b", u32())
	.field("c", u64())
	.field("d", f64())
	.field("e", f32())

const fuse = enumerated("Fused")
	.variant(12, bigTest)
	.variant(24, bigTest2)

export default [fuse]
