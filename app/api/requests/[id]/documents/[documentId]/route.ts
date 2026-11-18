
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const { id, documentId } = await context.params;

    const document = await prisma.requestDocumentRequirement.findFirst({
      where: {
        id: documentId,
        requestId: id,
      },
      include: {
        request: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!document || !document.filePath) {
      return NextResponse.json(
        { error: "المستند أو الملف غير موجود" },
        { status: 404 }
      );
    }

    const isGeneralManager = user.role === "GENERAL_MANAGER";

    const isProceduresManager =
      user.role === "DEPARTMENT_MANAGER" &&
      user.department?.name === "الإجراءات";

    const isRequestCreator = document.request.createdById === user.id;

    if (
      !isGeneralManager &&
      !isProceduresManager &&
      !isRequestCreator
    ) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية فتح هذا المستند" },
        { status: 403 }
      );
    }

    const storageRoot = path.resolve(
      process.cwd(),
      "storage",
      "uploads",
      "requests"
    );

    // تجاهل التتبع الديناميكي للمسار أثناء بناء المشروع
    const absolutePath = path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      document.filePath
    );

    // التأكد أن الملف داخل مجلد المستندات المسموح به
    const allowedPrefix = storageRoot + path.sep;

    if (!absolutePath.startsWith(allowedPrefix)) {
      return NextResponse.json(
        { error: "مسار الملف غير مسموح" },
        { status: 400 }
      );
    }

    const file = await readFile(absolutePath);

    const mimeType = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ].includes(document.fileMimeType || "")
      ? document.fileMimeType!
      : "application/octet-stream";

    const safeName = encodeURIComponent(
      document.fileName || "document"
    );

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${safeName}`,
        "Content-Length": String(file.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Open request document error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء فتح المستند" },
      { status: 500 }
    );
  }
}
