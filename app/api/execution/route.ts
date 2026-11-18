
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AccessUser = {
  id: string;
  role: string;
  departmentId: string | null;
};

async function canAccessTask(taskId: string, user: AccessUser) {
  const task = await prisma.workflowTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      requestId: true,
      departmentId: true,
      assignedToId: true,
      status: true,
      procedureTemplateId: true,
      startedAt: true,
      steps: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!task) return null;

  const allowed =
    user.role === "GENERAL_MANAGER" ||
    (user.role === "DEPARTMENT_MANAGER" &&
      user.departmentId === task.departmentId) ||
    (user.role === "EMPLOYEE" &&
      user.id === task.assignedToId);

  return allowed ? task : null;
}

function getDurationSeconds(startedAt: Date, stoppedAt: Date) {
  return Math.max(
    0,
    Math.floor(
      (stoppedAt.getTime() - startedAt.getTime()) / 1000
    )
  );
}

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
      ![
        "GENERAL_MANAGER",
        "DEPARTMENT_MANAGER",
        "EMPLOYEE",
      ].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض المهام" },
        { status: 403 }
      );
    }

    const where =
      user.role === "GENERAL_MANAGER"
        ? {}
        : user.role === "DEPARTMENT_MANAGER"
          ? { departmentId: user.departmentId || "" }
          : { assignedToId: user.id };

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
        steps: {
          orderBy: {
            order: "asc",
          },
        },
        workSessions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Execution GET error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل مهام التنفيذ" },
      { status: 500 }
    );
  }
}

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
      ![
        "GENERAL_MANAGER",
        "DEPARTMENT_MANAGER",
        "EMPLOYEE",
      ].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية تنفيذ المهام" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      action,
      taskId,
      stepId,
      stepStatus,
      stepNotes,
      amount,
      expenseDescription,
    } = body;

    if (
      typeof taskId !== "string" ||
      !taskId.trim() ||
      typeof action !== "string"
    ) {
      return NextResponse.json(
        { error: "بيانات العملية غير مكتملة" },
        { status: 400 }
      );
    }

    const task = await canAccessTask(taskId, user);

    if (!task) {
      return NextResponse.json(
        {
          error:
            "المهمة غير موجودة أو ليس لديك صلاحية الوصول إليها",
        },
        { status: 404 }
      );
    }

    // بدء العمل وتسجيل جلسة زمنية جديدة
    if (action === "START") {
      if (task.status === "COMPLETED") {
        return NextResponse.json(
          { error: "لا يمكن بدء مهمة مكتملة" },
          { status: 400 }
        );
      }

      const existingSession =
        await prisma.workSession.findFirst({
          where: {
            workflowTaskId: taskId,
            userId: user.id,
            stoppedAt: null,
          },
          select: {
            id: true,
            startedAt: true,
          },
        });

      if (existingSession) {
        return NextResponse.json({
          success: true,
          alreadyStarted: true,
          session: existingSession,
          message: "أنت تعمل على هذه المهمة بالفعل",
        });
      }

      // إنشاء خطوات القالب عند بدء المهمة لأول مرة
      if (task.steps.length === 0 && task.procedureTemplateId) {
        const templateSteps =
          await prisma.procedureStepTemplate.findMany({
            where: {
              procedureTemplateId: task.procedureTemplateId,
            },
            orderBy: {
              order: "asc",
            },
          });

        if (templateSteps.length > 0) {
          await prisma.taskStep.createMany({
            data: templateSteps.map((step) => ({
              taskId,
              templateStepId: step.id,
              title: step.title,
              notes: step.description,
              order: step.order,
            })),
          });
        }
      }

      const startedAt = new Date();

      const session = await prisma.$transaction(async (tx) => {
        const newSession = await tx.workSession.create({
          data: {
            workflowTaskId: taskId,
            userId: user.id,
            startedAt,
          },
        });

        await tx.workflowTask.update({
          where: { id: taskId },
          data: {
            status: "IN_PROGRESS",
            startedAt: task.startedAt || startedAt,
          },
        });

        await tx.activityLog.create({
          data: {
            requestId: task.requestId,
            taskId,
            userId: user.id,
            action: "TASK_STARTED",
            details: "تم بدء جلسة عمل جديدة على المهمة",
          },
        });

        return newSession;
      });

      return NextResponse.json({
        success: true,
        session,
        message: "تم بدء تنفيذ المهمة وتسجيل وقت البداية",
      });
    }

    // إيقاف جلسة العمل وحساب مدتها
    if (action === "STOP") {
      const openSession =
        await prisma.workSession.findFirst({
          where: {
            workflowTaskId: taskId,
            userId: user.id,
            stoppedAt: null,
          },
          orderBy: {
            startedAt: "desc",
          },
        });

      if (!openSession) {
        return NextResponse.json(
          { error: "لا توجد جلسة عمل مفتوحة لإيقافها" },
          { status: 400 }
        );
      }

      const stoppedAt = new Date();
      const durationSeconds = getDurationSeconds(
        openSession.startedAt,
        stoppedAt
      );

      const session = await prisma.$transaction(async (tx) => {
        const updatedSession = await tx.workSession.update({
          where: { id: openSession.id },
          data: {
            stoppedAt,
            durationSeconds,
          },
        });

        await tx.activityLog.create({
          data: {
            requestId: task.requestId,
            taskId,
            userId: user.id,
            action: "TASK_STOPPED",
            details: `تم إيقاف جلسة العمل. المدة: ${durationSeconds} ثانية`,
          },
        });

        return updatedSession;
      });

      return NextResponse.json({
        success: true,
        session,
        durationSeconds,
        message: "تم إيقاف العمل وتسجيل المدة",
      });
    }

    // تحديث خطوة من خطوات التنفيذ
    if (action === "UPDATE_STEP") {
      if (!stepId) {
        return NextResponse.json(
          { error: "يجب تحديد خطوة التنفيذ" },
          { status: 400 }
        );
      }

      if (
        !["PENDING", "IN_PROGRESS", "COMPLETED"].includes(
          stepStatus
        )
      ) {
        return NextResponse.json(
          { error: "حالة الخطوة غير صحيحة" },
          { status: 400 }
        );
      }

      if (task.status === "COMPLETED") {
        return NextResponse.json(
          { error: "المهمة مكتملة بالفعل" },
          { status: 400 }
        );
      }

      const step = await prisma.taskStep.findFirst({
        where: {
          id: stepId,
          taskId,
        },
      });

      if (!step) {
        return NextResponse.json(
          { error: "خطوة التنفيذ غير موجودة" },
          { status: 404 }
        );
      }

      await prisma.taskStep.update({
        where: {
          id: stepId,
        },
        data: {
          status: stepStatus,
          notes:
            typeof stepNotes === "string"
              ? stepNotes
              : step.notes,
          completedAt:
            stepStatus === "COMPLETED"
              ? new Date()
              : null,
        },
      });

      await prisma.activityLog.create({
        data: {
          requestId: task.requestId,
          taskId,
          userId: user.id,
          action: "TASK_STEP_UPDATED",
          details: `تم تحديث خطوة التنفيذ: ${step.title} - ${stepStatus}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "تم تحديث خطوة التنفيذ",
      });
    }

    // إضافة مصروف للمهمة
    if (action === "ADD_EXPENSE") {
      if (task.status === "COMPLETED") {
        return NextResponse.json(
          { error: "لا يمكن إضافة مصروف لمهمة مكتملة" },
          { status: 400 }
        );
      }

      const parsedAmount = Number(amount);

      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        typeof expenseDescription !== "string" ||
        !expenseDescription.trim()
      ) {
        return NextResponse.json(
          { error: "أدخل مبلغًا صحيحًا ووصفًا للمصروف" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.expense.create({
          data: {
            requestId: task.requestId,
            taskId,
            employeeId: user.id,
            amount: parsedAmount,
            description: expenseDescription.trim(),
          },
        });

        await tx.activityLog.create({
          data: {
            requestId: task.requestId,
            taskId,
            userId: user.id,
            action: "TASK_EXPENSE_ADDED",
            details: `تم تسجيل مصروف بقيمة ${parsedAmount}: ${expenseDescription.trim()}`,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "تم تسجيل المصروف",
      });
    }

    // إكمال المهمة وإغلاق جلسات العمل المفتوحة عليها
    if (action === "COMPLETE") {
      if (task.status === "COMPLETED") {
        return NextResponse.json({
          success: true,
          message: "المهمة مكتملة بالفعل",
        });
      }

      const pendingSteps = await prisma.taskStep.count({
        where: {
          taskId,
          status: {
            not: "COMPLETED",
          },
        },
      });

      if (pendingSteps > 0) {
        return NextResponse.json(
          {
            error:
              "يجب إكمال جميع خطوات المهمة أولاً",
          },
          { status: 400 }
        );
      }

      const completedAt = new Date();

      await prisma.$transaction(async (tx) => {
        const openSessions =
          await tx.workSession.findMany({
            where: {
              workflowTaskId: taskId,
              stoppedAt: null,
            },
            select: {
              id: true,
              startedAt: true,
            },
          });

        for (const session of openSessions) {
          await tx.workSession.update({
            where: {
              id: session.id,
            },
            data: {
              stoppedAt: completedAt,
              durationSeconds: getDurationSeconds(
                session.startedAt,
                completedAt
              ),
            },
          });
        }

        await tx.workflowTask.update({
          where: {
            id: taskId,
          },
          data: {
            status: "COMPLETED",
            completedAt,
            startedAt: task.startedAt || completedAt,
          },
        });

        await tx.activityLog.create({
          data: {
            requestId: task.requestId,
            taskId,
            userId: user.id,
            action: "TASK_COMPLETED",
            details:
              "تم الانتهاء من تنفيذ المهمة وإغلاق جلسات العمل المفتوحة",
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "تم إكمال المهمة بنجاح",
      });
    }

    return NextResponse.json(
      { error: "العملية المطلوبة غير معروفة" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Execution POST error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تنفيذ العملية" },
      { status: 500 }
    );
  }
}
