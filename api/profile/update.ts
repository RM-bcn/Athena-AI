import { handleProfileUpdate } from "../../server/profile-service.js";

// Vercel Serverless Function: POST /api/profile/update
// Handles nickname, avatar (Cloudinary) and password updates.
export default handleProfileUpdate;
