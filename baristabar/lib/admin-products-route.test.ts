import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  import { NextResponse } from "next/server";

  import { requireAdminApi } from "@/lib/require-admin-api";
  import {
    createAdminProduct,
    deleteAdminProduct,
    findAllAdminProducts,
    ProductCategoryNotFoundError,
    updateAdminProduct,
    updateProductActiveStatus,
  } from "@/lib/admin-products";
  import {
    GET as getProducts,
    POST as createProduct,
  } from "@/app/api/admin/products/route";
  import {
    DELETE as deleteProduct,
    PUT as updateProduct,
  } from "@/app/api/admin/products/[id]/route";
  import { PATCH as updateProductStatus } from "@/app/api/admin/products/[id]/active/route";

  const mocks = vi.hoisted(() => ({
    requireAdminApi: vi.fn(),
    findAllAdminProducts: vi.fn(),
    createAdminProduct: vi.fn(),
    updateAdminProduct: vi.fn(),
    deleteAdminProduct: vi.fn(),
    updateProductActiveStatus: vi.fn(),
  }));

  vi.mock("@/lib/require-admin-api", () => ({
    requireAdminApi: mocks.requireAdminApi,
  }));

  vi.mock("@/lib/admin-products", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/admin-products")>();

    return {
      ...actual,
      findAllAdminProducts: mocks.findAllAdminProducts,
      createAdminProduct: mocks.createAdminProduct,
      updateAdminProduct: mocks.updateAdminProduct,
      deleteAdminProduct: mocks.deleteAdminProduct,
      updateProductActiveStatus: mocks.updateProductActiveStatus,
    };
  });

  const ADMIN_ID = "660e8400-e29b-41d4-a716-446655440000";
  const PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";
  const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440001";

  const PRODUCT = {
    id: PRODUCT_ID,
    name: "Test Coffee",
    slug: "test-coffee",
    description: "A product for route tests.",
    price: 12.5,
    category: "Coffee Beans",
    category_id: CATEGORY_ID,
    image_url: null,
    stock: 8,
    is_active: true,
    created_at: "2026-11-15T10:00:00.000Z",
    updated_at: "2026-11-15T10:00:00.000Z",
  };

  const VALID_PAYLOAD = {
    name: PRODUCT.name,
    slug: PRODUCT.slug,
    description: PRODUCT.description,
    price: PRODUCT.price,
    category: PRODUCT.category,
    category_id: CATEGORY_ID,
    image_url: null,
    stock: PRODUCT.stock,
    is_active: true,
  };

  function createRequest(
    path: string,
    method: string,
    body?: unknown,
  ): Request {
    return new Request(`http://localhost:3000${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function createInvalidJsonRequest(path: string, method: string): Request {
    return new Request(`http://localhost:3000${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
  }

  function createContext(id = PRODUCT_ID) {
    return {
      params: Promise.resolve({ id }),
    };
  }

  function authorizeAdmin() {
    vi.mocked(requireAdminApi).mockResolvedValue({
      ok: true,
      userId: ADMIN_ID,
    } as never);
  }

  function rejectAsUnauthorized(status: 401 | 403) {
    vi.mocked(requireAdminApi).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: status === 401 ? "Authentication required." : "Not authorized.",
        },
        { status },
      ),
    } as never);
  }

  function silenceConsoleError() {
    vi.spyOn(console, "error").mockImplementation(() => {});
  }

  beforeEach(() => {
    vi.mocked(requireAdminApi).mockReset();
    vi.mocked(findAllAdminProducts).mockReset();
    vi.mocked(createAdminProduct).mockReset();
    vi.mocked(updateAdminProduct).mockReset();
    vi.mocked(deleteAdminProduct).mockReset();
    vi.mocked(updateProductActiveStatus).mockReset();

    authorizeAdmin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/admin/products", () => {
    it("returns 401 and does not query products when authentication fails", async () => {
      rejectAsUnauthorized(401);

      const response = await getProducts(createRequest("/api/admin/products", "GET"));

      expect(response.status).toBe(401);
      expect(findAllAdminProducts).not.toHaveBeenCalled();
    });

    it("returns the product catalogue without caching", async () => {
      vi.mocked(findAllAdminProducts).mockResolvedValue([PRODUCT]);

      const response = await getProducts(createRequest("/api/admin/products", "GET"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(body).toEqual({ success: true, data: [PRODUCT] });
      expect(findAllAdminProducts).toHaveBeenCalledOnce();
    });

    it("returns 500 when retrieving products fails", async () => {
      silenceConsoleError();
      vi.mocked(findAllAdminProducts).mockRejectedValue(new Error("Database failure"));

      const response = await getProducts(createRequest("/api/admin/products", "GET"));

      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ success: false });
    });
  });

  describe("POST /api/admin/products", () => {
    it("returns 403 when the user is not an administrator", async () => {
      rejectAsUnauthorized(403);

      const response = await createProduct(
        createRequest("/api/admin/products", "POST", VALID_PAYLOAD),
      );

      expect(response.status).toBe(403);
      expect(createAdminProduct).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON", async () => {
      const response = await createProduct(
        createInvalidJsonRequest("/api/admin/products", "POST"),
      );

      expect(response.status).toBe(400);
      expect(createAdminProduct).not.toHaveBeenCalled();
    });

    it("rejects an invalid product payload", async () => {
      const response = await createProduct(
        createRequest("/api/admin/products", "POST", {
          ...VALID_PAYLOAD,
          price: -1,
        }),
      );

      expect(response.status).toBe(400);
      expect(createAdminProduct).not.toHaveBeenCalled();
    });

    it("creates a product and returns 201", async () => {
      vi.mocked(createAdminProduct).mockResolvedValue(PRODUCT);

      const response = await createProduct(
        createRequest("/api/admin/products", "POST", VALID_PAYLOAD),
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ success: true, data: PRODUCT });
      expect(createAdminProduct).toHaveBeenCalledOnce();
      expect(createAdminProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: PRODUCT.name, category_id: CATEGORY_ID }),
      );
    });

    it("returns 400 when the selected category does not exist", async () => {
      vi.mocked(createAdminProduct).mockRejectedValue(
        new ProductCategoryNotFoundError(),
      );

      const response = await createProduct(
        createRequest("/api/admin/products", "POST", VALID_PAYLOAD),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        success: false,
        message: "The selected category does not exist.",
      });
    });

    it("returns 409 when the product slug already exists", async () => {
      vi.mocked(createAdminProduct).mockRejectedValue(
        Object.assign(new Error("Duplicate slug"), { code: "23505" }),
      );

      const response = await createProduct(
        createRequest("/api/admin/products", "POST", VALID_PAYLOAD),
      );

      expect(response.status).toBe(409);
    });

    it.each(["22P02", "23514"]) (
      "returns 400 for invalid database data with code %s",
      async (code) => {
        vi.mocked(createAdminProduct).mockRejectedValue(
          Object.assign(new Error("Invalid database value"), { code }),
        );

        const response = await createProduct(
          createRequest("/api/admin/products", "POST", VALID_PAYLOAD),
        );

        expect(response.status).toBe(400);
      },
    );

    it("returns 500 for an unexpected creation error", async () => {
      silenceConsoleError();
      vi.mocked(createAdminProduct).mockRejectedValue(new Error("Unexpected failure"));

      const response = await createProduct(
        createRequest("/api/admin/products", "POST", VALID_PAYLOAD),
      );

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/admin/products/[id]", () => {
    it("rejects an invalid product ID", async () => {
      const response = await updateProduct(
        createRequest("/api/admin/products/not-a-uuid", "PUT", VALID_PAYLOAD),
        createContext("not-a-uuid"),
      );

      expect(response.status).toBe(400);
      expect(updateAdminProduct).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON", async () => {
      const response = await updateProduct(
        createInvalidJsonRequest(`/api/admin/products/${PRODUCT_ID}`, "PUT"),
        createContext(),
      );

      expect(response.status).toBe(400);
      expect(updateAdminProduct).not.toHaveBeenCalled();
    });

    it("updates a product", async () => {
      vi.mocked(updateAdminProduct).mockResolvedValue({
        ...PRODUCT,
        name: "Updated Coffee",
      });

      const response = await updateProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "PUT", {
          ...VALID_PAYLOAD,
          name: "Updated Coffee",
        }),
        createContext(),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        data: { name: "Updated Coffee" },
      });
      expect(updateAdminProduct).toHaveBeenCalledOnce();
    });

    it("returns 404 when the product does not exist", async () => {
      vi.mocked(updateAdminProduct).mockResolvedValue(null);

      const response = await updateProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "PUT", VALID_PAYLOAD),
        createContext(),
      );

      expect(response.status).toBe(404);
    });

    it("returns 400 when the selected category does not exist", async () => {
      vi.mocked(updateAdminProduct).mockRejectedValue(
        new ProductCategoryNotFoundError(),
      );

      const response = await updateProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "PUT", VALID_PAYLOAD),
        createContext(),
      );

      expect(response.status).toBe(400);
    });

    it("returns 409 when the updated slug already exists", async () => {
      vi.mocked(updateAdminProduct).mockRejectedValue(
        Object.assign(new Error("Duplicate slug"), { code: "23505" }),
      );

      const response = await updateProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "PUT", VALID_PAYLOAD),
        createContext(),
      );

      expect(response.status).toBe(409);
    });
  });

  describe("DELETE /api/admin/products/[id]", () => {
    it("rejects an invalid product ID", async () => {
      const response = await deleteProduct(
        createRequest("/api/admin/products/not-a-uuid", "DELETE"),
        createContext("not-a-uuid"),
      );

      expect(response.status).toBe(400);
      expect(deleteAdminProduct).not.toHaveBeenCalled();
    });

    it("deletes a product and returns its image URL", async () => {
      vi.mocked(deleteAdminProduct).mockResolvedValue({
        id: PRODUCT_ID,
        image_url: "https://example.com/coffee.png",
      });

      const response = await deleteProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "DELETE"),
        createContext(),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        data: {
          id: PRODUCT_ID,
          image_url: "https://example.com/coffee.png",
        },
      });
    });

    it("returns 404 when the product does not exist", async () => {
      vi.mocked(deleteAdminProduct).mockResolvedValue(null);

      const response = await deleteProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "DELETE"),
        createContext(),
      );

      expect(response.status).toBe(404);
    });

    it("preserves products referenced by historical orders", async () => {
      vi.mocked(deleteAdminProduct).mockRejectedValue(
        Object.assign(new Error("Foreign key violation"), { code: "23503" }),
      );

      const response = await deleteProduct(
        createRequest(`/api/admin/products/${PRODUCT_ID}`, "DELETE"),
        createContext(),
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        success: false,
        message: expect.stringContaining("existing orders"),
      });
    });
  });

  describe("PATCH /api/admin/products/[id]/active", () => {
    it("rejects an invalid product ID", async () => {
      const response = await updateProductStatus(
        createRequest("/api/admin/products/not-a-uuid/active", "PATCH", {
          is_active: false,
        }),
        createContext("not-a-uuid"),
      );

      expect(response.status).toBe(400);
      expect(updateProductActiveStatus).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON", async () => {
      const response = await updateProductStatus(
        createInvalidJsonRequest(`/api/admin/products/${PRODUCT_ID}/active`, "PATCH"),
        createContext(),
      );

      expect(response.status).toBe(400);
    });

    it("rejects a non-boolean active status", async () => {
      const response = await updateProductStatus(
        createRequest(`/api/admin/products/${PRODUCT_ID}/active`, "PATCH", {
          is_active: "false",
        }),
        createContext(),
      );

      expect(response.status).toBe(400);
      expect(updateProductActiveStatus).not.toHaveBeenCalled();
    });

    it("deactivates a product", async () => {
      vi.mocked(updateProductActiveStatus).mockResolvedValue({
        ...PRODUCT,
        is_active: false,
      });

      const response = await updateProductStatus(
        createRequest(`/api/admin/products/${PRODUCT_ID}/active`, "PATCH", {
          is_active: false,
        }),
        createContext(),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        data: { is_active: false },
      });
      expect(updateProductActiveStatus).toHaveBeenCalledWith(PRODUCT_ID, false);
    });

    it("returns 404 when the product does not exist", async () => {
      vi.mocked(updateProductActiveStatus).mockResolvedValue(null);

      const response = await updateProductStatus(
        createRequest(`/api/admin/products/${PRODUCT_ID}/active`, "PATCH", {
          is_active: true,
        }),
        createContext(),
      );

      expect(response.status).toBe(404);
    });

    it("returns 500 when the status update fails", async () => {
      silenceConsoleError();
      vi.mocked(updateProductActiveStatus).mockRejectedValue(new Error("Database failure"));

      const response = await updateProductStatus(
        createRequest(`/api/admin/products/${PRODUCT_ID}/active`, "PATCH", {
          is_active: false,
        }),
        createContext(),
      );

      expect(response.status).toBe(500);
    });
  });
