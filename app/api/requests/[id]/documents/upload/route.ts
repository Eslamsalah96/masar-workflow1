
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const { id: requestId } = await context.params;
    const formData = await request.formData();

    const documentId = String(formData.get("documentId") || "");
    const file = formData.get("file");

    if (!documentId || !(file instanceof File)) {
      return NextResponse.json(
        { error: "اختر المستند والملف المطلوب رفعه" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: "نوع الملف غير مسموح. ارفع PDF أو JPG أو PNG" },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف يجب ألا يتجاوز 10 ميجابايت" },
        { status: 400 }
      );
    }

    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestNumber: true,
        createdById: true,
        currentDepartmentId: true,
      },
    });

    if (!requestData) {
      return NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    const canAccess =
      user.role === "GENERAL_MANAGER" ||
      ((user.role === "SECRETARY" ||
        user.role === "CUSTOMER_SERVICE") &&
        requestData.createdById === user.id) ||
      (user.role === "DEPARTMENT_MANAGER" &&
        requestData.currentDepartmentId === user.departmentId);

    if (!canAccess) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية لإضافة مستند لهذا الطلب" },
        { status: 403 }
      );
    }

    const document = await prisma.requestDocumentRequirement.findFirst({
      where: {
        id: documentId,
        requestId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "المستند المطلوب غير موجود ضمن هذا الطلب" },
        { status: 404 }
      );
    }

    const extension = ALLOWED_TYPES[file.type];
    const storedName = `${randomUUID()}${extension}`;
    const relativeDirectory = path.join(
      "storage",
      "uploads",
      "requests",
      requestId
    );
    const absoluteDirectory = path.join(process.cwd(), relativeDirectory);
    const absoluteFilePath = path.join(absoluteDirectory, storedName);
    const relativeFilePath = path.join(relativeDirectory, storedName);

    await mkdir(absoluteDirectory, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(absoluteFilePath, Buffer.from(bytes));

    const updatedDocument =
      await prisma.requestDocumentRequirement.update({
        where: { id: documentId },
        data: {
          filePath: relativeFilePath,
          fileName: file.name,
          fileMimeType: file.type,
          fileSize: file.size,
          status: "RECEIVED",
          receivedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          fileName: true,
          fileMimeType: true,
          fileSize: true,
          status: true,
          receivedAt: true,
        },
      });

    await prisma.activityLog.create({
      data: {
        requestId,
        userId: user.id,
        action: "DOCUMENT_UPLOADED",
        details: `تم رفع المستند: ${document.title} للطلب ${requestData.requestNumber}`,
      },
    });

    return NextResponse.json({
      message: "تم رفع المستند بنجاح",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Upload request document error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء رفع المستند" },
      { status: 500 }
    );
  }
}
