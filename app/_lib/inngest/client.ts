import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "email-manager",
  name: "Email Manager",
});

export type SendCampaignEvent = {
  name: "campaign/send";
  data: {
    campaignJobId: string;
    userId: string;
    contactListIds: string[];
    emailHistoryIds: string[];
    senderId: string;
    subject: string;
    emailBody: string;
    preheader: string;
    senderName: string;
    senderEmail: string;
    intervalSeconds: number;
    appUrl: string;
  };
};
