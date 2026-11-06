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
    createAdminCategory,
    deleteAdminCategory,
    findAdminCategoryById,
    findAllAdminCategories,
    getDatabaseErrorCode,
    isValidCategoryId,
    updateAdminCategory,
    validateCategoryPayload,
  } from "./admin-categories";
  
  vi.mock("@/lib/db", () => ({
    getPool: vi.fn(),
  }));
  
  const mockQuery = vi.fn();
  
  const CATEGORY_ID =
    "550e8400-e29b-41d4-a716-446655440000";
  
  const validCategory = {
    name: "Coffee Beans",
    slug: "coffee-beans",
    description: "Premium coffee beans.",
    image_url: null,
    is_active: true,
    sort_order: 10,
  };
  
  const categoryRow = {
    id: CATEGORY_ID,
    name: "Coffee Beans",
    slug: "coffee-beans",
    description: "Premium coffee beans.",
    image_url: null,
    is_active: true,
    sort_order: 10,
    product_count: "9",
    created_at: "2026-11-06T09:00:00.000Z",
    updated_at: "2026-11-06T09:00:00.000Z",
  };
  
  describe("admin-categories", () => {
    beforeEach(() => {
      mockQuery.mockReset();
  
      vi.mocked(getPool).mockReturnValue({
        query: mockQuery,
      } as never);
    });
  
    afterEach(() => {
      vi.clearAllMocks();
    });
  
    // ==========================================================
    // VALIDATION
    // ==========================================================
  
    describe("validateCategoryPayload", () => {
      it("accepts a valid category", () => {
        const result =
          validateCategoryPayload(validCategory);
  
        expect(result.ok).toBe(true);
  
        if (result.ok) {
          expect(result.value.name).toBe("Coffee Beans");
          expect(result.value.slug).toBe("coffee-beans");
          expect(result.value.sort_order).toBe(10);
        }
      });
  
      it("trims category name and slug", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          name: "  Coffee Beans  ",
          slug: "  coffee-beans  ",
        });
  
        expect(result.ok).toBe(true);
  
        if (result.ok) {
          expect(result.value.name).toBe("Coffee Beans");
          expect(result.value.slug).toBe("coffee-beans");
        }
      });
  
      it("rejects null and non-object payloads", () => {
        expect(validateCategoryPayload(null).ok).toBe(false);
        expect(validateCategoryPayload("category").ok).toBe(false);
        expect(validateCategoryPayload([]).ok).toBe(false);
      });
  
      it("rejects an empty category name", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          name: "   ",
        });
  
        expect(result.ok).toBe(false);
      });
  
      it("rejects a name longer than 100 characters", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          name: "A".repeat(101),
        });
  
        expect(result.ok).toBe(false);
      });
  
      it("rejects an invalid slug", () => {
        const invalidSlugs = [
          "Coffee Beans",
          "Coffee_Beans",
          "coffee beans",
          "-coffee-beans",
          "coffee-beans-",
          "coffee--beans",
          "CoffeeBeans",
        ];
  
        for (const slug of invalidSlugs) {
          expect(
            validateCategoryPayload({
              ...validCategory,
              slug,
            }).ok,
          ).toBe(false);
        }
      });
  
      it("rejects a slug longer than 120 characters", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          slug: "a".repeat(121),
        });
  
        expect(result.ok).toBe(false);
      });
  
      it("accepts a category without description or image", () => {
        const result = validateCategoryPayload({
          name: "Coffee Accessories",
          slug: "coffee-accessories",
        });
  
        expect(result.ok).toBe(true);
  
        if (result.ok) {
          expect(result.value.description).toBe(null);
          expect(result.value.image_url).toBe(null);
          expect(result.value.is_active).toBe(true);
          expect(result.value.sort_order).toBe(0);
        }
      });
  
      it("rejects a description longer than 2000 characters", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          description: "A".repeat(2001),
        });
  
        expect(result.ok).toBe(false);
      });
  
      it("rejects a non-string description", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          description: 123,
        });
  
        expect(result.ok).toBe(false);
      });
  
      it("accepts a safe local image path", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          image_url: "/images/categories/coffee.png",
        });
  
        expect(result.ok).toBe(true);
      });
  
      it("accepts a secure HTTPS image URL", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          image_url: "https://cdn.example.com/coffee.png",
        });
  
        expect(result.ok).toBe(true);
      });
  
      it("rejects unsafe image URLs", () => {
        const invalidUrls = [
          "javascript:alert(1)",
          "//cdn.example.com/image.png",
          "http://cdn.example.com/image.png",
          "data:image/png;base64,AAAA",
          "https://user:password@example.com/image.png",
          "/images\\coffee.png",
        ];
  
        for (const image_url of invalidUrls) {
          expect(
            validateCategoryPayload({
              ...validCategory,
              image_url,
            }).ok,
          ).toBe(false);
        }
      });
  
      it("rejects invalid active status", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          is_active: "true",
        });
  
        expect(result.ok).toBe(false);
      });
  
      it("accepts an inactive category", () => {
        const result = validateCategoryPayload({
          ...validCategory,
          is_active: false,
        });
  
        expect(result.ok).toBe(true);
  
        if (result.ok) {
          expect(result.value.is_active).toBe(false);
        }
      });
  
      it("rejects negative sort order", () => {
        expect(
          validateCategoryPayload({
            ...validCategory,
            sort_order: -1,
          }).ok,
        ).toBe(false);
      });
  
      it("rejects fractional sort order", () => {
        expect(
          validateCategoryPayload({
            ...validCategory,
            sort_order: 2.5,
          }).ok,
        ).toBe(false);
      });
  
      it("rejects a string sort order", () => {
        expect(
          validateCategoryPayload({
            ...validCategory,
            sort_order: "10",
          }).ok,
        ).toBe(false);
      });
  
      it("rejects sort order above the maximum", () => {
        expect(
          validateCategoryPayload({
            ...validCategory,
            sort_order: 1000000,
          }).ok,
        ).toBe(false);
      });
    });
  
    // ==========================================================
    // UUID VALIDATION
    // ==========================================================
  
    describe("isValidCategoryId", () => {
      it("accepts a valid UUID", () => {
        expect(isValidCategoryId(CATEGORY_ID)).toBe(true);
      });
  
      it("rejects an invalid UUID", () => {
        expect(isValidCategoryId("not-a-uuid")).toBe(false);
        expect(isValidCategoryId("")).toBe(false);
        expect(isValidCategoryId("12345")).toBe(false);
      });
    });
  
    // ==========================================================
    // DATABASE ERROR
    // ==========================================================
  
    describe("getDatabaseErrorCode", () => {
      it("returns a PostgreSQL error code", () => {
        expect(
          getDatabaseErrorCode({ code: "23505" }),
        ).toBe("23505");
      });
  
      it("returns null when no database code exists", () => {
        expect(getDatabaseErrorCode(new Error("Database error"))).toBe(null);
        expect(getDatabaseErrorCode(null)).toBe(null);
        expect(getDatabaseErrorCode({})).toBe(null);
      });
    });
  
    // ==========================================================
    // FIND ALL CATEGORIES
    // ==========================================================
  
    describe("findAllAdminCategories", () => {
      it("returns all categories with numeric counters", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [categoryRow],
        });
  
        const result = await findAllAdminCategories();
  
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Coffee Beans");
        expect(result[0].product_count).toBe(9);
        expect(result[0].sort_order).toBe(10);
        expect(typeof result[0].product_count).toBe("number");
      });
  
      it("returns an empty array when no categories exist", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
  
        const result = await findAllAdminCategories();
  
        expect(result).toEqual([]);
      });
    });
  
    // ==========================================================
    // FIND CATEGORY BY ID
    // ==========================================================
  
    describe("findAdminCategoryById", () => {
      it("returns a category by UUID", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [categoryRow],
        });
  
        const result =
          await findAdminCategoryById(CATEGORY_ID);
  
        expect(result?.id).toBe(CATEGORY_ID);
        expect(result?.product_count).toBe(9);
  
        expect(mockQuery).toHaveBeenCalledOnce();
      });
  
      it("returns null when category does not exist", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
  
        const result =
          await findAdminCategoryById(CATEGORY_ID);
  
        expect(result).toBe(null);
      });
  
      it("does not query the database for an invalid UUID", async () => {
        const result =
          await findAdminCategoryById("invalid-id");
  
        expect(result).toBe(null);
        expect(mockQuery).not.toHaveBeenCalled();
      });
    });
  
    // ==========================================================
    // CREATE CATEGORY
    // ==========================================================
  
    describe("createAdminCategory", () => {
      it("creates a category and retrieves its details", async () => {
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ id: CATEGORY_ID }],
          })
          .mockResolvedValueOnce({
            rows: [categoryRow],
          });
  
        const result =
          await createAdminCategory(validCategory);
  
        expect(result.id).toBe(CATEGORY_ID);
        expect(result.name).toBe("Coffee Beans");
  
        expect(mockQuery).toHaveBeenCalledTimes(2);
      });
  
      it("throws when the created category cannot be retrieved", async () => {
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ id: CATEGORY_ID }],
          })
          .mockResolvedValueOnce({
            rows: [],
          });
  
        await expect(
          createAdminCategory(validCategory),
        ).rejects.toThrow(
          "Created category could not be retrieved.",
        );
      });
    });
  
    // ==========================================================
    // UPDATE CATEGORY
    // ==========================================================
  
    describe("updateAdminCategory", () => {
      it("updates a category successfully", async () => {
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ id: CATEGORY_ID }],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                ...categoryRow,
                name: "Premium Coffee Beans",
              },
            ],
          });
  
        const result = await updateAdminCategory(
          CATEGORY_ID,
          {
            ...validCategory,
            name: "Premium Coffee Beans",
          },
        );
  
        expect(result?.name).toBe("Premium Coffee Beans");
        expect(mockQuery).toHaveBeenCalledTimes(2);
      });
  
      it("returns null when the category does not exist", async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
  
        const result = await updateAdminCategory(
          CATEGORY_ID,
          validCategory,
        );
  
        expect(result).toBe(null);
        expect(mockQuery).toHaveBeenCalledOnce();
      });
  
      it("does not query the database for an invalid UUID", async () => {
        const result = await updateAdminCategory(
          "invalid-id",
          validCategory,
        );
  
        expect(result).toBe(null);
        expect(mockQuery).not.toHaveBeenCalled();
      });
    });
  
    // ==========================================================
    // DELETE CATEGORY
    // ==========================================================
  
    describe("deleteAdminCategory", () => {
      it("returns true when a category is deleted", async () => {
        mockQuery.mockResolvedValueOnce({
          rowCount: 1,
        });
  
        const result =
          await deleteAdminCategory(CATEGORY_ID);
  
        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledOnce();
      });
  
      it("returns false when the category does not exist", async () => {
        mockQuery.mockResolvedValueOnce({
          rowCount: 0,
        });
  
        const result =
          await deleteAdminCategory(CATEGORY_ID);
  
        expect(result).toBe(false);
      });
  
      it("does not query the database for an invalid UUID", async () => {
        const result =
          await deleteAdminCategory("invalid-id");
  
        expect(result).toBe(false);
        expect(mockQuery).not.toHaveBeenCalled();
      });
  
      it("propagates foreign key errors", async () => {
        const databaseError = Object.assign(
          new Error("Foreign key violation"),
          { code: "23503" },
        );
  
        mockQuery.mockRejectedValueOnce(databaseError);
  
        await expect(
          deleteAdminCategory(CATEGORY_ID),
        ).rejects.toMatchObject({
          code: "23503",
        });
      });
    });
  });
  