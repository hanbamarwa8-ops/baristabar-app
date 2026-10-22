import type { Request, Response } from "express";
import {
  createProduct as insertProduct,
  findAllProductsForAdmin,
  setProductActive,
  updateProduct as updateProductRecord,
  type AdminProductInput,
} from "../repositories/admin-products.repository.js";

const MAX_PRICE = 9_999_999.999;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseProductInput(body: unknown):
  | { success: true; value: AdminProductInput }
  | { success: false; message: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { success: false, message: "The request body must be an object." };
  }

  const value = body as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  const category =
    typeof value.category === "string" ? value.category.trim() : "";
  const description =
    value.description === null || value.description === ""
      ? null
      : typeof value.description === "string"
        ? value.description.trim()
        : undefined;
  const imageUrl =
    value.image_url === null || value.image_url === ""
      ? null
      : typeof value.image_url === "string"
        ? value.image_url.trim()
        : undefined;
  const price = typeof value.price === "number" ? value.price : Number.NaN;
  const stock = typeof value.stock === "number" ? value.stock : Number.NaN;
  const isActive = value.is_active;

  if (!name || name.length > 160) {
    return { success: false, message: "Name is required (maximum 160 characters)." };
  }
  if (!slug || slug.length > 160 || !SLUG_PATTERN.test(slug)) {
    return {
      success: false,
      message: "Slug must contain lowercase letters, numbers and single hyphens.",
    };
  }
  if (!category || category.length > 100) {
    return {
      success: false,
      message: "Category is required (maximum 100 characters).",
    };
  }
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > MAX_PRICE ||
    Math.abs(Math.round(price * 1000) - price * 1000) > 1e-7
  ) {
    return {
      success: false,
      message: "Price must be a number between 0 and 9,999,999.999 with at most 3 decimals.",
    };
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 2_147_483_647) {
    return { success: false, message: "Stock must be a non-negative integer." };
  }
  if (typeof description === "undefined" || (description && description.length > 5000)) {
    return {
      success: false,
      message: "Description must be text (maximum 5,000 characters).",
    };
  }
  if (typeof imageUrl === "undefined" || (imageUrl && imageUrl.length > 2048)) {
    return {
      success: false,
      message: "Image URL must be text (maximum 2,048 characters).",
    };
  }
  if (typeof isActive !== "boolean") {
    return { success: false, message: "Product active status must be true or false." };
  }

  return {
    success: true,
    value: {
      name,
      slug,
      description,
      price: Number(price.toFixed(3)),
      category,
      image_url: imageUrl,
      stock,
      is_active: isActive,
    },
  };
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export async function getAdminProducts(_req: Request, res: Response) {
  try {
    const products = await findAllProductsForAdmin();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to retrieve admin products:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve products." });
  }
}

export async function postAdminProduct(req: Request, res: Response) {
  const parsed = parseProductInput(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.message });
    return;
  }

  try {
    const product = await insertProduct(parsed.value);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      res.status(409).json({ success: false, message: "A product with this slug already exists." });
      return;
    }
    console.error("Failed to create admin product:", error);
    res.status(500).json({ success: false, message: "Unable to create product." });
  }
}

export async function putAdminProduct(req: Request, res: Response) {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ success: false, message: "A valid product ID is required." });
    return;
  }

  const parsed = parseProductInput(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.message });
    return;
  }

  try {
    const product = await updateProductRecord(id, parsed.value);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      res.status(409).json({ success: false, message: "A product with this slug already exists." });
      return;
    }
    console.error("Failed to update admin product:", error);
    res.status(500).json({ success: false, message: "Unable to update product." });
  }
}

export async function patchAdminProductStatus(req: Request, res: Response) {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ success: false, message: "A valid product ID is required." });
    return;
  }

  const isActive =
    typeof req.body === "object" && req.body !== null
      ? (req.body as Record<string, unknown>).is_active
      : undefined;

  if (typeof isActive !== "boolean") {
    res.status(400).json({ success: false, message: "is_active must be true or false." });
    return;
  }

  try {
    const product = await setProductActive(id, isActive);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Failed to change product status:", error);
    res.status(500).json({ success: false, message: "Unable to change product status." });
  }
}
