/**
 * Google OAuth Token Generator
 * 
 * Gebruik dit script om een REFRESH_TOKEN te genereren voor Google Sheets API toegang.
 * 
 * STAPPEN:
 * 1. Zorg dat je CLIENT_ID en CLIENT_SECRET hebt van Google Cloud Console
 * 2. Run dit script: bun run oauth-generator.ts
 * 3. Open de URL die wordt getoond in je browser
 * 4. Autoriseer de applicatie
 * 5. Kopieer de code van de redirect URL en plak deze in de terminal
 * 6. Het script toont je REFRESH_TOKEN die je kunt gebruiken in .env
 */

import { google } from "googleapis";
import readline from "readline";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file"
];

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { token } = await oauth2Client.getAccessToken();
  return token || "";
}

async function generateRefreshToken(): Promise<void> {
  console.log("\n🔐 Google OAuth Token Generator\n");
  
  // Vraag om credentials
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, (answer) => resolve(answer));
    });
  };

  try {
    const clientId = await question("Voer je CLIENT_ID in: ");
    if (!clientId) {
      console.error("❌ CLIENT_ID is vereist");
      rl.close();
      return;
    }

    const clientSecret = await question("Voer je CLIENT_SECRET in: ");
    if (!clientSecret) {
      console.error("❌ CLIENT_SECRET is vereist");
      rl.close();
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "http://localhost:3000/auth/callback"
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent"
    });

    console.log("\n✅ Open deze URL in je browser om te autoriseren:\n");
    console.log(authUrl);
    console.log("\n");

    const code = await question("Plak de autorisatiecode hier: ");
    
    if (!code) {
      console.error("❌ Autorisatiecode is vereist");
      rl.close();
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log("\n✅ SUCCESS! Hier zijn je credentials:\n");
    console.log("=".repeat(60));
    console.log(`CLIENT_ID="${clientId}"`);
    console.log(`CLIENT_SECRET="${clientSecret}"`);
    console.log(`REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log("=".repeat(60));
    console.log("\n📝 Voeg deze waarden toe aan je .env bestand:\n");
    console.log("CLIENT_ID=" + clientId);
    console.log("CLIENT_SECRET=" + clientSecret);
    console.log("REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("\n✨ Start daarna je server opnieuw op met: bun run dev\n");

    rl.close();
  } catch (error: any) {
    console.error("\n❌ Fout bij het genereren van tokens:", error.message);
    rl.close();
  }
}

// Export voor gebruik
export { getAccessToken, generateRefreshToken };

// Run als dit bestand direct wordt uitgevoerd
if (process.argv[1]?.includes("oauth-generator")) {
  generateRefreshToken();
}
