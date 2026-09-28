// npm builds each package's tarball from its own directory, so `prepack`
// copies the root LICENSE in. The copies are gitignored.
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

copyFileSync(resolve(import.meta.dirname, "../LICENSE"), resolve(process.cwd(), "LICENSE"));
