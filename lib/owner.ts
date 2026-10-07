// The store owner's email(s), from OWNER_EMAIL (comma-separated). Owner
// accounts are always full admins: nobody can change their role or block
// them, so a staff member can never lock the owner out. No imports here so
// auth.ts and lib/admin.ts can both use it.
export function isOwnerEmail(email: string) {
  const owners = (process.env.OWNER_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.toLowerCase());
}
