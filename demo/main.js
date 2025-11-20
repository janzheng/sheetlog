import "jsr:@std/dotenv/load"; // needed for deno run; not req for smallweb or valtown
import { Hono } from "hono";

const app = new Hono();

// Add API endpoints to handle sheet operations
app.post("/api/sheet", async (c) => {
  try {
    const body = await c.req.json();
    const { sheetUrl, payload } = body;
    
    // Default sheet to Sheet1 if not provided
    if (payload.sheet === undefined) {
      payload.sheet = "Sheet1";
    }

    const payloadStr = JSON.stringify(payload);
    console.log("Sending to Google Sheets:", payloadStr.substring(0, 500));

    // Try sending as form data which Google Apps Script handles better
    const formData = new URLSearchParams();
    formData.append('payload', payloadStr);

    const response = await fetch(sheetUrl, {
      method: "POST", 
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });
    
    const text = await response.text();
    console.log("Response from Google Sheets:", text.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse response:", text);
      throw new Error(text);
    }
    return c.json(data);

  } catch (err) {
    console.error("Error in /api/sheet:", err);
    return c.json({ error: err.message }, 500);
  }
});

// Read HTML from file and inject environment variables
const htmlTemplate = await Deno.readTextFile(new URL("./index.html", import.meta.url));
const sheetUrl = Deno.env.get("SHEET_URL") || "";

app.get("/", (c) => {
  // Inject the SHEET_URL into the HTML
  const html = htmlTemplate.replace(
    "sheetUrl: '',",
    `sheetUrl: '${sheetUrl}',`
  );
  return c.html(html);
});

// Serve the movies.json file
app.get("/movies.json", async (c) => {
  const movies = await Deno.readTextFile(new URL("./movies.json", import.meta.url));
  return c.json(JSON.parse(movies));
});

export default (typeof Deno !== "undefined" && Deno.env.get("valtown")) ? app.fetch : app;