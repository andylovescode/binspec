# binspec

a binary parser-printer generator

example:

```typescript
import { enumerated, f64, struct, u64 } from "../src/types.ts"

const pingUnix = struct("PingUnix")
	.field("timestampNs", u64())

// don't do this in production, this is a dumb way of notating time
const pingSecondsSince2000 = struct("PingSecondsSince2000")
	.field("secondsSince2000", f64())

const ping = enumerated("Ping")
	.variant(0, pingUnix)
	.variant(420, pingSecondsSince2000)

export default [ping]
```

then compile it with `binspec ./example.ts ./example.gen.ts`
