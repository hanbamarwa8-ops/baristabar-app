import type { Request, Response } from "express";
import { findActiveProducts } from "../repositories/products.repository.js";

export async function getProducts(_req: Request, res: Response) {
  try {
    const products = await findActiveProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Failed to retrieve products:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve products.",
    });
  }
}
