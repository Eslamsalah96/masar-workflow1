
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (!["GENERAL_MANAGER", "DEPARTMENT_MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض مهام المراجعة" },
        { status: 403 }
      );
    }

    const where = {
      status: {
        in: ["COMPLETED", "APPROVED", "REJECTED"],
      },
      ...(user.role === "DEPARTMENT_MANAGER"
        ? { departmentId: user.departmentId || "" }
        : {}),
    };

    const tasks = await prisma.workflowTask.findMany({
      where,
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            serviceName: true,
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
            id: true,
            name: true,
          },
        },
        activities: {
          where: {
            action: {
              in: ["TASK_APPROVED", "TASK_RETURNED", "TASK_REJECTED"],
            },
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
    console.error("Review GET error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل مهام المراجعة" },
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

    if (!["GENERAL_MANAGER", "DEPARTMENT_MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية مراجعة المهام" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { taskId, decision, notes } = body;

    if (
      typeof taskId !== "string" ||
      !taskId ||
      !["APPROVE", "RETURN", "REJECT"].includes(decision)
    ) {
      return NextResponse.json(
        { error: "بيانات المراجعة غير صحيحة" },
        { status: 400 }
      );
    }

    const task = await prisma.workflowTask.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        requestId: true,
        departmentId: true,
        status: true,
        title: true,
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
        { error: "لا يمكنك مراجعة مهام قسم آخر" },
        { status: 403 }
      );
    }

    if (!["COMPLETED", "APPROVED", "REJECTED"].includes(task.status)) {
      return NextResponse.json(
        { error: "لا يمكن مراجعة هذه المهمة في حالتها الحالية" },
        { status: 400 }
      );
    }

    if (
      decision !== "APPROVE" &&
      (typeof notes !== "string" || !notes.trim())
    ) {
      return NextResponse.json(
        { error: "يجب كتابة سبب الإرجاع أو الرفض" },
        { status: 400 }
      );
    }

    const status =
      decision === "APPROVE"
        ? "APPROVED"
        : decision === "RETURN"
          ? "IN_PROGRESS"
          : "REJECTED";

    const action =
      decision === "APPROVE"
        ? "TASK_APPROVED"
        : decision === "RETURN"
          ? "TASK_RETURNED"
          : "TASK_REJECTED";

    const message =
      decision === "APPROVE"
        ? "تم اعتماد المهمة"
        : decision === "RETURN"
          ? "تم إرجاع المهمة للموظف لاستكمال التعديلات"
          : "تم رفض المهمة";

    await prisma.$transaction([
      prisma.workflowTask.update({
        where: {
          id: taskId,
        },
        data: {
          status,
          ...(decision === "RETURN"
            ? {
                completedAt: null,
              }
            : {}),
        },
      }),
      prisma.activityLog.create({
        data: {
          requestId: task.requestId,
          taskId,
          userId: user.id,
          action,
          details: JSON.stringify({
            decision,
            notes: typeof notes === "string" ? notes.trim() : "",
            reviewer: user.name,
            taskTitle: task.title,
          }),
        },
      }),
    ]);

    if (decision === "RETURN") {
      const assignedTo = await prisma.workflowTask.findUnique({
        where: {
          id: taskId,
        },
        select: {
          assignedToId: true,
        },
      });

      if (assignedTo?.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: assignedTo.assignedToId,
            title: "تم إرجاع مهمة للتعديل",
            message: `تم إرجاع المهمة "${task.title}" لاستكمال التعديلات. ${notes.trim()}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Review POST error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ قرار المراجعة" },
      { status: 500 }
    );
  }
}
