// Creates the shared Inngest client used to publish events and register workflows.

import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "ticketing-system" });
