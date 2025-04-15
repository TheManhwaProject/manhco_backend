import { User } from "@prisma/client";
import { prisma } from "@libs/prisma";

type NSFWBandResult =
  | { band: 3 }
  | { band: 2 }
  | {
      band: 1;
      reason:
        | "missing_nsfw_policy"
        | "country_banned"
        | "country_limited"
        | "birthday_required"
        | "underage";
    };

export async function getUserBand(user: User): Promise<NSFWBandResult> {
  const nsfwPolicy = await prisma.nSFWPolicy.findUnique({ where: { id: 1 } });
  if (!nsfwPolicy) return { band: 1, reason: "missing_nsfw_policy" };

  const restriction = await prisma.nSFWRestrictedCountry.findFirst({
    where: { countryCode: user.country },
  });

  if (!user.birthday) return { band: 1, reason: "birthday_required" };

  const age = calculateAge(user.birthday);
  if (age < 18) return { band: 1, reason: "underage" };

  if (restriction?.band === 1) {
    return { band: 1, reason: "country_banned" };
  }

  if (restriction?.band === 2) {
    return nsfwPolicy.band2Enabled
      ? { band: 2 }
      : { band: 1, reason: "country_limited" };
  }

  return { band: 3 };
}

function calculateAge(birthday: Date): number {
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}