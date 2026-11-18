
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const suggestedTaskNames = [
  "مراجعة الطلب",
  "إعداد المستندات",
  "استخراج التراخيص",
  "مراجعة قانونية",
  "مراجعة مالية",
  "التواصل مع العميل",
  "تجهيز الملف النهائي",
  "مهمة أخرى",
];

type AssignmentInput = {
  assignedToId: string;
  taskName?: string;
  instructions?: string;
  expectedEndAt?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (
      user.role !== "GENERAL_MANAGER" &&
      user.role !== "DEPARTMENT_MANAGER" &&
      user.role !== "EMPLOYEE"
    ) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض المهام" },
        { status: 403 }
      );
    }

    const requestedDepartmentId =
      request.nextUrl.searchParams.get("departmentId");

    let departmentId: string | undefined;

    if (
      user.role === "DEPARTMENT_MANAGER" ||
      user.role === "EMPLOYEE"
    ) {
      if (!user.departmentId) {
        return NextResponse.json(
          { error: "المستخدم غير مرتبط بقسم" },
          { status: 403 }
        );
      }

      departmentId = user.departmentId;
    } else if (requestedDepartmentId) {
      departmentId = requestedDepartmentId;
    }

    const taskWhere: {
      departmentId?: string;
      assignedToId?: string;
    } = {};

    if (departmentId) {
      taskWhere.departmentId = departmentId;
    }

    if (user.role === "EMPLOYEE") {
      taskWhere.assignedToId = user.id;
    }

    const [departments, employees, taskTypes, tasks] =
      await Promise.all([
        user.role === "GENERAL_MANAGER"
          ? prisma.department.findMany({
              orderBy: { name: "asc" },
            })
          : prisma.department.findMany({
              where: { id: user.departmentId! },
            }),

        user.role === "EMPLOYEE"
          ? Promise.resolve([])
          : prisma.user.findMany({
              where: {
                isActive: true,
                role: "EMPLOYEE",
                ...(departmentId ? { departmentId } : {}),
              },
              select: {
                id: true,
                name: true,
                departmentId: true,
              },
              orderBy: { name: "asc" },
            }),

        prisma.taskType.findMany({
          where: {
            isActive: true,
            ...(departmentId ? { departmentId } : {}),
          },
          include: {
            department: {
              select: { id: true, name: true },
            },
          },
          orderBy: { name: "asc" },
        }),

        prisma.workflowTask.findMany({
          where: taskWhere,
          include: {
            request: {
              select: {
                id: true,
                requestNumber: true,
                serviceName: true,
                customer: {
                  select: { name: true },
                },
              },
            },
            department: {
              select: { id: true, name: true },
            },
            taskType: {
              select: { id: true, name: true },
            },
            assignedTo: {
              select: { id: true, name: true },
            },
            assignedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);

    return NextResponse.json({
      departments,
      employees,
      taskTypes,
      suggestedTaskNames,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks API error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل المهام" },
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
      user.role !== "GENERAL_MANAGER" &&
      user.role !== "DEPARTMENT_MANAGER"
    ) {
      return NextResponse.json(
        {
          error:
            "توزيع المهام متاح للمدير العام ومديري الأقسام فقط",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";

    const departmentId =
      typeof body.departmentId === "string"
        ? body.departmentId.trim()
        : "";

    if (!requestId || !departmentId) {
      return NextResponse.json(
        { error: "يجب تحديد الطلب والقسم" },
        { status: 400 }
      );
    }

    if (
      user.role === "DEPARTMENT_MANAGER" &&
      user.departmentId !== departmentId
    ) {
      return NextResponse.json(
        { error: "لا يمكنك توزيع مهام خارج قسمك" },
        { status: 403 }
      );
    }

    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestNumber: true,
        currentDepartmentId: true,
        deadlineAt: true,
        status: true,
      },
    });

    if (!requestData) {
      return NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    if (requestData.currentDepartmentId !== departmentId) {
      return NextResponse.json(
        { error: "يجب تحويل الطلب إلى هذا القسم أولاً" },
        { status: 400 }
      );
    }

    if (requestData.status !== "READY_FOR_ASSIGNMENT") {
      return NextResponse.json(
        { error: "حالة الطلب لا تسمح بتوزيع المهام حالياً" },
        { status: 400 }
      );
    }

    // التأكد من وجود تحويل فعلي مسجل إلى القسم الحالي.
    // لا نستخدم createdAt لأنه غير موجود في نموذج RequestTransfer.
    const departmentTransfer = await prisma.requestTransfer.findFirst({
      where: {
        requestId,
        toDepartmentId: departmentId,
      },
      select: {
        id: true,
      },
    });

    if (!departmentTransfer) {
      return NextResponse.json(
        {
          error:
            "لا يمكن توزيع المهام قبل تحويل الطلب فعلياً إلى القسم",
        },
        { status: 400 }
      );
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true },
    });

    if (!department) {
      return NextResponse.json(
        { error: "القسم غير موجود" },
        { status: 404 }
      );
    }

    const latestManagerReview =
      await prisma.requestManagerReview.findFirst({
        where: { requestId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
        },
      });

    if (latestManagerReview?.action !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "لا يمكن توزيع المهام قبل اعتماد الطلب من المدير",
        },
        { status: 400 }
      );
    }

    let assignments: AssignmentInput[] = [];

    if (Array.isArray(body.assignments)) {
      assignments = body.assignments.map(
        (item: AssignmentInput) => ({
          assignedToId:
            typeof item.assignedToId === "string"
              ? item.assignedToId.trim()
              : "",
          taskName:
            typeof item.taskName === "string"
              ? item.taskName.trim()
              : undefined,
          instructions:
            typeof item.instructions === "string"
              ? item.instructions.trim()
              : undefined,
          expectedEndAt: item.expectedEndAt,
        })
      );
    } else if (Array.isArray(body.assignedToIds)) {
      assignments = body.assignedToIds.map(
        (id: string) => ({
          assignedToId:
            typeof id === "string" ? id.trim() : "",
        })
      );
    } else if (typeof body.assignedToId === "string") {
      assignments = [
        {
          assignedToId: body.assignedToId.trim(),
        },
      ];
    }

    const commonTaskName =
      typeof body.taskName === "string"
        ? body.taskName.trim()
        : "";

    const commonInstructions =
      typeof body.instructions === "string"
        ? body.instructions.trim()
        : "";

    assignments = assignments.map((item) => ({
      ...item,
      taskName: item.taskName || commonTaskName,
      instructions:
        item.instructions !== undefined
          ? item.instructions
          : commonInstructions,
    }));

    if (assignments.length === 0) {
      return NextResponse.json(
        { error: "اختر موظفاً واحداً على الأقل" },
        { status: 400 }
      );
    }

    if (assignments.length > 30) {
      return NextResponse.json(
        { error: "لا يمكن توزيع أكثر من 30 مهمة في المرة الواحدة" },
        { status: 400 }
      );
    }

    for (const assignment of assignments) {
      if (!assignment.assignedToId || !assignment.taskName) {
        return NextResponse.json(
          {
            error:
              "يجب تحديد الموظف واسم المهمة لكل عملية توزيع",
          },
          { status: 400 }
        );
      }

      if (
        assignment.taskName.length > 120 ||
        (assignment.instructions?.length || 0) > 3000
      ) {
        return NextResponse.json(
          {
            error:
              "اسم المهمة أو التعليمات أطول من المسموح",
          },
          { status: 400 }
        );
      }
    }

    const employeeIds = assignments.map(
      (item) => item.assignedToId
    );

    if (new Set(employeeIds).size !== employeeIds.length) {
      return NextResponse.json(
        {
          error:
            "يوجد موظف مكرر في قائمة التوزيع. اختر كل موظف مرة واحدة",
        },
        { status: 400 }
      );
    }

    const employees = await prisma.user.findMany({
      where: {
        id: { in: employeeIds },
        isActive: true,
        role: "EMPLOYEE",
        departmentId,
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
      },
    });

    if (employees.length !== employeeIds.length) {
      return NextResponse.json(
        {
          error:
            "يوجد موظف غير نشط أو لا يتبع القسم المحدد",
        },
        { status: 400 }
      );
    }

    const employeeMap = new Map(
      employees.map((employee) => [
        employee.id,
        employee,
      ])
    );

    let commonExpectedEndAt: Date | null = null;

    if (body.expectedEndAt) {
      commonExpectedEndAt = new Date(body.expectedEndAt);

      if (Number.isNaN(commonExpectedEndAt.getTime())) {
        return NextResponse.json(
          { error: "تاريخ الانتهاء المتوقع غير صحيح" },
          { status: 400 }
        );
      }
    }

    let requestDeadlineAt: Date | undefined;

    if (
      body.deadlineAt !== undefined &&
      body.deadlineAt !== null &&
      body.deadlineAt !== ""
    ) {
      requestDeadlineAt = new Date(body.deadlineAt);

      if (Number.isNaN(requestDeadlineAt.getTime())) {
        return NextResponse.json(
          { error: "الموعد النهائي للطلب غير صحيح" },
          { status: 400 }
        );
      }
    }

    const preparedAssignments = assignments.map((assignment) => {
      let expectedEndAt = commonExpectedEndAt;

      if (assignment.expectedEndAt) {
        expectedEndAt = new Date(assignment.expectedEndAt);

        if (Number.isNaN(expectedEndAt.getTime())) {
          throw new Error(
            `تاريخ انتهاء المهمة "${assignment.taskName}" غير صحيح`
          );
        }
      }

      return {
        ...assignment,
        expectedEndAt,
        employee: employeeMap.get(assignment.assignedToId)!,
      };
    });

    const tasks = await prisma.$transaction(async (tx) => {
      const createdTasks = [];

      for (const assignment of preparedAssignments) {
        const taskName = assignment.taskName!;
        const employee = assignment.employee;

        const taskType = await tx.taskType.upsert({
          where: {
            name_departmentId: {
              name: taskName,
              departmentId,
            },
          },
          update: {
            isActive: true,
          },
          create: {
            name: taskName,
            departmentId,
          },
        });

        const newTask = await tx.workflowTask.create({
          data: {
            requestId,
            departmentId,
            taskTypeId: taskType.id,
            assignedToId: employee.id,
            assignedById: user.id,
            title: taskName,
            instructions: assignment.instructions || null,
            expectedEndAt: assignment.expectedEndAt,
            status: "PENDING",
          },
          include: {
            request: {
              select: {
                id: true,
                requestNumber: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            taskType: {
              select: {
                id: true,
                name: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
            assignedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        await tx.activityLog.create({
          data: {
            requestId,
            taskId: newTask.id,
            userId: user.id,
            action: "TASK_ASSIGNED",
            details: `تم توزيع مهمة "${taskName}" على ${employee.name} بقسم ${department.name}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: employee.id,
            title: "مهمة جديدة",
            message: `تم إسناد مهمة "${taskName}" إليك للطلب رقم ${requestData.requestNumber}`,
          },
        });

        createdTasks.push(newTask);
      }

      if (requestDeadlineAt) {
        await tx.request.update({
          where: { id: requestId },
          data: {
            deadlineAt: requestDeadlineAt,
          },
        });
      }

      return createdTasks;
    });

    return NextResponse.json(
      {
        message: `تم إنشاء وتوزيع ${tasks.length} مهمة بنجاح`,
        tasks,
        task: tasks[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tasks API error:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (message.startsWith("تاريخ انتهاء المهمة")) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء المهام" },
      { status: 500 }
    );
  }
}
