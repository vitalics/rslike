import { Option, None } from "./src/option";
import { Result } from "./src/result";

const { err, ok, result } = Result.withResolvers();

const r = new Result((res) => {
  return new Promise((r) => {
    setTimeout(() => r(res(2)), 300);
  });
});

ok(3);
async function run() {
  console.log("withResolvers:", result.valueOf());
  console.log("setTimeout:", await r.valueOf());
}

run();
