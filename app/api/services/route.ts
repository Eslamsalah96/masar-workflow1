
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  try {
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const services = await prisma.service.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        category: true,

        variants: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            documentRequirements: {
              where: {
                isActive: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                conditions: {
                  include: {
                    question: true,
                  },
                },
              },
            },
          },
        },

        documentRequirements: {
          where: {
            isActive: true,
            variantId: null,
          },
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            conditions: {
              include: {
                question: true,
              },
            },
          },
        },

        questions: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      services,
    });
  } catch (error) {
    console.error("Services API error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل الخدمات" },
      { status: 500 }
    );
  }
}
