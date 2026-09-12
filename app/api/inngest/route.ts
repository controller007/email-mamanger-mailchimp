
import { serve } from "inngest/next";
import { inngest } from "@/app/_lib/inngest/client";
import { sendCampaignFunction } from "@/app/_lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendCampaignFunction],
});
