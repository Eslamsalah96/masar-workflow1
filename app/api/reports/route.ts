
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getDateRange(from: string | null, to: string | null) {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;

  return {
    ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
    ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
  };
}

function getDuration(
  sessions: {
    startedAt: Date;
    stoppedAt: Date | null;
    durationSeconds: number | null;
  }[]
) {
  const now = Date.now();

  return sessions.reduce((total, session) => {
    if (session.durationSeconds !== null) {
      return total + session.durationSeconds;
    }

    if (!session.stoppedAt) {
      return (
        total +
        Math.max(0, Math.floor((now - session.startedAt.getTime()) / 1000))
      );
    }

    return (
      total +
      Math.max(
        0,
        Math.floor(
          (session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000
        )
      )
    );
  }, 0);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  try {
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (!["GENERAL_MANAGER", "DEPARTMENT_MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض التقارير" },
        { status: 403 }
      );
    }

    if (user.role === "DEPARTMENT_MANAGER" && !user.departmentId) {
      return NextResponse.json(
        { error: "لا يوجد قسم مرتبط بحسابك" },
        { status: 403 }
      );
    }

    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");
    const type = params.get("type") || "ALL";

    const createdAt = getDateRange(from, to);

    const departmentFilter =
      user.role === "DEPARTMENT_MANAGER"
        ? { departmentId: user.departmentId! }
        : {};

    const [workflowTasks, dailyTasks] = await Promise.all([
      type === "DAILY"
        ? Promise.resolve([])
        : prisma.workflowTask.findMany({
            where: {
              ...departmentFilter,
              ...(Object.keys(createdAt).length ? { createdAt } : {}),
            },
            include: {
              request: {
                select: {
                  id: true,
                  requestNumber: true,
                  serviceName: true,
                  proposedCompanyName: true,
                  deadlineAt: true,
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
              workSessions: {
                select: {
                  startedAt: true,
                  stoppedAt: true,
                  durationSeconds: true,
                },
              },
              expenses: {
                include: {
                  employee: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),

      type === "REGULAR"
        ? Promise.resolve([])
        : prisma.dailyTask.findMany({
            where: {
              ...departmentFilter,
              ...(Object.keys(createdAt).length ? { createdAt } : {}),
            },
            include: {
              customer: {
                select: {
                  name: true,
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
              workSessions: {
                select: {
                  startedAt: true,
                  stoppedAt: true,
                  durationSeconds: true,
                },
              },
              expenses: {
                include: {
                  employee: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
    ]);

    const regularRows = workflowTasks.map((task) => {
      const expenses = task.expenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        employeeName: expense.employee.name,
        createdAt: expense.createdAt,
      }));

      return {
        id: task.id,
        type: "REGULAR",
        title: task.title,
        requestNumber: task.request.requestNumber,
        customerName: task.request.customer.name,
        companyName: task.request.proposedCompanyName || "",
        serviceName: task.request.serviceName,
        departmentName: task.department.name,
        employeeName: task.assignedTo?.name || "غير معين",
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        deadlineAt: task.expectedEndAt || task.request.deadlineAt,
        completedAt: task.completedAt,
        totalSeconds: getDuration(task.workSessions),
        expensesTotal: expenses.reduce(
          (total, expense) => total + expense.amount,
          0
        ),
        expenses,
      };
    });

    const dailyRows = dailyTasks.map((task) => {
      const expenses = task.expenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        employeeName: expense.employee.name,
        createdAt: expense.createdAt,
      }));

      return {
        id: task.id,
        type: "DAILY",
        title: task.title,
        requestNumber: "",
        customerName: task.customer?.name || task.customerName || "",
        companyName: task.companyName || "",
        serviceName: task.serviceName || task.title,
        departmentName: task.department.name,
        employeeName: task.assignedTo?.name || "غير معين",
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        deadlineAt: task.deadlineAt,
        completedAt: task.completedAt,
        totalSeconds: getDuration(task.workSessions),
        expensesTotal: expenses.reduce(
          (total, expense) => total + expense.amount,
          0
        ),
        expenses,
      };
    });

    const rows = [...regularRows, ...dailyRows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const summary = {
      totalTasks: rows.length,
      regularTasks: regularRows.length,
      dailyTasks: dailyRows.length,
      completedTasks: rows.filter((task) => task.status === "COMPLETED").length,
      inProgressTasks: rows.filter(
        (task) => task.status === "IN_PROGRESS"
      ).length,
      pendingTasks: rows.filter((task) =>
        ["PENDING", "NEW"].includes(task.status)
      ).length,
      totalExpenses: rows.reduce(
        (total, task) => total + task.expensesTotal,
        0
      ),
      totalWorkSeconds: rows.reduce(
        (total, task) => total + task.totalSeconds,
        0
      ),
    };

    return NextResponse.json({
      rows,
      summary,
      filters: {
        from,
        to,
        type,
      },
    });
  } catch (error) {
    console.error("Reports GET error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل التقارير" },
      { status: 500 }
    );
  }
}
