import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validate, safeValidate, schemas } from "../validation";
import { ValidationError } from "../errors";

describe("Validation Utils", () => {
  describe("validate()", () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    it("should return valid data when validation succeeds", () => {
      const input = { name: "Alice", age: 30 };
      const result = validate(testSchema, input);
      expect(result).toEqual(input);
    });

    it("should throw ValidationError when validation fails", () => {
      const input = { name: "", age: -5 };
      expect(() => validate(testSchema, input)).toThrow(ValidationError);
    });

    it("should throw non-Zod errors as is", () => {
      const mockSchema = {
        parse: () => { throw new Error("Unexpected error"); }
      } as unknown as z.ZodSchema<unknown>;

      expect(() => validate(mockSchema, "test")).toThrow("Unexpected error");
    });
  });

  describe("safeValidate()", () => {
    const testSchema = z.object({
      email: z.string().email(),
    });

    it("should return success object with data when validation succeeds", () => {
      const input = { email: "test@example.com" };
      const result = safeValidate(testSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it("should return failure object with error when validation fails", () => {
      const input = { email: "invalid-email" };
      const result = safeValidate(testSchema, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.context?.errors).toBeDefined();
      }
    });
  });

  describe("Application Schemas", () => {
    describe("createSession", () => {
      it("should validate valid session input", () => {
        const input = { userId: "user-123", idempotencyKey: "key-123" };
        expect(() => validate(schemas.createSession, input)).not.toThrow();
      });

      it("should require userId", () => {
        const input = { userId: "" };
        expect(() => validate(schemas.createSession, input)).toThrow(ValidationError);
      });
    });

    describe("message", () => {
      it("should validate valid message", () => {
        const input = {
          sessionId: "session-1",
          content: "Hello world",
          context: { key: "value" }
        };
        expect(() => validate(schemas.message, input)).not.toThrow();
      });

      it("should reject empty content", () => {
        const input = {
          sessionId: "session-1",
          content: ""
        };
        expect(() => validate(schemas.message, input)).toThrow(ValidationError);
      });
    });

    describe("entity", () => {
      it("should validate valid entity", () => {
        const input = {
          id: "entity-1",
          type: "emotion",
          label: "Happy",
          position: { x: 0, y: 0, z: 0 }
        };
        expect(() => validate(schemas.entity, input)).not.toThrow();
      });

      it("should reject invalid type", () => {
        const input = {
          id: "entity-1",
          type: "invalid-type",
          label: "Test",
          position: { x: 0, y: 0 }
        };
        expect(() => validate(schemas.entity, input)).toThrow(ValidationError);
      });
    });
  });
});
