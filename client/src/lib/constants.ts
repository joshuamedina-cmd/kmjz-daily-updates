export const SECTIONS = [
  { key: "urgent", label: "Urgent", color: "hsl(var(--urgent))", dotClass: "bg-red-500 dark:bg-red-400" },
  { key: "major", label: "Major Tasks", color: "hsl(var(--major))", dotClass: "bg-orange-500 dark:bg-orange-400" },
  { key: "production", label: "Production", color: "hsl(var(--production))", dotClass: "bg-yellow-500 dark:bg-yellow-400" },
  { key: "strategic", label: "Strategic", color: "hsl(var(--strategic))", dotClass: "bg-blue-500 dark:bg-blue-400" },
] as const;

export type SectionKey = typeof SECTIONS[number]["key"];

export const PARTNERS = [
  { name: "Elia", email: "Elia.sonicsimports@gmail.com" },
  { name: "Haythem", email: "haythemnafso14@icloud.com" },
  { name: "Kevin", email: "kevin.doud@vkxlabs.com" },
  { name: "Moh", email: "moh.imad@vkxlabs.com" },
  { name: "Z", email: "z.akhtar@vkxlabs.com" },
] as const;
