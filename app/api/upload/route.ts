import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type CloudinaryResult = { secure_url: string };

export async function POST(req: NextRequest) {
  try {
    const formData   = await req.formData();
    const file       = formData.get("file") as File | null;
    const productoId = formData.get("productoId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    // folder y publicId opcionales (sobreescriben el default de productos)
    const folder   = (formData.get("folder")   as string | null) ?? "bocado-supremo/productos";
    const publicId = (formData.get("publicId") as string | null) ?? productoId ?? undefined;

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            public_id:   publicId,
            overwrite:   true,
            transformation: [
              { width: 800, height: 600, crop: "fill", gravity: "auto" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, res) => {
            if (error || !res) reject(error ?? new Error("Sin resultado"));
            else resolve({ secure_url: res.secure_url });
          }
        )
        .end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
  }
}
