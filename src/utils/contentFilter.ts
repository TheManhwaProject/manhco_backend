import { User } from "@prisma/client";
import { prisma } from "@libs/prisma";
import axios from "axios";
import { z } from "zod";
import { ErrorAppCode } from "./errorHandler";

type NSFWBandResult =
  | { band: 3 }
  | { band: 2 }
  | {
      band: 1;
      reason: ErrorAppCode;
    };

const IpAPI = `http://ip-api.com/json/`;
const IpApiResponse = z.object({
  query: z.string(),
  status: z.string(),
  country: z.string(),
  countryCode: z.string(),
  region: z.string(),
  regionName: z.string(),
  city: z.string(),
  zip: z.string(),
  lat: z.number(),
  lon: z.number(),
  timezone: z.string(),
  isp: z.string(),
  org: z.string(),
  as: z.string(),
});

export async function getUserBand(user: User): Promise<NSFWBandResult> {
  const nsfwPolicy = await prisma.nSFWPolicy.findUnique({ where: { id: 1 } });
  if (!nsfwPolicy) return { band: 1, reason: ErrorAppCode.MissingNSFWPolicy };

  const restriction = user.country
    ? await prisma.nSFWRestrictedCountry.findFirst({
        where: { countryCode: user.country },
      })
    : null;

  if (!user.birthday) return { band: 1, reason: ErrorAppCode.BirthdayRequired };

  const age = calculateAge(user.birthday);
  if (age < 18) return { band: 1, reason: ErrorAppCode.Underage };

  if (restriction?.band === 1) {
    return { band: 1, reason: ErrorAppCode.CountryBanned };
  }

  if (restriction?.band === 2) {
    return nsfwPolicy.band2Enabled
      ? { band: 2 }
      : { band: 1, reason: ErrorAppCode.CountryLimited };
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

async function getIpCountry(ip: string): Promise<string | null> {
  try {
    const url = IpAPI + ip;
    const res = await axios.get(url, { timeout: 3000 });
    const data = IpApiResponse.safeParse(res.data);

    if (!data.success) {
      console.warn("Invalid IP API response:", data.error.format());
      return null;
    }

    return data.data.countryCode;
  } catch (err) {
    console.error("Failed to get country from IP:", err);
    return null;
  }
}

function isIpValid(ip: string): boolean {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip);
}

export async function assignUserCountry(user: User, ip: string): Promise<void> {
  if (!isIpValid(ip)) return;
  const country = await getIpCountry(ip);
  if (!country) return;
  user.country = country;
  await prisma.user.update({ where: { id: user.id }, data: { country } });
}
