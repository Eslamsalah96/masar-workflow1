
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["GENERAL_MANAGER", "DEPARTMENT_MANAGER"];

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض طلبات الإغلاق" },
        { status: 403 }
      );
    }

    const requests = await prisma.request.findMany({
      where: {
        status: {
          in: ["DELIVERED", "CLOSED"],
        },
        ...(user.role === "DEPARTMENT_MANAGER"
          ? { currentDepartmentId: user.departmentId || "" }
          : {}),
        tasks: {
          some: {},
          none: {
            status: {
              not: "DELIVERED",
            },
          },
        },
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        currentDepartment: {
          select: {
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        activities: {
          where: {
            action: "REQUEST_CLOSED",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Closure GET error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل طلبات الإغلاق" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية إغلاق الطلبات" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      requestId,
      clientReceived,
      closureDate,
      clientRating,
      closureNotes,
    } = body;

    if (
      typeof requestId !== "string" ||
      !requestId ||
      clientReceived !== "تم الاستلام" ||
      typeof closureDate !== "string" ||
      !closureDate
    ) {
      return NextResponse.json(
        { error: "يجب تأكيد استلام العميل وإدخال تاريخ الإغلاق" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(closureDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "تاريخ الإغلاق غير صحيح" },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.request.findUnique({
      where: {
        id: requestId,
      },
      select: {
        id: true,
        requestNumber: true,
        status: true,
        currentDepartmentId: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    if (
      user.role === "DEPARTMENT_MANAGER" &&
      user.departmentId !== existingRequest.currentDepartmentId
    ) {
      return NextResponse.json(
        { error: "لا يمكنك إغلاق طلب تابع لقسم آخر" },
        { status: 403 }
      );
    }

    if (existingRequest.status === "CLOSED") {
      return NextResponse.json(
        { error: "تم إغلاق هذا الطلب بالفعل" },
        { status: 400 }
      );
    }

    if (existingRequest.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "يجب تسليم الطلب أولاً قبل إغلاقه" },
        { status: 400 }
      );
    }

    const [totalTasks, unfinishedTasks] = await Promise.all([
      prisma.workflowTask.count({
        where: {
          requestId,
        },
      }),
      prisma.workflowTask.count({
        where: {
          requestId,
          status: {
            not: "DELIVERED",
          },
        },
      }),
    ]);

    if (totalTasks === 0 || unfinishedTasks > 0) {
      return NextResponse.json(
        { error: "لا يمكن إغلاق الطلب قبل تسليم جميع مهامه" },
        { status: 400 }
      );
    }

    const details = JSON.stringify({
      clientReceived,
      closureDate: parsedDate.toISOString(),
      clientRating:
        typeof clientRating === "string" ? clientRating : "",
      closureNotes:
        typeof closureNotes === "string" ? closureNotes.trim() : "",
      closedBy: user.name,
    });

    await prisma.$transaction([
      prisma.request.update({
        where: {
          id: requestId,
        },
        data: {
          status: "CLOSED",
          closedAt: parsedDate,
        },
      }),
      prisma.activityLog.create({
        data: {
          requestId,
          userId: user.id,
          action: "REQUEST_CLOSED",
          details,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "تم إغلاق الطلب بنجاح",
    });
  } catch (error) {
    console.error("Closure POST error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء إغلاق الطلب" },
      { status: 500 }
    );
  }
}
