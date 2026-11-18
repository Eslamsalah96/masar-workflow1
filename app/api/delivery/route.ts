
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
        { error: "ليس لديك صلاحية عرض مهام التسليم" },
        { status: 403 }
      );
    }

    const tasks = await prisma.workflowTask.findMany({
      where: {
        status: {
          in: ["APPROVED", "DELIVERED"],
        },
        ...(user.role === "DEPARTMENT_MANAGER"
          ? { departmentId: user.departmentId || "" }
          : {}),
      },
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            serviceName: true,
            status: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
        activities: {
          where: {
            action: "TASK_DELIVERED",
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

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Delivery GET error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل مهام التسليم" },
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
        { error: "ليس لديك صلاحية تنفيذ التسليم" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      taskId,
      deliveryMethod,
      deliveryOutputs,
      deliveryDate,
      deliveryNotes,
    } = body;

    if (
      typeof taskId !== "string" ||
      !taskId ||
      typeof deliveryMethod !== "string" ||
      !deliveryMethod.trim() ||
      typeof deliveryOutputs !== "string" ||
      !deliveryOutputs.trim() ||
      typeof deliveryDate !== "string" ||
      !deliveryDate.trim()
    ) {
      return NextResponse.json(
        { error: "أكمل بيانات التسليم المطلوبة" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(deliveryDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "تاريخ التسليم غير صحيح" },
        { status: 400 }
      );
    }

    const task = await prisma.workflowTask.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        title: true,
        requestId: true,
        departmentId: true,
        status: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "المهمة غير موجودة" },
        { status: 404 }
      );
    }

    if (
      user.role === "DEPARTMENT_MANAGER" &&
      user.departmentId !== task.departmentId
    ) {
      return NextResponse.json(
        { error: "لا يمكنك تسليم مهمة تابعة لقسم آخر" },
        { status: 403 }
      );
    }

    if (task.status !== "APPROVED") {
      return NextResponse.json(
        { error: "لا يمكن تسليم المهمة إلا بعد اعتمادها من المراجعة" },
        { status: 400 }
      );
    }

    const details = JSON.stringify({
      deliveryMethod: deliveryMethod.trim(),
      deliveryOutputs: deliveryOutputs.trim(),
      deliveryDate: parsedDate.toISOString(),
      deliveryNotes:
        typeof deliveryNotes === "string"
          ? deliveryNotes.trim()
          : "",
      deliveredBy: user.name,
    });

    await prisma.$transaction([
      prisma.workflowTask.update({
        where: {
          id: taskId,
        },
        data: {
          status: "DELIVERED",
        },
      }),
      prisma.activityLog.create({
        data: {
          requestId: task.requestId,
          taskId,
          userId: user.id,
          action: "TASK_DELIVERED",
          details,
        },
      }),
    ]);

    const remainingTasks = await prisma.workflowTask.count({
      where: {
        requestId: task.requestId,
        status: {
          not: "DELIVERED",
        },
      },
    });

    if (remainingTasks === 0) {
      await prisma.request.update({
        where: {
          id: task.requestId,
        },
        data: {
          status: "DELIVERED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message:
        remainingTasks === 0
          ? "تم تسليم جميع مهام الطلب وتحديث حالة الطلب"
          : "تم تسجيل تسليم المهمة بنجاح",
    });
  } catch (error) {
    console.error("Delivery POST error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل التسليم" },
      { status: 500 }
    );
  }
}
