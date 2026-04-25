import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { issueCertificateIfReady } from "@/lib/courses/actions";

type Body = { courseId?: number };

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const courseId = Number(body.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_course_id" },
      { status: 400 }
    );
  }

  const result = await issueCertificateIfReady({ userId: user.id, courseId });
  if (!result.ok) {
    if (result.error === "incomplete") {
      return NextResponse.json(
        { ok: false, error: "incomplete" },
        { status: 409 }
      );
    }
    if (result.error === "not_found") {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    certificateId: result.certificateId,
    newlyIssued: result.newlyIssued,
  });
}
