import { NextResponse } from "next/server";
import { profile, stats, expertise, products, skills, experience } from "@/lib/data";

export const dynamic = "force-static";
export const revalidate = false;

export function GET() {
  return NextResponse.json(
    {
      profile: {
        name: profile.name,
        title: profile.title,
        tagline: profile.tagline,
        summary: profile.summary,
        location: profile.location,
        availability: profile.availability,
        email: profile.email,
        phone: profile.phone,
        linkedin: profile.linkedin,
        github: profile.github,
      },
      stats,
      expertise,
      experience,
      skills,
      products,
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400",
      },
    },
  );
}
