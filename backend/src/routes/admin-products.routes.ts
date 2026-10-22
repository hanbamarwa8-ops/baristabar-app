import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  getAdminProducts,
  patchAdminProductStatus,
  postAdminProduct,
  putAdminProduct,
} from "../controllers/admin-products.controller.js";

const router = Router();

// All product-management operations require a verified administrator.
router.use(requireAdmin);

router.get("/", getAdminProducts);
router.post("/", postAdminProduct);
router.put("/:id", putAdminProduct);
router.patch("/:id/active", patchAdminProductStatus);

export default router;
