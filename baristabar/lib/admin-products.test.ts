import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getPool } from "@/lib/db";

import {
  createAdminProduct,
  deleteAdminProduct,
  findAllAdminProducts,
  getDatabaseErrorCode,
  isValidProductId,
  ProductCategoryNotFoundError,
  updateAdminProduct,
  updateProductActiveStatus,
  validateProductPayload,
} from "./admin-products";

// MOCK DATABASE
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPool: vi.fn(() => ({
    query: mockQuery,
  })),
}));

// FIXTURES
const PRODUCT_ID =
  "550e8400-e29b-41d4-a716-446655440000";

const CATEGORY_ID =
  "550e8400-e29b-41d4-a716-446655440001";

const validProduct = {
  name: "Migration Test Coffee",
  slug: "migration-test-coffee",
  description: "Temporary product for automated tests.",
  price: 12.5,
  category: "Coffee Beans",
  category_id: CATEGORY_ID,
  image_url: null,
  stock: 5,
  is_active: true,
};

const productRow = {
  id: PRODUCT_ID,
  name: "Migration Test Coffee",
  slug: "migration-test-coffee",
  description: "Temporary product for automated tests.",
  price: "12.500",
  category: "Coffee Beans",
  category_id: CATEGORY_ID,
  image_url: null,
  stock: 5,
  is_active: true,
  created_at: "2026-11-06T09:00:00.000Z",
  updated_at: "2026-11-06T09:00:00.000Z",
};

// SETUP
describe("admin-products", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // VALIDATE PRODUCT PAYLOAD
  describe("validateProductPayload", () => {
    it("accepts a valid product", () => {
      const result = validateProductPayload(validProduct);

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.name).toBe("Migration Test Coffee");
        expect(result.value.price).toBe(12.5);
        expect(result.value.stock).toBe(5);
        expect(result.value.category_id).toBe(CATEGORY_ID);
      }
    });

    it("trims product name and slug", () => {
      const result = validateProductPayload({
        ...validProduct,
        name: "  Migration Test Coffee  ",
        slug: "  migration-test-coffee  ",
      });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.name).toBe("Migration Test Coffee");
        expect(result.value.slug).toBe("migration-test-coffee");
      }
    });

    it("rejects an empty product name", () => {
      const result = validateProductPayload({
        ...validProduct,
        name: "   ",
      });

      expect(result.ok).toBe(false);
    });

    it("rejects a name longer than 150 characters", () => {
      const result = validateProductPayload({
        ...validProduct,
        name: "A".repeat(151),
      });

      expect(result.ok).toBe(false);
    });

    it("rejects an invalid slug", () => {
      const invalidSlugs = [
        "Migration Test Coffee",
        "migration_test_coffee",
        "Migration-Test-Coffee",
        "-migration-test",
        "migration--test",
      ];

      for (const slug of invalidSlugs) {
        expect(
          validateProductPayload({
            ...validProduct,
            slug,
          }).ok,
        ).toBe(false);
      }
    });

    it("rejects a slug longer than 180 characters", () => {
      const result = validateProductPayload({
        ...validProduct,
        slug: "a".repeat(181),
      });

      expect(result.ok).toBe(false);
    });

    it("rejects an empty category when no category ID is provided", () => {
      const result = validateProductPayload({
        ...validProduct,
        category: "",
        category_id: null,
      });

      expect(result.ok).toBe(false);
    });

    it("accepts the legacy category name without category_id", () => {
      const result = validateProductPayload({
        ...validProduct,
        category: "Coffee Beans",
        category_id: null,
      });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.category).toBe("Coffee Beans");
        expect(result.value.category_id).toBe(null);
      }
    });

    it("accepts category_id without a legacy category name", () => {
      const result = validateProductPayload({
        ...validProduct,
        category: "",
        category_id: CATEGORY_ID,
      });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.category_id).toBe(CATEGORY_ID);
      }
    });

    it("rejects an invalid category UUID", () => {
      const result = validateProductPayload({
        ...validProduct,
        category_id: "invalid-category-id",
      });

      expect(result.ok).toBe(false);
    });

    it("rejects a non-string category ID", () => {
      const result = validateProductPayload({
        ...validProduct,
        category_id: 123,
      });

      expect(result.ok).toBe(false);
    });

    it("rejects negative prices", () => {
      const result = validateProductPayload({
        ...validProduct,
        price: -1,
      });

      expect(result.ok).toBe(false);
    });

    it("rejects prices with more than three decimal places", () => {
      const result = validateProductPayload({
        ...validProduct,
        price: 12.3456,
      });

      expect(result.ok).toBe(false);
    });

    it("accepts prices with three decimal places", () => {
      const result = validateProductPayload({
        ...validProduct,
        price: 12.345,
      });

      expect(result.ok).toBe(true);
    });

    it("rejects non-numeric prices", () => {
      const result = validateProductPayload({
        ...validProduct,
        price: "invalid",
      });

      expect(result.ok).toBe(false);
    });

    it("rejects negative or fractional stock", () => {
      expect(
        validateProductPayload({
          ...validProduct,
          stock: -1,
        }).ok,
      ).toBe(false);

      expect(
        validateProductPayload({
          ...validProduct,
          stock: 2.5,
        }).ok,
      ).toBe(false);
    });

    it("accepts a valid stock value expressed as a number string", () => {
      const result = validateProductPayload({
        ...validProduct,
        stock: "15",
      });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.stock).toBe(15);
      }
    });

    it("rejects a non-boolean active status", () => {
      const result = validateProductPayload({
        ...validProduct,
        is_active: "true",
      });

      expect(result.ok).toBe(false);
    });

    it("accepts an inactive product", () => {
      const result = validateProductPayload({
        ...validProduct,
        is_active: false,
      });

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.is_active).toBe(false);
      }
    });

    it("rejects a description longer than 5000 characters", () => {
      const result = validateProductPayload({
        ...validProduct,
        description: "A".repeat(5001),
      });

      expect(result.ok).toBe(false);
    });

    it("rejects a local image path using an unsafe protocol-relative URL", () => {
      const result = validateProductPayload({
        ...validProduct,
        image_url: "//example.com/product.png",
      });

      expect(result.ok).toBe(false);
    });

    it("accepts a safe local image path", () => {
      const result = validateProductPayload({
        ...validProduct,
        image_url: "/products/coffee.png",
      });

      expect(result.ok).toBe(true);
    });

    it("accepts a secure HTTPS image URL", () => {
      const result = validateProductPayload({
        ...validProduct,
        image_url: "https://cdn.example.com/coffee.png",
      });

      expect(result.ok).toBe(true);
    });

    it("rejects unsafe image URLs", () => {
      const invalidUrls = [
        "javascript:alert(1)",
        "http://example.com/product.png",
        "data:image/png;base64,AAAA",
        "https://user:password@example.com/image.png",
      ];

      for (const image_url of invalidUrls) {
        expect(
          validateProductPayload({
            ...validProduct,
            image_url,
          }).ok,
        ).toBe(false);
      }
    });

    it("rejects a non-object payload", () => {
      expect(validateProductPayload(null).ok).toBe(false);
      expect(validateProductPayload("product").ok).toBe(false);
      expect(validateProductPayload([]).ok).toBe(false);
    });
  });

  // PRODUCT UUID
  describe("isValidProductId", () => {
    it("accepts a valid UUID", () => {
      expect(isValidProductId(PRODUCT_ID)).toBe(true);
    });

    it("rejects an invalid UUID", () => {
      expect(isValidProductId("not-a-uuid")).toBe(false);
      expect(isValidProductId("")).toBe(false);
    });
  });

  // DATABASE ERROR
  describe("getDatabaseErrorCode", () => {
    it("returns a PostgreSQL error code", () => {
      expect(
        getDatabaseErrorCode({ code: "23505" }),
      ).toBe("23505");
    });

    it("returns null for an ordinary error", () => {
      expect(
        getDatabaseErrorCode(new Error("Database failure")),
      ).toBe(null);
    });

    it("returns null when the code is missing", () => {
      expect(getDatabaseErrorCode({})).toBe(null);
      expect(getDatabaseErrorCode(null)).toBe(null);
    });
  });

  // FIND ALL PRODUCTS
  describe("findAllAdminProducts", () => {
    it("returns products with numeric price and stock", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [productRow],
      });

      const result = await findAllAdminProducts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(PRODUCT_ID);
      expect(result[0].price).toBe(12.5);
      expect(result[0].stock).toBe(5);
      expect(result[0].category_id).toBe(CATEGORY_ID);

      expect(mockQuery).toHaveBeenCalledOnce();
    });

    it("returns an empty array when there are no products", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await findAllAdminProducts();

      expect(result).toEqual([]);
    });
  });

  // CREATE PRODUCT
  describe("createAdminProduct", () => {
    it("creates a product with category_id", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [productRow],
      });

      const result = await createAdminProduct(validProduct);

      expect(result.id).toBe(PRODUCT_ID);
      expect(result.category_id).toBe(CATEGORY_ID);
      expect(result.category).toBe("Coffee Beans");

      expect(mockQuery).toHaveBeenCalledOnce();

      const parameters = mockQuery.mock.calls[0][1];

      expect(parameters[7]).toBe(CATEGORY_ID);
    });

    it("throws when the selected category does not exist", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        createAdminProduct({
          ...validProduct,
          category_id: "550e8400-e29b-41d4-a716-446655440002",
        }),
      ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
    });
  });

  // UPDATE PRODUCT
  describe("updateAdminProduct", () => {
    it("updates a product and its category", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...productRow,
            name: "Updated Coffee",
            category: "Ground Coffee",
          },
        ],
      });

      const result = await updateAdminProduct(
        PRODUCT_ID,
        {
          ...validProduct,
          name: "Updated Coffee",
          category: "Ground Coffee",
        },
      );

      expect(result?.name).toBe("Updated Coffee");
      expect(result?.category).toBe("Ground Coffee");

      expect(mockQuery).toHaveBeenCalledOnce();
    });

    it("returns null when the product does not exist", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const result = await updateAdminProduct(
        PRODUCT_ID,
        validProduct,
      );

      expect(result).toBe(null);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("throws when the product exists but the category does not", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{ id: PRODUCT_ID }],
        });

      await expect(
        updateAdminProduct(PRODUCT_ID, {
          ...validProduct,
          category_id: "550e8400-e29b-41d4-a716-446655440002",
        }),
      ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
    });
  });

  // ACTIVATE / DEACTIVATE
  describe("updateProductActiveStatus", () => {
    it("deactivates a product", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...productRow,
            is_active: false,
          },
        ],
      });

      const result = await updateProductActiveStatus(
        PRODUCT_ID,
        false,
      );

      expect(result?.is_active).toBe(false);
      expect(mockQuery).toHaveBeenCalledOnce();
    });

    it("activates a product", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [productRow],
      });

      const result = await updateProductActiveStatus(
        PRODUCT_ID,
        true,
      );

      expect(result?.is_active).toBe(true);
    });

    it("returns null when the product does not exist", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await updateProductActiveStatus(
        PRODUCT_ID,
        false,
      );

      expect(result).toBe(null);
    });
  });

  // DELETE PRODUCT
  describe("deleteAdminProduct", () => {
    it("deletes a product and returns its image URL", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: PRODUCT_ID,
            image_url: "https://example.com/coffee.png",
          },
        ],
      });

      const result = await deleteAdminProduct(PRODUCT_ID);

      expect(result).toEqual({
        id: PRODUCT_ID,
        image_url: "https://example.com/coffee.png",
      });

      expect(mockQuery).toHaveBeenCalledOnce();
    });

    it("returns null when the product does not exist", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await deleteAdminProduct(PRODUCT_ID);

      expect(result).toBe(null);
    });

    it("propagates foreign key violations", async () => {
      const databaseError = Object.assign(
        new Error("Product is referenced by an order"),
        { code: "23503" },
      );

      mockQuery.mockRejectedValueOnce(databaseError);

      await expect(
        deleteAdminProduct(PRODUCT_ID),
      ).rejects.toMatchObject({
        code: "23503",
      });
    });
  });

  // DATABASE CONNECTION MOCK
  it("uses the shared PostgreSQL pool", () => {
    expect(getPool).toBeDefined();
  });
});
