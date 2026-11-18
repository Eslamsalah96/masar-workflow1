
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = [
  "GENERAL_MANAGER",
  "DEPARTMENT_MANAGER",
];

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: "غير مصرح لك بعرض طلبات المطابقة" },
        { status: 403 }
      );
    }

    const where =
      user.role === "GENERAL_MANAGER"
        ? {}
        : { currentDepartmentId: user.departmentId };

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requestNumber: true,
        serviceName: true,
        status: true,
        customer: { select: { name: true } },
        currentDepartment: { select: { name: true } },
        documentRequirements: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            details: true,
            isRequired: true,
            kind: true,
            status: true,
            fileName: true,
          },
        },
        activities: {
          where: {
            action: {
              in: ["MATCHING_STARTED", "MATCHING_COMPLETED"],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            action: true,
            details: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    const visibleRequests =
      user.role === "EMPLOYEE"
        ? requests.filter((item) =>
            item.documentRequirements.length > 0
          )
        : requests;

    return NextResponse.json({ requests: visibleRequests });
  } catch (error) {
    console.error("GET matching error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل طلبات المطابقة" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: "غير مصرح لك بتنفيذ المطابقة" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const requestId = String(body.requestId || "").trim();
    const action = String(body.action || "").trim();
    const result = String(body.result || "").trim();
    const notes = String(body.notes || "").trim();

    if (!requestId || !["START", "COMPLETE"].includes(action)) {
      return NextResponse.json(
        { error: "بيانات المطابقة غير مكتملة" },
        { status: 400 }
      );
    }

    if (
      action === "COMPLETE" &&
      !["MATCHED", "NOT_MATCHED", "NEEDS_COMPLETION"].includes(result)
    ) {
      return NextResponse.json(
        { error: "اختر نتيجة مطابقة صحيحة" },
        { status: 400 }
      );
    }

    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestNumber: true,
        currentDepartmentId: true,
        documentRequirements: {
          select: {
            title: true,
            isRequired: true,
            status: true,
            kind: true,
          },
        },
      },
    });

    if (!requestData) {
      return NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    if (
      user.role !== "GENERAL_MANAGER" &&
      requestData.currentDepartmentId !== user.departmentId
    ) {
      return NextResponse.json(
        { error: "الطلب ليس تابعًا لقسمك الحالي" },
        { status: 403 }
      );
    }

    const latestActivities = await prisma.activityLog.findMany({
      where: {
        requestId,
        action: {
          in: ["MATCHING_STARTED", "MATCHING_COMPLETED"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: {
        action: true,
        createdAt: true,
      },
    });

    const latest = latestActivities[0];

    if (action === "START") {
      if (latest?.action === "MATCHING_STARTED") {
        return NextResponse.json(
          { error: "المطابقة بدأت بالفعل لهذا الطلب" },
          { status: 400 }
        );
      }

      await prisma.activityLog.create({
        data: {
          requestId,
          userId: user.id,
          action: "MATCHING_STARTED",
          details: `بدأت مطابقة مستندات الطلب ${requestData.requestNumber}`,
        },
      });

      await prisma.request.update({
        where: { id: requestId },
        data: { status: "MATCHING_IN_PROGRESS" },
      });

      return NextResponse.json({
        message: "تم تسجيل بداية المطابقة",
      });
    }

    if (!latest || latest.action !== "MATCHING_STARTED") {
      return NextResponse.json(
        { error: "يجب بدء المطابقة أولاً قبل تسجيل النتيجة" },
        { status: 400 }
      );
    }

    if (
      result === "MATCHED" &&
      requestData.documentRequirements.some(
        (document) =>
          document.isRequired &&
          document.kind === "DOCUMENT" &&
          document.status !== "RECEIVED"
      )
    ) {
      return NextResponse.json(
        { error: "لا يمكن اعتماد المطابقة قبل استلام كل المستندات الإلزامية" },
        { status: 400 }
      );
    }

    const completedAt = new Date();
    const durationMs =
      completedAt.getTime() - latest.createdAt.getTime();
    const durationMinutes = Math.max(
      0,
      Math.round(durationMs / 60000)
    );
    const exceededTwoHours = durationMs > 2 * 60 * 60 * 1000;

    const resultLabels: Record<string, string> = {
      MATCHED: "مطابقة",
      NOT_MATCHED: "غير مطابقة",
      NEEDS_COMPLETION: "تحتاج إلى استكمال",
    };

    await prisma.$transaction([
      prisma.activityLog.create({
        data: {
          requestId,
          userId: user.id,
          action: "MATCHING_COMPLETED",
          details: JSON.stringify({
            result,
            resultLabel: resultLabels[result],
            notes,
            durationMinutes,
            exceededTwoHours,
            startedAt: latest.createdAt.toISOString(),
            completedAt: completedAt.toISOString(),
          }),
        },
      }),
      prisma.request.update({
        where: { id: requestId },
        data: {
          status:
            result === "MATCHED"
              ? "MATCHED"
              : result === "NOT_MATCHED"
                ? "DOCUMENTS_NOT_MATCHED"
                : "DOCUMENTS_INCOMPLETE",
        },
      }),
    ]);

    return NextResponse.json({
      message: "تم حفظ نتيجة المطابقة بنجاح",
      durationMinutes,
      exceededTwoHours,
      resultLabel: resultLabels[result],
    });
  } catch (error) {
    console.error("POST matching error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل المطابقة" },
      { status: 500 }
    );
  }
}
