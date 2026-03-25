import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUpdateSchema, insertUpdateItemSchema, insertFeedbackSchema } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";

// Partner emails for notifications
const PARTNER_EMAILS = [
  "Elia.sonicsimports@gmail.com",
  "haythemnafso14@icloud.com",
  "kevin.doud@vkxlabs.com",
  "moh.imad@vkxlabs.com",
  "z.akhtar@vkxlabs.com",
];

const OWNER_EMAIL = "josh.medina@vbxlabs.com";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Updates ───────────────────────────────────────────────
  app.get("/api/updates", (_req, res) => {
    const all = storage.getUpdates();
    res.json(all);
  });

  app.get("/api/updates/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const update = storage.getUpdate(id);
    if (!update) return res.status(404).json({ error: "Not found" });

    const items = storage.getItemsByUpdate(id);
    const fb = storage.getFeedbackByUpdate(id);
    res.json({ ...update, items, feedback: fb });
  });

  app.post("/api/updates", (req, res) => {
    const parsed = insertUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const update = storage.createUpdate(parsed.data);
    res.status(201).json(update);
  });

  app.post("/api/updates/:id/publish", (req, res) => {
    const id = parseInt(req.params.id);
    const update = storage.publishUpdate(id);
    if (!update) return res.status(404).json({ error: "Not found" });
    res.json(update);
  });

  // ─── Email partners on publish ──────────────────────────────
  app.post("/api/updates/:id/email-partners", (req, res) => {
    const id = parseInt(req.params.id);
    const update = storage.getUpdate(id);
    if (!update) return res.status(404).json({ error: "Not found" });

    const items = storage.getItemsByUpdate(id);
    const shareUrl = req.body.shareUrl || "";

    // Return email data for the client to send via external service
    const sectionLabels: Record<string, string> = {
      urgent: "🔴 URGENT",
      major: "🟠 MAJOR TASKS",
      production: "🟡 PRODUCTION",
      strategic: "🔵 STRATEGIC",
    };

    let textBody = `KMJZ Holdings — Daily Update\n${update.date}\n\n`;
    let htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">`;
    htmlBody += `<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">KMJZ Holdings — Daily Update</h2>`;
    htmlBody += `<p style="color: #666; font-size: 14px; margin-bottom: 24px;">${update.date}</p>`;

    for (const [key, label] of Object.entries(sectionLabels)) {
      const sectionItems = items.filter(i => i.section === key);
      if (sectionItems.length === 0) continue;

      textBody += `${label}\n`;
      htmlBody += `<h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #333; margin: 20px 0 8px;">${label}</h3>`;

      for (const item of sectionItems) {
        textBody += `  • ${item.title}\n`;
        htmlBody += `<div style="background: #f8f8f8; border-radius: 8px; padding: 12px 16px; margin-bottom: 6px;">`;
        htmlBody += `<p style="font-size: 14px; font-weight: 500; margin: 0;">${item.title}</p>`;
        if (item.detail) {
          htmlBody += `<p style="font-size: 13px; color: #666; margin: 6px 0 0;">${item.detail}</p>`;
        }
        htmlBody += `</div>`;
      }
      textBody += "\n";
    }

    if (shareUrl) {
      textBody += `\nView full update: ${shareUrl}\n`;
      htmlBody += `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">`;
      htmlBody += `<a href="${shareUrl}" style="display: inline-block; background: #111; color: #fff; padding: 10px 24px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: 500;">View Full Update</a>`;
      htmlBody += `</div>`;
    }

    htmlBody += `</div>`;

    res.json({
      partners: PARTNER_EMAILS,
      subject: `KMJZ Daily Update — ${update.date}`,
      textBody,
      htmlBody,
    });
  });

  // ─── Update Items ──────────────────────────────────────────
  app.post("/api/items", (req, res) => {
    const parsed = insertUpdateItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const item = storage.createItem(parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/items/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const item = storage.updateItem(id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.delete("/api/items/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.deleteItem(id);
    res.status(204).send();
  });

  // ─── Feedback ──────────────────────────────────────────────
  app.get("/api/updates/:id/feedback", (req, res) => {
    const id = parseInt(req.params.id);
    const fb = storage.getFeedbackByUpdate(id);
    res.json(fb);
  });

  app.post("/api/updates/:id/feedback", (req, res) => {
    const id = parseInt(req.params.id);
    const update = storage.getUpdate(id);
    if (!update) return res.status(404).json({ error: "Update not found" });

    const body = { ...req.body, updateId: id, createdAt: new Date().toISOString() };
    const parsed = insertFeedbackSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const fb = storage.createFeedback(parsed.data);

    // Return feedback email data for owner notification
    res.status(201).json({
      ...fb,
      emailData: {
        ownerEmail: OWNER_EMAIL,
        subject: `Feedback on ${update.date} update — ${fb.section}`,
        body: `${fb.authorName} (${fb.authorEmail}) left feedback on the ${fb.section} section:\n\n"${fb.message}"`,
      },
    });
  });

  // ─── AI: Parse raw notes into structured update ────────────
  app.post("/api/ai/parse", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
        return res.status(400).json({ error: "Raw text is required" });
      }

      const today = new Date().toISOString().split("T")[0];

      const client = new Anthropic();
      const msg = await client.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 2048,
        system: "You are a JSON-only API for KMJZ Holdings. You structure raw operational notes into daily updates. You MUST respond with ONLY valid JSON — no prose, no markdown fences, no explanations before or after the JSON.",
        messages: [
          {
            role: "user",
            content: `Parse these raw notes into structured daily updates. Respond with ONLY the JSON object, nothing else.

Today: ${today}

Rules:
1. Sections: "urgent", "major", "production", "strategic"
2. Each item: short "title" (max 15 words) + detailed "detail" (action steps, context)
3. Merge duplicates
4. Future dates mentioned (e.g. "march 28") get their own update object with that date in YYYY-MM-DD. Items without a date go under today.
5. Clean grammar, keep urgency

JSON format: {"updates":[{"date":"YYYY-MM-DD","items":[{"section":"urgent","title":"...","detail":"..."}]}]}

Notes:
${rawText}`,
          },
        ],
      });

      const content = msg.content[0];
      if (content.type !== "text") {
        return res.status(500).json({ error: "Unexpected AI response" });
      }

      // Parse the JSON response
      let jsonText = content.text.trim();
      // Handle markdown fences if any
      if (jsonText.includes("```")) {
        jsonText = jsonText.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "");
      }

      const parsed = JSON.parse(jsonText);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI parse error:", err?.message || err);
      res.status(500).json({ error: "Failed to parse notes. Please try again." });
    }
  });

  // ─── AI: Create update(s) from parsed data ──────────────────
  app.post("/api/ai/post-updates", (req, res) => {
    try {
      const { updates: updateList } = req.body;
      if (!Array.isArray(updateList) || updateList.length === 0) {
        return res.status(400).json({ error: "No updates to post" });
      }

      const results: any[] = [];

      for (const u of updateList) {
        const date = u.date;
        const items = u.items || [];
        const shouldPublish = u.publish === true;

        // Check if an update already exists for this date
        let existing = storage.getUpdateByDate(date);
        let update;

        if (existing) {
          update = existing;
        } else {
          update = storage.createUpdate({
            date,
            status: "draft",
            createdAt: new Date().toISOString(),
          });
        }

        // Get existing items count for sort order
        const existingItems = storage.getItemsByUpdate(update.id);
        let sortIndex = existingItems.length;

        for (const item of items) {
          storage.createItem({
            updateId: update.id,
            section: item.section,
            title: item.title,
            detail: item.detail || "",
            sortOrder: sortIndex++,
          });
        }

        if (shouldPublish) {
          storage.publishUpdate(update.id);
        }

        results.push({
          updateId: update.id,
          date,
          itemCount: items.length,
          published: shouldPublish,
          isNew: !existing,
        });
      }

      res.json({ results });
    } catch (err: any) {
      console.error("Post update error:", err?.message || err);
      res.status(500).json({ error: "Failed to create updates" });
    }
  });

  // ─── Config endpoint for frontend ──────────────────────────
  app.get("/api/config", (_req, res) => {
    res.json({
      partnerEmails: PARTNER_EMAILS,
      ownerEmail: OWNER_EMAIL,
    });
  });

  return httpServer;
}
