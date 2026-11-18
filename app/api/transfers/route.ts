
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
        { error: "غير مصرح لك بعرض بيانات التحويل" },
        { status: 403 }
      );
    }

    const requestWhere: Record<string, unknown> = {
      status: "READY_FOR_ASSIGNMENT",
    };

    if (user.role === "DEPARTMENT_MANAGER") {
      requestWhere.currentDepartmentId = user.departmentId;
    }

    const [departments, requests] = await Promise.all([
      prisma.department.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.request.findMany({
        where: requestWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          requestNumber: true,
          serviceName: true,
          status: true,
          currentDepartmentId: true,
          customer: {
            select: { name: true },
          },
          currentDepartment: {
            select: { name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ departments, requests });
  } catch (error) {
    console.error("GET transfers error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل بيانات التحويل" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: "غير مصرح لك بتحويل الطلبات" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const requestId = String(body.requestId || "").trim();
    const toDepartmentId = String(body.toDepartmentId || "").trim();
    const notes = String(body.notes || "").trim();

    if (!requestId || !toDepartmentId) {
      return NextResponse.json(
        { error: "اختر الطلب والقسم المستلم" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const requestData = await tx.request.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          requestNumber: true,
          currentDepartmentId: true,
          status: true,
        },
      });

      if (!requestData) {
        throw new Error("الطلب غير موجود");
      }

      if (requestData.status !== "READY_FOR_ASSIGNMENT") {
        throw new Error("لا يمكن تحويل الطلب قبل موافقة المدير");
      }

      if (
        user.role === "DEPARTMENT_MANAGER" &&
        requestData.currentDepartmentId !== user.departmentId
      ) {
        throw new Error("لا يمكنك تحويل طلب خارج قسمك");
      }

      // التأكد من أن آخر مراجعة للطلب كانت موافقة
      const latestReview = await tx.requestManagerReview.findFirst({
        where: { requestId },
        orderBy: { createdAt: "desc" },
        select: {
          action: true,
        },
      });

      if (!latestReview || latestReview.action !== "APPROVED") {
        throw new Error("يجب اعتماد الطلب من المدير قبل تحويله");
      }

      if (requestData.currentDepartmentId === toDepartmentId) {
        throw new Error("الطلب موجود بالفعل في هذا القسم");
      }

      const destination = await tx.department.findUnique({
        where: { id: toDepartmentId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!destination) {
        throw new Error("القسم المستلم غير موجود");
      }

      const transfer = await tx.requestTransfer.create({
        data: {
          requestId,
          fromDepartmentId: requestData.currentDepartmentId,
          toDepartmentId,
          transferredById: user.id,
          notes: notes || null,
        },
      });

      await tx.request.update({
        where: { id: requestId },
        data: {
          currentDepartmentId: toDepartmentId,
        },
      });

      await tx.activityLog.create({
        data: {
          requestId,
          userId: user.id,
          action: "REQUEST_TRANSFERRED",
          details: `تم تحويل الطلب ${requestData.requestNumber} إلى قسم ${destination.name}${
            notes ? `. ملاحظات: ${notes}` : ""
          }`,
        },
      });

      const destinationUsers = await tx.user.findMany({
        where: {
          departmentId: toDepartmentId,
          isActive: true,
          role: {
            in: ["DEPARTMENT_MANAGER", "EMPLOYEE"],
          },
        },
        select: {
          id: true,
        },
      });

      if (destinationUsers.length > 0) {
        await tx.notification.createMany({
          data: destinationUsers.map((item) => ({
            userId: item.id,
            title: "طلب جديد وارد للقسم",
            message: `تم تحويل الطلب ${requestData.requestNumber} إلى قسم ${destination.name}`,
          })),
        });
      }

      return transfer;
    });

    return NextResponse.json(
      {
        message: "تم تحويل الطلب بنجاح",
        transfer: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST transfers error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ أثناء تحويل الطلب";

    const knownErrors = [
      "الطلب غير موجود",
      "لا يمكن تحويل الطلب قبل موافقة المدير",
      "لا يمكنك تحويل طلب خارج قسمك",
      "يجب اعتماد الطلب من المدير قبل تحويله",
      "الطلب موجود بالفعل في هذا القسم",
      "القسم المستلم غير موجود",
    ];

    const status = knownErrors.includes(message) ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
