
import { describe, expect, it } from "vitest";
import {
  isValidProductId,
  validateProductPayload,
} from "./admin-products";

const validProduct = {
  name: "Migration Test Coffee",
  slug: "migration-test-coffee",
  description: "Temporary product for automated tests.",
  price: 12.5,
  category: "Testing",
  image_url: null,
  stock: 5,
  is_active: true,
};

describe("validateProductPayload", () => {
  it("accepts a valid product", () => {
    const result = validateProductPayload(validProduct);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.name).toBe("Migration Test Coffee");
      expect(result.value.price).toBe(12.5);
      expect(result.value.stock).toBe(5);
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
    const result = validateProductPayload({
      ...validProduct,
      slug: "Migration Test Coffee",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a negative price", () => {
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

  it("rejects negative or fractional stock", () => {
    expect(
      validateProductPayload({ ...validProduct, stock: -1 }).ok,
    ).toBe(false);

    expect(
      validateProductPayload({ ...validProduct, stock: 2.5 }).ok,
    ).toBe(false);
  });

  it("rejects a non-boolean active status", () => {
    const result = validateProductPayload({
      ...validProduct,
      is_active: "true",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(validateProductPayload(null).ok).toBe(false);
    expect(validateProductPayload("product").ok).toBe(false);
  });
});

describe("isValidProductId", () => {
  it("accepts a valid UUID", () => {
    expect(
      isValidProductId("550e8400-e29b-41d4-a716-446655440000"),
    ).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    expect(isValidProductId("not-a-uuid")).toBe(false);
    expect(isValidProductId("")).toBe(false);
  });
});
