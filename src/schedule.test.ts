import { verifySchedule } from "./schedule";

const errors = verifySchedule();
if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("schedule ok");
