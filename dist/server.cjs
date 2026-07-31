var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new import_genai.GoogleGenAI({ apiKey });
}
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, context } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      const lastMsg = (messages?.[messages.length - 1]?.content || "").toLowerCase();
      let reply = "Kalimera! I'm Athena, your Greek Island Concierge. ";
      if (lastMsg.includes("ferry") || lastMsg.includes("schedule")) {
        reply += "High-speed ferries (Seajets & Blue Star) operate daily between Naxos, Milos, and Koufonisia. I recommend booking at least 48 hours in advance during high season as seats sell out quickly.";
      } else if (lastMsg.includes("taverna") || lastMsg.includes("eat") || lastMsg.includes("food")) {
        reply += "For authentic Greek cuisine in Naxos Old Town, I highly recommend Meze2 or Rotonda in Apeiranthos for sunset views over the mountain valleys. Don't forget to sample local Graviera cheese!";
      } else if (lastMsg.includes("beach") || lastMsg.includes("swim")) {
        reply += "In Koufonisia, Pori Beach and Italida offer some of the clearest turquoise waters in the Aegean. For a secluded spot, try Gala Beach or the natural pool at Devil's Eye!";
      } else if (lastMsg.includes("naxos") || lastMsg.includes("koufonisia")) {
        reply += "Naxos and Koufonisia make a perfect 5-day combination! Days 1-3 in Naxos feature hiking Mt. Zeus, exploring the Portara, and ancient ruins. Days 4-5 in Koufonisia are pure relaxation on pristine beaches.";
      } else {
        reply += "How can I refine your Cyclades journey today? Ask me about ferry schedules, hidden beaches, local tavernas, or customizing your 7-day odyssey!";
      }
      return res.json({ reply });
    }
    const systemPrompt = `You are Athena AI, an elite Mediterranean Travel Concierge specializing in the Greek Cyclades Islands (Athens, Milos, Naxos, Koufonisia, Mykonos, Santorini).
You speak warmly, eloquently, and with expert local knowledge ("Kalimera", "Yassas", local tips on ferries, tavernas, hidden beaches, cheese, weather, Meltemi winds).
Keep answers concise, helpful, and formatted with clean paragraphs or bullet points. Current traveler context: ${context || "Cyclades Hopping"}.`;
    const userPrompt = messages.map((m) => `${m.role === "user" ? "Traveler" : "Athena"}: ${m.content}`).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}

Chat History:
${userPrompt}

Athena:` }] }
      ]
    });
    res.json({ reply: response.text || "Yassou! How else may I assist your Aegean journey?" });
  } catch (error) {
    console.error("Chat error:", error);
    res.json({ reply: "Yassas! I'm here to assist. High season ferries and local island recommendations are all set for your Cyclades trip!" });
  }
});
app.post("/api/translate-menu", async (req, res) => {
  try {
    const { imageBase64, textPrompt } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        translation: "\u{1F1EC}\u{1F1F7} **Greek Menu Decoded**:\n\n1. **Arni Kleftiko** (\u0386\u03C1\u03BD\u03B9 \u039A\u03BB\u03AD\u03C6\u03C4\u03B9\u03BA\u03BF) \u2014 Slow-baked lamb with herbs, garlic & Naxian potatoes.\n2. **Naxian Graviera** (\u0393\u03C1\u03B1\u03B2\u03B9\u03AD\u03C1\u03B1 \u039D\u03AC\u03BE\u03BF\u03C5) \u2014 PDO aged local sheep's milk cheese, mild & nutty.\n3. **Chtapodi Psito** (\u03A7\u03C4\u03B1\u03C0\u03CC\u03B4\u03B9 \u03A8\u03B7\u03C4\u03CC) \u2014 Grilled octopus with oregano & lemon oil.\n4. **Tomatokeftedes** (\u03A4\u03BF\u03BC\u03B1\u03C4\u03BF\u03BA\u03B5\u03C6\u03C4\u03AD\u03B4\u03B5\u03C2) \u2014 Crispy Aegean tomato fritters with fresh mint.\n\n\u{1F377} *Recommended pairing: Local Naxian white wine (Assyrtiko) or chilled Ouzo.*"
      });
    }
    const prompt = textPrompt || "Translate and explain this Greek restaurant menu in detail for a traveler. List dishes, ingredients, dietary notes, and local drink recommendations.";
    let parts = [{ text: prompt }];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg"
        }
      });
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts }]
    });
    res.json({ translation: response.text });
  } catch (err) {
    res.json({
      translation: "\u{1F1EC}\u{1F1F7} **Menu Decoded**:\n- **Moussaka** (\u039C\u03BF\u03C5\u03C3\u03B1\u03BA\u03AC\u03C2): Eggplant, minced beef & creamy b\xE9chamel.\n- **Kleftiko** (\u039A\u03BB\u03AD\u03C6\u03C4\u03B9\u03BA\u03BF): Slow-baked tender lamb with local herbs.\n- **Dakos** (\u039D\u03C4\u03AC\u03BA\u03BF\u03C2): Barley rusk with ripe tomatoes, feta & olives."
    });
  }
});
app.post("/api/suggest-hotels", async (req, res) => {
  try {
    const { island, style } = req.body;
    const ai = getGeminiClient();
    const curIsland = island || "Naxos";
    if (!ai) {
      const defaultSuggestions = {
        "Milos": [
          {
            id: "milos-1",
            name: "Milos Breeze Boutique Hotel",
            location: "Pollonia, Milos",
            island: "Milos",
            rating: 9.6,
            ratingLabel: "Buitengewoon",
            reviewsCount: 420,
            pricePerNight: 195,
            tag: "Trivago Best Deal \u2022 Infinity Pool",
            amenities: ["Infinity Pool", "Panoramisch Zeezicht", "Ontbijt inbegrepen", "Cocktailbar"],
            distanceToBeach: "100m van Pollonia baai",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAOZr5gGB1weJa8rMWnTL0uY6A01WC5nthIOndYdcCtpttUQLwLh5AakhZXjrKuZAd-FlZxvC9U4iOG6J1e4uXAU0Oor1utW2UD2XdtLlyTYdPEvvsyc5BoKJauF55-AlZneX0ckYM1_LET_RPpwUyIa5WmgE0C6LF_12sbGkfLudDNSzsfAwn0fDiT4AYFxNTCRK6DUsyqEuIZGC4SIRD3jSYmMlEkbJkF-osO32NfbUjKSaFLZfFLeA"
          },
          {
            id: "milos-2",
            name: "White Coast Pool Suites",
            location: "Mytakas Beach, Milos",
            island: "Milos",
            rating: 9.4,
            ratingLabel: "Uitstekend",
            reviewsCount: 188,
            pricePerNight: 280,
            tag: "Priv\xE9 Zwembad \u2022 Adult Only",
            amenities: ["Priv\xE9 Plunge Pool", "Klimaatbeheersing", "Luxe Spa", "Sunset View"],
            distanceToBeach: "Direct aan de Kust",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyhUXPPtvq8bz7gDp3yHkjbE2nRwSRYNsxxAThh5mnuZMtf8gSAisxi0LSA6sMuQ3-6c0Ly0gTldOEBIuck1WYLu9XYwPYxB1ZygQnG1LF29tdlUoqWl1o74iv7PDayCoNP2Lea4Hy3lDYilB1xof9BX2FcAUN-lNLPdjJeB4Wrx6NhCyo4Q9aGkVVHcCxQWj6UR1iRjSJ51rJe2VRjjJ8jwygei0v_UOmhcPrE29vNRDy7m3MR5udzw"
          },
          {
            id: "milos-3",
            name: "Artemis Seaside Resort",
            location: "Paliochori Beach, Milos",
            island: "Milos",
            rating: 9.1,
            ratingLabel: "Geweldig",
            reviewsCount: 310,
            pricePerNight: 140,
            tag: "Strandresort \u2022 Populair",
            amenities: ["Strandbedden gratis", "Beach Club", "Gratis Wifi", "Parkeergelegenheid"],
            distanceToBeach: "Direct aan het zandstrand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBO2PXtkrNV1rQmK7bALaUm6APlIKnswhv2eg7XwGwJiQOEDev_6SQoHR1-oseY1Xq_qrDFULn21JCwnC8D9KI8MYN4uqNjevH9XLAu8QSoR01f-VeSHkQlyiQKBRJ8YnC3NGXII49v6sl1bnrlM0HzxqCsUuV5S49XzvRvxHJ2YB1VU3vNJXIS6ReANKM0GAYPEHwYIlFb6OteFNGnyWVzl5oJF6-RDYQynXeWGrGlJ-luu2qxVItFPA"
          }
        ],
        "Naxos": [
          {
            id: "naxos-1",
            name: "Nissaki Beach Hotel",
            location: "Agios Georgios Beach, Naxos Chora",
            island: "Naxos",
            rating: 9.5,
            ratingLabel: "Buitengewoon",
            reviewsCount: 512,
            pricePerNight: 165,
            tag: "Trivago Top Keuze \u2022 Aan het Strand",
            amenities: ["Zwembad", "Gastronomisch Ontbijt", "Loopafstand van Chora Centrum", "Balkon met zeezicht"],
            distanceToBeach: "20m van het strand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ"
          },
          {
            id: "naxos-2",
            name: "Naxos Island Hotel & Spa",
            location: "Agios Prokopios, Naxos",
            island: "Naxos",
            rating: 9.3,
            ratingLabel: "Uitstekend",
            reviewsCount: 295,
            pricePerNight: 185,
            tag: "Rooftop Pool \u2022 Luxe Spa",
            amenities: ["Rooftop Infinity Pool", "Spa & Wellness", "Restaurant", "Gratis Shuttle"],
            distanceToBeach: "100m van Agios Prokopios",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHfBiyPTGMH6A0nprYOehSC76_PtO8RRUX4vI4Ieh_1j8l_CgiD8Zll_7okT16X08G3LcGVGV0YktEzwE0-c1yefk6fQUcyZWVoLKlNR1M1aRbg-ihQ6XBcS6rjALkkbFQLjZaxZS52V_EcHxf5Z_qxsEtDUs_Qf0uWRRh2nIEyGswCTugHHE3vUXLuk6icIsv0FXwVCq0FMz0WolXA0MmDPZESRLq4RdUQCUaXC0TH9EM-U6O83iIUQ"
          },
          {
            id: "naxos-3",
            name: "Portara Seaside Luxury Suites",
            location: "Naxos Chora Port",
            island: "Naxos",
            rating: 9.2,
            ratingLabel: "Geweldig",
            reviewsCount: 174,
            pricePerNight: 150,
            tag: "Zonsondergang Uitzicht",
            amenities: ["Portara Uitzicht", "Design Suites", "Kitchenette", "Gratis Koffie & Wijn"],
            distanceToBeach: "300m van de Hawen",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGnyljvgfgiAVVRcJsYIcvifjq5T0nmamAn0qRt33WTfpzv5ju6GPyGWy0ZmBTYxxpJFoU8dv-_FrnICwIfpG_kIkMzQur1PJ3ZygJG2zIUlVNPLicldpkmEvo4WRFwKlN824h5GES-iLH0AlTHAWdMR8MhufUpaTa76Lnih1OmcVhpNzHzauFFr9gbsru5EdfkK1NqfbwiOws7DKzynf8g1305DY74ER2oW2VC_QWrzQaM9SBEPeFfA"
          }
        ],
        "Koufonisia": [
          {
            id: "kouf-1",
            name: "Koufonisia Hotel & Beach Suites",
            location: "Chora, Koufonisia",
            island: "Koufonisia",
            rating: 9.7,
            ratingLabel: "Buitengewoon",
            reviewsCount: 230,
            pricePerNight: 175,
            tag: "Trivago Top Tip \u2022 Cycladisch Design",
            amenities: ["Zwembad", "Biologisch Ontbijt", "Gratis Fietsverhuur", "Rustige Tuin"],
            distanceToBeach: "150m van de Hawen & Ammos Strand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCX9IVh2F1IBAIsKj7jOD861n8sugmHDcElOR3VKlyaBLHMKRkHMtcpApETSM6CS45kARGz9dXLjdJ9suE50sTHDIcVcCsQ2OywJv15Y137fWCYEo0JeGArizL5wilGyNJwmhe_yeOqm83XRgO7IW5wVs7eZ-sVqkfzO80SLcYrpQ6s3L0oMOF9-E1zN3kSTh-PqREp5WC6d8OTrD6rtJ3XTS18aOgZzWGxiCipBwErygHLPtoKWvEl3w"
          },
          {
            id: "kouf-2",
            name: "Pori Sunset Villas",
            location: "Pori Bay, Koufonisia",
            island: "Koufonisia",
            rating: 9.5,
            ratingLabel: "Uitstekend",
            reviewsCount: 145,
            pricePerNight: 210,
            tag: "Verborgen Parel \u2022 Turquoise Baai",
            amenities: ["Panoramisch Terras", "Directe Strandtoegang", "Keukenette", "Airco"],
            distanceToBeach: "Direct aan Pori Beach",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3FFMdo8xBV7-uf2HAOHtIioK0k8dyWwal_M7sOkja-Fjnc3rZKSxLJstWux3EghAakbbyrObm3LJ26sIPxtWfqCdPp26M_anuaoJaoxbE9Xa5UcbpZxZrrNX6DONr4D0DYoIL2eYsx4viIB68nhqpWrBo2IV-0Y3FledGzfxNPxJyo8frMATv4TCsVRk1ZZiGUiKXyO4DbMvCK9d12fIRwdwoaKcJqmEYX5qAs5LL0yIn5JBxNTGAEg"
          }
        ]
      };
      const results = defaultSuggestions[curIsland] || defaultSuggestions["Naxos"];
      return res.json({ hotels: results });
    }
    const prompt = `Act as a Trivago-style hotel search engine for the Greek island of ${curIsland} (style preference: ${style || "all"}). 
Generate 3 realistic, highly-rated boutique hotels or resorts on ${curIsland}. 
Return valid JSON array of objects with keys: id, name, location, island, rating (number like 9.4), ratingLabel (e.g. "Buitengewoon" or "Uitstekend"), reviewsCount (number), pricePerNight (number in EUR), tag (e.g. "Trivago Deal \u2022 Zeezicht"), amenities (array of string in Dutch), distanceToBeach (string in Dutch).`;
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    try {
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "[]");
      const enriched = parsed.map((h, i) => ({
        ...h,
        image: h.image || [
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAOZr5gGB1weJa8rMWnTL0uY6A01WC5nthIOndYdcCtpttUQLwLh5AakhZXjrKuZAd-FlZxvC9U4iOG6J1e4uXAU0Oor1utW2UD2XdtLlyTYdPEvvsyc5BoKJauF55-AlZneX0ckYM1_LET_RPpwUyIa5WmgE0C6LF_12sbGkfLudDNSzsfAwn0fDiT4AYFxNTCRK6DUsyqEuIZGC4SIRD3jSYmMlEkbJkF-osO32NfbUjKSaFLZfFLeA",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCX9IVh2F1IBAIsKj7jOD861n8sugmHDcElOR3VKlyaBLHMKRkHMtcpApETSM6CS45kARGz9dXLjdJ9suE50sTHDIcVcCsQ2OywJv15Y137fWCYEo0JeGArizL5wilGyNJwmhe_yeOqm83XRgO7IW5wVs7eZ-sVqkfzO80SLcYrpQ6s3L0oMOF9-E1zN3kSTh-PqREp5WC6d8OTrD6rtJ3XTS18aOgZzWGxiCipBwErygHLPtoKWvEl3w"
        ][i % 3]
      }));
      return res.json({ hotels: enriched });
    } catch {
      return res.json({
        hotels: [
          {
            id: `${curIsland}-1`,
            name: `${curIsland} Aegean Luxury Resort`,
            location: `${curIsland} Coast`,
            island: curIsland,
            rating: 9.5,
            ratingLabel: "Buitengewoon",
            reviewsCount: 280,
            pricePerNight: 175,
            tag: "Trivago Best Deal \u2022 Zeezicht",
            amenities: ["Zwembad", "Ontbijt inbegrepen", "Zeezicht", "Gratis Wifi"],
            distanceToBeach: "50m van het strand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ"
          }
        ]
      });
    }
  } catch (err) {
    res.json({ hotels: [] });
  }
});
app.post("/api/resolve-ferry", async (req, res) => {
  try {
    const { currentPort, destination, time } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        resolution: {
          status: "Found Alternatives",
          options: [
            {
              type: "Hydrofoil",
              operator: "Seajets WorldChampion Jet",
              departure: "14:15",
              arrival: "15:00",
              price: "\u20AC42.50",
              notes: "Fastest option. 12 seats remaining."
            },
            {
              type: "Passenger Ferry",
              operator: "Blue Star Delos",
              departure: "17:30",
              arrival: "18:45",
              price: "\u20AC28.00",
              notes: "Spacious deck, reliable in Meltemi winds."
            }
          ],
          recommendedHotel: "Porto Naxos Hotel (5 min walk from port)",
          advice: "Head to Port Gate 3 ticket office or book via the app. Your hotel in Naxos has been notified of your updated arrival time."
        }
      });
    }
    const prompt = `A traveler in ${currentPort || "Milos"} missed their ferry to ${destination || "Naxos"}. 
Generate emergency assistance options including next available hydrofoils/ferries, estimated times, ticket office guidance, and temporary port hotel recommendation. Format response as JSON with fields: status, options (array of {type, operator, departure, arrival, price, notes}), recommendedHotel, advice.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    try {
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      return res.json({ resolution: parsed });
    } catch {
      return res.json({
        resolution: {
          status: "Found Alternatives",
          options: [
            { type: "Hydrofoil", operator: "Seajets Champion Jet 2", departure: "14:15", arrival: "15:05", price: "\u20AC42.50", notes: "12 seats remaining" },
            { type: "Ferry", operator: "Blue Star Naxos", departure: "17:30", arrival: "18:45", price: "\u20AC28.00", notes: "Comfortable lounge" }
          ],
          recommendedHotel: "Porto Naxos Suites",
          advice: "You can rebook instantly or Athena can hold seats for 30 minutes."
        }
      });
    }
  } catch (error) {
    res.json({
      resolution: {
        status: "Alternatives Available",
        options: [
          { type: "Express Catamaran", operator: "Seajets", departure: "14:15", arrival: "15:05", price: "\u20AC42.50", notes: "Direct service" }
        ],
        recommendedHotel: "Naxos Beach Hotel",
        advice: "Contact Athena Concierge to confirm booking."
      }
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
