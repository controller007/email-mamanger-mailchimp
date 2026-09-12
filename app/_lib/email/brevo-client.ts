// app/_lib/email/brevo-client.ts
import * as SibApiV3Sdk from "@getbrevo/brevo";

const BREVO_API_KEY = process.env.BREVO_API_KEY!;

// SDK Clients
const contactsApi = new SibApiV3Sdk.ContactsApi();
contactsApi.setApiKey(SibApiV3Sdk.ContactsApiApiKeys.apiKey, BREVO_API_KEY);

const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
transactionalEmailsApi.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  BREVO_API_KEY,
);

const emailCampaignsApi = new SibApiV3Sdk.EmailCampaignsApi();
emailCampaignsApi.setApiKey(
  SibApiV3Sdk.EmailCampaignsApiApiKeys.apiKey,
  BREVO_API_KEY,
);

const sendersApi = new SibApiV3Sdk.SendersApi();
sendersApi.setApiKey(SibApiV3Sdk.SendersApiApiKeys.apiKey, BREVO_API_KEY);

// Fetch API for endpoints not in SDK
async function brevoFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.brevo.com/v3${endpoint}`, {
    ...options,
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Brevo API Error: ${response.status}`);
  }

  // Handle 204 No Content responses (empty body)
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return { success: true };
  }

  // Check if response has content before parsing
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  // Return empty object for non-JSON responses
  return { success: true };
}

class BrevoClient {
  // ==========================================
  // CONTACT LISTS
  // ==========================================

  // async deleteAllFolders() {
  //   try {
  //     const foldersResponse = await contactsApi.getFolders(50, 0);
  //     const folders = foldersResponse.body.folders || [];

  //     for (const folder of folders) {
  //       console.log("deleting folder", folder.id);

  //       await contactsApi.deleteFolder(folder.id);
  //     }

  //     console.log("All folders deleted successfully");
  //   } catch (error) {
  //     console.error("Error deleting folders:", error);
  //     throw error;
  //   }
  // }

  async createList(name: string) {
    try {
      let targetFolderId: number;

      // 1. Fetch existing folders (limit to 10 to keep it fast)
      const foldersResponse = await contactsApi.getFolders(10, 0);
      const folders = foldersResponse.body.folders || [];

      if (folders.length > 0) {
        // Sort by ID descending to get the newest one created
        const latestFolder = folders.sort(
          (a, b) => (b.id || 0) - (a.id || 0),
        )[0];
        targetFolderId = latestFolder.id!;
        console.log(
          `Using existing folder: ${latestFolder.name} (ID: ${targetFolderId})`,
        );
      } else {
        // 2. If no folders exist, create a default one
        console.log("No folders found. Creating 'General Lists' folder...");
        const createFolder = new SibApiV3Sdk.CreateUpdateFolder();
        createFolder.name = "General Lists";

        const newFolderRes = await contactsApi.createFolder(createFolder);
        targetFolderId = newFolderRes.body.id!;
      }

      // 3. Create the list in the identified folder
      const createListParams = new SibApiV3Sdk.CreateList();
      createListParams.name = name;
      createListParams.folderId = targetFolderId;

      return await contactsApi.createList(createListParams);
    } catch (error: any) {
      console.error("Error in dynamic createList:", error);
      throw error;
    }
  }

  async deleteList(listId: number) {
    return await contactsApi.deleteList(listId);
  }

  async getList(listId: number) {
    return await contactsApi.getList(listId);
  }

  async getLists(limit = 50, offset = 0) {
    return await contactsApi.getLists(limit, offset);
  }

  // ==========================================
  // CONTACT IMPORT
  // ==========================================
  async importContacts(
    contacts: Array<{ email: string; attributes?: Record<string, any> }>,
    listIds: number[],
    notifyUrl: string,
  ) {
    const requestContactImport = new SibApiV3Sdk.RequestContactImport();
    requestContactImport.jsonBody = contacts;
    requestContactImport.listIds = listIds;
    requestContactImport.notifyUrl = notifyUrl;
    requestContactImport.updateExistingContacts = true;
    requestContactImport.emptyContactsAttributes = false;

    return await contactsApi.importContacts(requestContactImport);
  }

  // ==========================================
  // CONTACTS
  // ==========================================
  async createContact(
    email: string,
    attributes?: Record<string, any>,
    listIds?: number[],
  ) {
    const createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = email;
    if (attributes) createContact.attributes = attributes;
    if (listIds) createContact.listIds = listIds;

    return await contactsApi.createContact(createContact);
  }

  async deleteContact(email: string) {
    return await contactsApi.deleteContact(email);
  }

  async getContactInfo(email: string) {
    return await contactsApi.getContactInfo(email);
  }

  async removeContactFromLists(email: string, listIds: number[]) {
    const updateContact = new SibApiV3Sdk.UpdateContact();
    updateContact.unlinkListIds = listIds;
    return await contactsApi.updateContact(email, updateContact);
  }

  // ==========================================
  // TRANSACTIONAL EMAILS
  // ==========================================
  async sendTransactionalEmail(params: {
    sender: { name: string; email: string };
    to: Array<{ email: string; name?: string }>;
    replyTo: { email: string; name?: string };
    subject: string;
    htmlContent: string;
    tags?: string[];
    params?: Record<string, any>;
  }) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = params.sender;
    sendSmtpEmail.to = params.to;
    sendSmtpEmail.replyTo = params.replyTo;
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.htmlContent;
    if (params.tags) sendSmtpEmail.tags = params.tags;
    if (params.params) sendSmtpEmail.params = params.params;

    return await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
  }

  // ==========================================
  // EMAIL CAMPAIGNS (Marketing)
  // ==========================================
  async createEmailCampaign(params: {
    name: string;
    subject: string;
    sender: { name: string; email: string };
    replyTo: { name: string; email: string };

    htmlContent: string;
    recipients: { listIds: number[] };
    scheduledAt?: string;
  }) {
    const createEmailCampaign = new SibApiV3Sdk.CreateEmailCampaign();
    createEmailCampaign.name = params.name;
    createEmailCampaign.subject = params.subject;
    createEmailCampaign.sender = params.sender;
    createEmailCampaign.replyTo = params.replyTo.email;
    createEmailCampaign.htmlContent = params.htmlContent;
    createEmailCampaign.recipients = params.recipients;
    if (params.scheduledAt)
      createEmailCampaign.scheduledAt = params.scheduledAt;

    return await emailCampaignsApi.createEmailCampaign(createEmailCampaign);
  }

  async sendEmailCampaignNow(campaignId: number) {
    return brevoFetch(`/emailCampaigns/${campaignId}/sendNow`, {
      method: "POST",
    });
  }

  async getEmailCampaign(campaignId: number) {
    return await emailCampaignsApi.getEmailCampaign(campaignId);
  }

  async deleteEmailCampaign(campaignId: number) {
    return await emailCampaignsApi.deleteEmailCampaign(campaignId);
  }

  // ==========================================
  // SENDERS
  // ==========================================
  async getSenders() {
    return await sendersApi.getSenders();
  }

  async createSender(params: { name: string; email: string }) {
    const createSender = new SibApiV3Sdk.CreateSender();
    createSender.name = params.name;
    createSender.email = params.email;

    return await sendersApi.createSender(createSender);
  }

  async updateSender(
    senderId: number,
    params: { name?: string; email?: string },
  ) {
    const updateSender = new SibApiV3Sdk.UpdateSender();
    if (params.name) updateSender.name = params.name;
    if (params.email) updateSender.email = params.email;

    return await sendersApi.updateSender(senderId, updateSender);
  }

  async deleteSender(senderId: number) {
    return await sendersApi.deleteSender(senderId);
  }

  // ==========================================
  // DOMAINS (Fetch API - not in SDK)
  // ==========================================
  async getDomains() {
    return brevoFetch("/senders/domains");
  }

  async createDomain(domainName: string) {
    return brevoFetch("/senders/domains", {
      method: "POST",
      body: JSON.stringify({ name: domainName }),
    });
  }

  async getDomainConfiguration(domainName: string) {
    return brevoFetch(`/senders/domains/${domainName}`);
  }

  async authenticateDomain(domainName: string) {
    return brevoFetch(`/senders/domains/${domainName}/authenticate`, {
      method: "PUT",
    });
  }

  async deleteDomain(domainName: string) {
    return brevoFetch(`/senders/domains/${domainName}`, {
      method: "DELETE",
    });
  }

  // ==========================================
  // WEBHOOKS (Fetch API)
  // ==========================================
  async createWebhook(params: {
    url: string;
    description?: string;
    events: string[];
    type: "transactional" | "marketing";
  }) {
    return brevoFetch("/webhooks", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getWebhooks(type?: "transactional" | "marketing") {
    const query = type ? `?type=${type}` : "";
    return brevoFetch(`/webhooks${query}`);
  }

  async deleteWebhook(webhookId: number) {
    return brevoFetch(`/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  }

  // ==========================================
  // EMAIL STATISTICS
  // ==========================================
  async getTransactionalEmailStats(params?: {
    startDate?: string;
    endDate?: string;
    days?: number;
    tag?: string;
  }) {
    return brevoFetch(
      `/smtp/statistics/events?${new URLSearchParams(params as any).toString()}`,
    );
  }

  async getCampaignStats(campaignId: number) {
    return brevoFetch(`/emailCampaigns/${campaignId}`);
  }

  async deleteEmailCampaignsBulk(campaignIds: number[]) {
    const results: {
      campaignId: number;
      success: boolean;
      error?: string;
    }[] = [];

    for (const campaignId of campaignIds) {
      try {
        await brevoFetch(`/emailCampaigns/${campaignId}`, {
          method: "DELETE",
        });

        results.push({
          campaignId,
          success: true,
        });
      } catch (error: any) {
        results.push({
          campaignId,
          success: false,
          error: error?.message || "Failed to delete campaign",
        });
      }
    }

    return {
      total: campaignIds.length,
      deleted: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}

export const brevo = new BrevoClient();

export function generateEmailTemplate(body: string, subject: string): string {
  // Remove empty img tags that TipTap sometimes adds
  const cleanBody = body
    .replace(/<img[^>]*src=["'][^"']*["'][^>]*>/gi, (match) => {
      // Only keep images with actual src content
      const srcMatch = match.match(/src=["']([^"']*)["']/);
      if (srcMatch && srcMatch[1] && srcMatch[1].trim() !== "") {
        return match;
      }
      return ""; // Remove empty img tags
    })
    .replace(/<img[^>]*>/gi, ""); // Remove any remaining img tags without src

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="email-container">
    ${cleanBody}
  </div>
</body>
</html>
  `.trim();
}
