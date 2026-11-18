
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_ROLES = [
  "GENERAL_MANAGER",
  "DEPARTMENT_MANAGER",
  "EMPLOYEE",
  "CUSTOMER_SERVICE",
];

const MANAGER_ROLES = ["GENERAL_MANAGER", "DEPARTMENT_MANAGER"];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function canAccessDepartment(
  user: { role: string; departmentId: string | null },
  departmentId: string
) {
  return (
    user.role === "GENERAL_MANAGER" ||
    user.departmentId === departmentId
  );
}

function validDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// ==========================================
// GET: عرض المهام اليومية والبيانات المساعدة
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return jsonError("يجب تسجيل الدخول أولاً", 401);
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return jsonError("ليس لديك صلاحية عرض المهام اليومية", 403);
    }

    const requestedDepartmentId =
      request.nextUrl.searchParams.get("departmentId");

    let departmentId = requestedDepartmentId || undefined;

    if (user.role !== "GENERAL_MANAGER") {
      if (!user.departmentId) {
        return jsonError("المستخدم غير مرتبط بقسم", 403);
      }

      departmentId = user.departmentId;
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

    const [departments, employees, customers, tasks] = await Promise.all([
      user.role === "GENERAL_MANAGER"
        ? prisma.department.findMany({
            orderBy: { name: "asc" },
          })
        : prisma.department.findMany({
            where: { id: user.departmentId! },
            orderBy: { name: "asc" },
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

      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          taxNumber: true,
        },
        orderBy: { name: "asc" },
        take: 500,
      }),

      prisma.dailyTask.findMany({
        where: taskWhere,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          department: {
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
          createdBy: {
            select: {
              id: true,
              name: true,
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
            orderBy: { startedAt: "desc" },
          },
          expenses: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    return NextResponse.json({
      departments,
      employees,
      customers,
      tasks,
      taskTypes: [
        { value: "QUICK_SERVICE", label: "خدمة سريعة لعميل" },
        { value: "INTERNAL", label: "مهمة داخلية" },
      ],
      statuses: [
        { value: "PENDING", label: "لم تبدأ" },
        { value: "IN_PROGRESS", label: "جاري التنفيذ" },
        { value: "COMPLETED", label: "مكتملة" },
        { value: "CANCELLED", label: "ملغاة" },
      ],
    });
  } catch (error) {
    console.error("Get daily tasks error:", error);
    return jsonError("حدث خطأ أثناء تحميل المهام اليومية", 500);
  }
}

// ==========================================
// POST: إنشاء مهمة يومية
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return jsonError("يجب تسجيل الدخول أولاً", 401);
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return jsonError("ليس لديك صلاحية إنشاء مهمة يومية", 403);
    }

    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const taskType =
      typeof body.taskType === "string"
        ? body.taskType.trim()
        : "QUICK_SERVICE";

    const departmentId =
      typeof body.departmentId === "string"
        ? body.departmentId.trim()
        : user.departmentId || "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const serviceName =
      typeof body.serviceName === "string"
        ? body.serviceName.trim()
        : "";

    const customerId =
      typeof body.customerId === "string"
        ? body.customerId.trim()
        : "";

    const customerName =
      typeof body.customerName === "string"
        ? body.customerName.trim()
        : "";

    const companyName =
      typeof body.companyName === "string"
        ? body.companyName.trim()
        : "";

    const assignedToId =
      typeof body.assignedToId === "string"
        ? body.assignedToId.trim()
        : "";

    if (!title || !departmentId) {
      return jsonError("اسم المهمة والقسم مطلوبان");
    }

    if (!["QUICK_SERVICE", "INTERNAL"].includes(taskType)) {
      return jsonError("نوع المهمة غير صحيح");
    }

    if (
      title.length > 150 ||
      description.length > 3000 ||
      serviceName.length > 150 ||
      customerName.length > 150 ||
      companyName.length > 150
    ) {
      return jsonError("بعض البيانات تجاوزت الحد المسموح");
    }

    if (!canAccessDepartment(user, departmentId)) {
      return jsonError("لا يمكنك إنشاء مهام خارج قسمك", 403);
    }

    if (
      user.role === "EMPLOYEE" &&
      assignedToId &&
      assignedToId !== user.id
    ) {
      return jsonError("لا يمكنك توزيع المهمة على موظف آخر", 403);
    }

    if (
      user.role === "EMPLOYEE" &&
      !assignedToId &&
      taskType === "INTERNAL"
    ) {
      // المهمة الداخلية التي ينشئها الموظف تسند إليه تلقائياً
    }

    const finalAssignedToId =
      user.role === "EMPLOYEE"
        ? user.id
        : assignedToId || null;

    const deadlineAt = validDate(body.deadlineAt);

    if (deadlineAt === undefined) {
      return jsonError("تاريخ الموعد النهائي غير صحيح");
    }

    const [department, employee, customer] = await Promise.all([
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true },
      }),

      finalAssignedToId
        ? prisma.user.findUnique({
            where: { id: finalAssignedToId },
            select: {
              id: true,
              role: true,
              departmentId: true,
              isActive: true,
            },
          })
        : Promise.resolve(null),

      customerId
        ? prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    if (!department) {
      return jsonError("القسم المحدد غير موجود");
    }

    if (
      finalAssignedToId &&
      (!employee ||
        !employee.isActive ||
        employee.role !== "EMPLOYEE" ||
        employee.departmentId !== departmentId)
    ) {
      return jsonError("الموظف المحدد غير نشط أو لا يتبع هذا القسم");
    }

    if (customerId && !customer) {
      return jsonError("العميل المحدد غير موجود");
    }

    if (taskType === "QUICK_SERVICE" && !customerId && !customerName) {
      return jsonError(
        "أدخل اسم العميل أو اختر عميلاً للخدمة السريعة"
      );
    }

    const task = await prisma.dailyTask.create({
      data: {
        title,
        taskType,
        serviceName: serviceName || null,
        customerId: customer?.id || null,
        customerName: customer?.name || customerName || null,
        companyName: companyName || null,
        departmentId,
        assignedToId: finalAssignedToId,
        createdById: user.id,
        description: description || null,
        deadlineAt: deadlineAt || null,
        status: "PENDING",
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        department: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: "تم إنشاء المهمة اليومية بنجاح",
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create daily task error:", error);
    return jsonError("حدث خطأ أثناء إنشاء المهمة اليومية", 500);
  }
}

// ==========================================
// PATCH: تحديث المهمة والتوزيع والوقت والمصروفات
// ==========================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return jsonError("يجب تسجيل الدخول أولاً", 401);
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return jsonError("ليس لديك صلاحية تعديل المهام اليومية", 403);
    }

    const body = await request.json();

    const taskId =
      typeof body.taskId === "string" ? body.taskId.trim() : "";

    const action =
      typeof body.action === "string" ? body.action.trim() : "";

    if (!taskId || !action) {
      return jsonError("معرف المهمة ونوع العملية مطلوبان");
    }

    const task = await prisma.dailyTask.findUnique({
      where: { id: taskId },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      return jsonError("المهمة غير موجودة", 404);
    }

    if (!canAccessDepartment(user, task.departmentId)) {
      return jsonError("لا يمكنك الوصول إلى هذه المهمة", 403);
    }

    const isManager = MANAGER_ROLES.includes(user.role);
    const isAssignedEmployee = task.assignedToId === user.id;

    // --------------------------------------
    // توزيع المهمة على موظف
    // --------------------------------------

    if (action === "ASSIGN") {
      if (!isManager) {
        return jsonError("توزيع المهام متاح للمديرين فقط", 403);
      }

      const assignedToId =
        typeof body.assignedToId === "string"
          ? body.assignedToId.trim()
          : "";

      if (!assignedToId) {
        return jsonError("اختر الموظف المسؤول");
      }

      const employee = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: {
          id: true,
          name: true,
          role: true,
          departmentId: true,
          isActive: true,
        },
      });

      if (
        !employee ||
        !employee.isActive ||
        employee.role !== "EMPLOYEE" ||
        employee.departmentId !== task.departmentId
      ) {
        return jsonError("الموظف غير نشط أو لا يتبع هذا القسم");
      }

      const updatedTask = await prisma.dailyTask.update({
        where: { id: taskId },
        data: { assignedToId },
        include: {
          assignedTo: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json({
        message: "تم توزيع المهمة بنجاح",
        task: updatedTask,
      });
    }

    // --------------------------------------
    // تحديث بيانات المهمة
    // --------------------------------------

    if (action === "UPDATE") {
      if (!isManager && !isAssignedEmployee) {
        return jsonError("لا يمكنك تعديل هذه المهمة", 403);
      }

      const data: {
        title?: string;
        serviceName?: string | null;
        customerName?: string | null;
        companyName?: string | null;
        description?: string | null;
        deadlineAt?: Date | null;
        status?: string;
      } = {};

      if (typeof body.title === "string") {
        const value = body.title.trim();
        if (!value || value.length > 150) {
          return jsonError("اسم المهمة غير صحيح");
        }
        data.title = value;
      }

      if (typeof body.serviceName === "string") {
        data.serviceName = body.serviceName.trim() || null;
      }

      if (typeof body.customerName === "string") {
        data.customerName = body.customerName.trim() || null;
      }

      if (typeof body.companyName === "string") {
        data.companyName = body.companyName.trim() || null;
      }

      if (typeof body.description === "string") {
        if (body.description.length > 3000) {
          return jsonError("الوصف أطول من المسموح");
        }
        data.description = body.description.trim() || null;
      }

      if (body.deadlineAt !== undefined) {
        const date = validDate(body.deadlineAt);
        if (date === undefined) {
          return jsonError("تاريخ الموعد النهائي غير صحيح");
        }
        data.deadlineAt = date;
      }

      if (typeof body.status === "string") {
        if (
          !["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(
            body.status
          )
        ) {
          return jsonError("حالة المهمة غير صحيحة");
        }

        if (!isManager && body.status === "CANCELLED") {
          return jsonError("إلغاء المهمة متاح للمدير فقط", 403);
        }

        data.status = body.status;

        
      }

      const updatedTask = await prisma.dailyTask.update({
        where: { id: taskId },
        data: {
          ...data,
          ...(data.status === "COMPLETED"
            ? { completedAt: new Date() }
            : {}),
          ...(data.status === "IN_PROGRESS" && !task.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...(data.status === "PENDING" || data.status === "CANCELLED"
            ? { completedAt: null }
            : {}),
        },
        include: {
          assignedTo: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json({
        message: "تم تحديث المهمة بنجاح",
        task: updatedTask,
      });
    }

    // --------------------------------------
    // بدء العمل
    // --------------------------------------

    if (action === "START") {
      if (!isAssignedEmployee) {
        return jsonError("المهمة غير مسندة إليك", 403);
      }

      if (["COMPLETED", "CANCELLED"].includes(task.status)) {
        return jsonError("لا يمكن بدء مهمة مكتملة أو ملغاة");
      }

      const openSession = await prisma.workSession.findFirst({
        where: {
          userId: user.id,
          stoppedAt: null,
        },
        select: {
          id: true,
          workflowTaskId: true,
          dailyTaskId: true,
        },
      });

      if (openSession) {
        return jsonError(
          "لديك جلسة عمل مفتوحة بالفعل. أوقف المهمة الحالية أولاً"
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const session = await tx.workSession.create({
          data: {
            dailyTaskId: task.id,
            userId: user.id,
          },
        });

        const updatedTask = await tx.dailyTask.update({
          where: { id: task.id },
          data: {
            status: "IN_PROGRESS",
            startedAt: task.startedAt || new Date(),
          },
        });

        return { session, task: updatedTask };
      });

      return NextResponse.json({
        message: "بدأ تسجيل وقت تنفيذ المهمة",
        ...result,
      });
    }

    // --------------------------------------
    // إيقاف العمل
    // --------------------------------------

    if (action === "STOP") {
      if (!isAssignedEmployee) {
        return jsonError("لا يمكنك إيقاف جلسة هذه المهمة", 403);
      }

      const session = await prisma.workSession.findFirst({
        where: {
          dailyTaskId: task.id,
          userId: user.id,
          stoppedAt: null,
        },
        orderBy: { startedAt: "desc" },
      });

      if (!session) {
        return jsonError("لا توجد جلسة عمل مفتوحة لهذه المهمة");
      }

      const stoppedAt = new Date();
      const durationSeconds = Math.max(
        0,
        Math.floor(
          (stoppedAt.getTime() - session.startedAt.getTime()) / 1000
        )
      );

      const updatedSession = await prisma.workSession.update({
        where: { id: session.id },
        data: {
          stoppedAt,
          durationSeconds,
        },
      });

      return NextResponse.json({
        message: "تم إيقاف تسجيل وقت المهمة",
        session: updatedSession,
      });
    }

    // --------------------------------------
    // إتمام المهمة وإغلاق جلسة العمل المفتوحة
    // --------------------------------------

    if (action === "COMPLETE") {
      if (!isManager && !isAssignedEmployee) {
        return jsonError("لا يمكنك إتمام هذه المهمة", 403);
      }

      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        const openSessions = await tx.workSession.findMany({
          where: {
            dailyTaskId: task.id,
            stoppedAt: null,
          },
        });

        for (const session of openSessions) {
          const durationSeconds = Math.max(
            0,
            Math.floor(
              (now.getTime() - session.startedAt.getTime()) / 1000
            )
          );

          await tx.workSession.update({
            where: { id: session.id },
            data: {
              stoppedAt: now,
              durationSeconds,
            },
          });
        }

        return tx.dailyTask.update({
          where: { id: task.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
          },
          include: {
            assignedTo: {
              select: { id: true, name: true },
            },
            department: {
              select: { id: true, name: true },
            },
          },
        });
      });

      return NextResponse.json({
        message: "تم إتمام المهمة بنجاح",
        task: result,
      });
    }

    // --------------------------------------
    // إضافة مصروف
    // --------------------------------------

    if (action === "ADD_EXPENSE") {
      if (!isAssignedEmployee && !isManager) {
        return jsonError("لا يمكنك إضافة مصروف لهذه المهمة", 403);
      }

      const amount = Number(body.amount);
      const description =
        typeof body.description === "string"
          ? body.description.trim()
          : "";

      if (!Number.isFinite(amount) || amount <= 0) {
        return jsonError("أدخل قيمة مصروف صحيحة");
      }

      if (amount > 100000000) {
        return jsonError("قيمة المصروف أكبر من الحد المسموح");
      }

      if (!description || description.length > 1000) {
        return jsonError("اكتب وصف المصروف بحد أقصى 1000 حرف");
      }

      const expense = await prisma.dailyTaskExpense.create({
        data: {
          dailyTaskId: task.id,
          employeeId: user.id,
          amount,
          description,
        },
        include: {
          employee: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json(
        {
          message: "تم تسجيل المصروف بنجاح",
          expense,
        },
        { status: 201 }
      );
    }

    return jsonError("نوع العملية غير مدعوم");
  } catch (error) {
    console.error("Daily tasks API error:", error);
    return jsonError("حدث خطأ أثناء تنفيذ العملية", 500);
  }
}
