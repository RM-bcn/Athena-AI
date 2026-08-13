export interface SeedUser {
  username: string;
  email: string;
  name: string;
  nickname: string;
  avatar: string;
  avatarUrl: string;
  role: "owner" | "member";
  tripCode: string;
  passwordHash: string;
}

export const SEED_USERS: SeedUser[] = [
  {
    username: "dennisvr",
    email: "dennis.van.rooden@gmail.com",
    name: "Dennis van Rooden",
    nickname: "Dennis",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD2iljiBhAsAiyvXWmhlOpuzfMWXAD_6mWv-5fDLMBf3sg2vJy9asYoS5YaZPVDoEBA7qxAHSKb0pO59uwDBRdIA_MVVffoC1E2MXONsSBGM8LCr-gO5WJJASZ-WrLNH10HW_Sx--2HrxnPQP4dD2jQTrjH4xKSGo4Ci5xKFozY74ntm8n5I9KU2ERvxpUF_IkyJfnGf4_o7bXakzsJXyoTwLBCEBjRf7_rgQZC0Zq6srzRTiUqCXVyKA",
    avatarUrl: "",
    role: "owner",
    tripCode: "ATH-2026",
    passwordHash: "$2b$10$iJS5qNdTGn2QZfvYjHgM7e4jjDvqnsdwxWHCX0pLsaMnq68ov6ofS",
  },
  {
    username: "Joyce",
    email: "Joyceockeloen@gmail.com",
    name: "Joyce Ockeloen",
    nickname: "Joyce",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    avatarUrl: "",
    role: "member",
    tripCode: "ATH-2026",
    passwordHash: "$2b$10$13xY6iA/94De1uSl2orhseWSRufRx0LLhIj7iq2gpLhdkymza26P6",
  },
  {
    username: "testaccount",
    email: "dennis.van.rooden+testaccount@gmail.com",
    name: "Test Account",
    nickname: "Test",
    avatar: "",
    avatarUrl: "",
    role: "member",
    tripCode: "ATH-2026",
    passwordHash: "$2b$10$oN4/94N/2ZUNXvNkDH7FoOgHDEvKHuHNMb39J8Sz5veup2INUVH56",
  },
];
