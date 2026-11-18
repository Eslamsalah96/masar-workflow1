
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  try {
    if (!user) {
      return NextResponse.json(
        { message: "يجب تسجيل الدخول أولًا" },
        { status: 401 }
      );
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() || "";

    if (query.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { taxNumber: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        taxNumber: true,
        notes: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            issueDate: true,
            expiryDate: true,
            filePath: true,
            notes: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Customer search error:", error);

    return NextResponse.json(
      { message: "حدث خطأ أثناء البحث عن العميل" },
      { status: 500 }
    );
  }
}
