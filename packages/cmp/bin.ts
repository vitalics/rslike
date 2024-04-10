import "./src/globals";
import { equals } from "./src/utils";

equals(
  {
    [Symbol.equals]() {
      return 4;
    },
  },
  {},
);
