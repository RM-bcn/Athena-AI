import { Request, Response } from "express";
import { genSalt, hash, compare } from "bcryptjs";
import { updateUserProfileInSheet, getUserFromSheet, uploadToCloudinary } from "./sheets-service.js";

const PASSWORD_MIN_LENGTH = 8;
const NICKNAME_MAX_LENGTH = 40;

export async function handleProfileUpdate(req: Request, res: Response) {
  try {
    const {
      email,
      username,
      nickname,
      avatarData,
      avatarUrl,
      currentPassword,
      newPassword,
    } = req.body || {};

    // 1. Validate identity (user must be identified by email or username)
    const identifierEmail = typeof email === "string" ? email.trim() : "";
    const identifierUsername = typeof username === "string" ? username.trim() : "";
    if (!identifierEmail && !identifierUsername) {
      return res.status(400).json({ success: false, error: "E-mailadres of gebruikersnaam is verplicht." });
    }

    const existingUser = await getUserFromSheet(identifierEmail, identifierUsername);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: "Gebruiker niet gevonden. Controleer je e-mailadres of gebruikersnaam." });
    }

    const updates: { nickname?: string; avatarUrl?: string; passwordHash?: string } = {};

    // 2. Nickname validation
    if (nickname !== undefined && nickname !== null) {
      const trimmedNickname = String(nickname).trim();
      if (!trimmedNickname || trimmedNickname.length > NICKNAME_MAX_LENGTH) {
        return res.status(400).json({ success: false, error: `Nickname moet tussen 1 en ${NICKNAME_MAX_LENGTH} tekens bevatten.` });
      }
      updates.nickname = trimmedNickname;
    }

    // 3. Avatar: prefer a freshly uploaded (client-compressed) data URI, otherwise accept a direct URL
    if (avatarData || avatarUrl) {
      let finalAvatarUrl = "";

      if (avatarData) {
        const dataUri = String(avatarData);
        if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(dataUri)) {
          return res.status(400).json({ success: false, error: "Ongeldig afbeeldingsformaat. Gebruik een JPEG, PNG of WebP bestand." });
        }
        if (dataUri.length > 4_500_000) {
          return res.status(400).json({ success: false, error: "Afbeelding is te groot. Kies een kleinere foto of verlaag de kwaliteit." });
        }
        finalAvatarUrl = await uploadToCloudinary(dataUri);
      } else {
        finalAvatarUrl = String(avatarUrl).trim();
      }

      if (!/^https:\/\/res\.cloudinary\.com\/.+/.test(finalAvatarUrl) && !/^https:\/\//.test(finalAvatarUrl)) {
        return res.status(400).json({ success: false, error: "Ongeldige avatar URL." });
      }
      updates.avatarUrl = finalAvatarUrl;
    }

    // 4. Password change (never stored in plain text)
    if (newPassword !== undefined && newPassword !== null && String(newPassword).length > 0) {
      const password = String(newPassword);
      if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ success: false, error: `Nieuw wachtwoord moet minimaal ${PASSWORD_MIN_LENGTH} tekens bevatten.` });
      }

      if (existingUser.passwordHash) {
        const isValidCurrent = await compare(String(currentPassword || ""), existingUser.passwordHash);
        if (!isValidCurrent) {
          return res.status(403).json({ success: false, error: "Het huidige wachtwoord is onjuist." });
        }
      }

      const salt = await genSalt(10);
      updates.passwordHash = await hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "Geen wijzigingen om op te slaan." });
    }

    // 5. Persist to Google Sheets
    const updatedUser = await updateUserProfileInSheet(
      { email: identifierEmail, username: identifierUsername },
      updates
    );

    if (!updatedUser) {
      return res.status(500).json({ success: false, error: "Profiel kon niet worden bijgewerkt in Google Sheets." });
    }

    // 6. Return the user object WITHOUT the password hash
    const { passwordHash: _removed, ...safeUser } = updatedUser;
    return res.status(200).json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error("[Profile] Update error:", err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || "Er is een onverwachte serverfout opgetreden." });
  }
}
