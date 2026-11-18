import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
  },
},
        currentDepartment: true,
        service: true,
        serviceVariant: true,
        documentRequirements: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        questionAnswers: true,
        _count: {
          select: {
            tasks: true,
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

    let allowed = false;

    if (user.role === "GENERAL_MANAGER") {
      allowed = true;
    } else if (user.role === "DEPARTMENT_MANAGER") {
      allowed =
        Boolean(user.departmentId) &&
        requestData.currentDepartmentId === user.departmentId;
    } else if (user.role === "EMPLOYEE") {
  const assignedTask = await prisma.workflowTask.findFirst({
    where: {
      requestId: id,
      assignedToId: user.id,
    },
    select: {
      id: true,
    },
  });

  allowed = Boolean(assignedTask);
} else if (
  user.role === "SECRETARY" ||
  user.role === "CUSTOMER_SERVICE"
) {
  allowed = requestData.createdById === user.id;
}

    if (!allowed) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض هذا الطلب" },
        { status: 403 }
      );
    }

    return NextResponse.json({ request: requestData });
  } catch (error) {
    console.error("Get request details API error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل تفاصيل الطلب" },
      { status: 500 }
    );
  }
}