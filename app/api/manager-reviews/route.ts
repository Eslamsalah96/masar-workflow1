
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ==========================================
// عرض الطلبات التي وصلت إلى القسم للمراجعة
// ==========================================

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (
      !["GENERAL_MANAGER", "DEPARTMENT_MANAGER"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "هذه الصفحة متاحة للمدير العام ومديري الأقسام فقط" },
        { status: 403 }
      );
    }

    if (
      user.role === "DEPARTMENT_MANAGER" &&
      !user.departmentId
    ) {
      return NextResponse.json(
        { error: "حساب المدير غير مرتبط بقسم" },
        { status: 400 }
      );
    }

    const requests = await prisma.request.findMany({
      where: {
        ...(user.role === "DEPARTMENT_MANAGER"
          ? { currentDepartmentId: user.departmentId! }
          : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        currentDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
        managerReviews: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        documentRequirements: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            id: true,
            title: true,
            kind: true,
            isRequired: true,
            status: true,
            notes: true,
            value: true,
            fileName: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        receivedAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Manager reviews GET error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل الطلبات" },
      { status: 500 }
    );
  }
}

// ==========================================
// اعتماد الطلب أو إرجاعه للسكرتارية
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (
      !["GENERAL_MANAGER", "DEPARTMENT_MANAGER"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية مراجعة الطلبات" },
        { status: 403 }
      );
    }

    if (
      user.role === "DEPARTMENT_MANAGER" &&
      !user.departmentId
    ) {
      return NextResponse.json(
        { error: "حساب المدير غير مرتبط بقسم" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";

    const decision =
      typeof body.decision === "string"
        ? body.decision.trim().toUpperCase()
        : "";

    const feedback =
      typeof body.feedback === "string"
        ? body.feedback.trim()
        : "";

    if (!requestId || !["APPROVE", "RETURN"].includes(decision)) {
      return NextResponse.json(
        { error: "بيانات المراجعة غير صحيحة" },
        { status: 400 }
      );
    }

    if (feedback.length > 3000) {
      return NextResponse.json(
        { error: "الملاحظات أطول من الحد المسموح" },
        { status: 400 }
      );
    }

    if (decision === "RETURN" && !feedback) {
      return NextResponse.json(
        { error: "يجب كتابة سبب إرجاع الطلب" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const requestData = await tx.request.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          requestNumber: true,
          serviceName: true,
          createdById: true,
          currentDepartmentId: true,
          status: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!requestData) {
        throw new Error("الطلب غير موجود");
      }

      if (
        user.role === "DEPARTMENT_MANAGER" &&
        requestData.currentDepartmentId !== user.departmentId
      ) {
        throw new Error("لا يمكنك مراجعة طلب خارج قسمك");
      }

      if (!requestData.currentDepartmentId) {
        throw new Error("يجب تحويل الطلب إلى قسم أولاً");
      }

      const latestReview = await tx.requestManagerReview.findFirst({
        where: { requestId },
        orderBy: { createdAt: "desc" },
        select: {
          action: true,
        },
      });

      if (latestReview?.action === "APPROVED") {
        throw new Error("تم اعتماد هذا الطلب بالفعل");
      }

      const reviewAction =
        decision === "APPROVE" ? "APPROVED" : "RETURNED";

      const newRequestStatus =
        decision === "APPROVE"
          ? "READY_FOR_ASSIGNMENT"
          : "RETURNED_TO_SECRETARY";

      const review = await tx.requestManagerReview.create({
        data: {
          requestId,
          reviewerId: user.id,
          action: reviewAction,
          feedback: feedback || null,
          reviewedAt: new Date(),
        },
      });

      await tx.request.update({
        where: { id: requestId },
        data: {
          status: newRequestStatus,
        },
      });

      await tx.activityLog.create({
        data: {
          requestId,
          userId: user.id,
          action:
            decision === "APPROVE"
              ? "REQUEST_MANAGER_APPROVED"
              : "REQUEST_RETURNED_TO_SECRETARY",
          details: JSON.stringify({
            requestNumber: requestData.requestNumber,
            decision,
            feedback,
            reviewerName: user.name,
          }),
        },
      });

      await tx.notification.create({
        data: {
          userId: requestData.createdById,
          title:
            decision === "APPROVE"
              ? "تم اعتماد الطلب"
              : "تم إرجاع الطلب للمراجعة",
          message:
            decision === "APPROVE"
              ? `تم اعتماد الطلب ${requestData.requestNumber} وأصبح جاهزًا لتوزيع المهام`
              : `تم إرجاع الطلب ${requestData.requestNumber}. السبب: ${feedback}`,
        },
      });

      return {
        review,
        requestNumber: requestData.requestNumber,
        customerName: requestData.customer.name,
        status: newRequestStatus,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message:
          decision === "APPROVE"
            ? "تم اعتماد الطلب وأصبح جاهزًا لتوزيع المهام"
            : "تم إرجاع الطلب إلى مقدم الطلب مع توضيح السبب",
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Manager review POST error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ أثناء مراجعة الطلب";

    const knownErrors = [
      "الطلب غير موجود",
      "لا يمكنك مراجعة طلب خارج قسمك",
      "يجب تحويل الطلب إلى قسم أولاً",
      "تم اعتماد هذا الطلب بالفعل",
    ];

    return NextResponse.json(
      { error: message },
      {
        status: knownErrors.includes(message) ? 400 : 500,
      }
    );
  }
}
