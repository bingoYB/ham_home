import { describe, expect, it } from "vitest";
import {
  parseStructuredOutput,
  validateJsonSchema,
  validateStrictJsonSchema,
} from "./schema";
import { SchemaValidationError } from "../core/errors";

describe("Schema Validation", () => {
  it("validates empty schema", () => {
    expect(() => validateJsonSchema(undefined, {})).not.toThrow();
  });

  it("validates enum", () => {
    expect(() => validateJsonSchema({ enum: ["a", "b"] }, "a")).not.toThrow();
    expect(() => validateJsonSchema({ enum: ["a", "b"] }, "c")).toThrow('$ must be one of ["a","b"].');
  });

  it("validates missing required object property", () => {
    expect(() => validateJsonSchema({ type: "object", required: ["id"] }, {}))
      .toThrow("$.id is required.");
  });

  it("validates additionalProperties false", () => {
    expect(() => validateJsonSchema({
      type: "object",
      properties: { a: { type: "string" } },
      additionalProperties: false
    }, { a: "1", b: 2 }))
      .toThrow("$.b is not allowed.");
  });

  it("validates arrays correctly", () => {
    expect(() => validateJsonSchema({ type: "array" }, "not an array"))
      .toThrow("$ must be array, received string.");

    expect(() => validateJsonSchema({
      type: "array",
      items: { type: "number" }
    }, [1, 2, 3])).not.toThrow();
  });

  it("validates integer type specifically", () => {
    expect(() => validateJsonSchema({ type: "integer" }, 1)).not.toThrow();
    expect(() => validateJsonSchema({ type: "integer" }, 1.5)).toThrow("$ must be an integer.");
    expect(() => validateJsonSchema({ type: "integer" }, "1")).toThrow("$ must be an integer.");
  });
});

describe("parseStructuredOutput", () => {
  it("parses direct JSON object", () => {
    const result = parseStructuredOutput('{"a": 1}', { type: "object" });
    expect(result).toEqual({ a: 1 });
  });

  it("extracts JSON object embedded in text", () => {
    const text = 'Here is the JSON: \n{"a": 1}\n End of JSON.';
    const result = parseStructuredOutput(text, { type: "object" });
    expect(result).toEqual({ a: 1 });
  });

  it("extracts JSON array embedded in text", () => {
    const text = 'Here is the array: \n[1, 2, 3]\n End.';
    const result = parseStructuredOutput(text, { type: "array" });
    expect(result).toEqual([1, 2, 3]);
  });

  it("throws SchemaValidationError for invalid JSON", () => {
    expect(() => parseStructuredOutput('just some text without JSON'))
      .toThrow(SchemaValidationError);
  });

  it("falls back to trimmed text if no brackets match", () => {
    expect(() => parseStructuredOutput('123'))
      .not.toThrow(); // 123 is valid JSON number, but without schema validation it passes parse
  });
});

describe("validateStrictJsonSchema", () => {
  it("accepts required nullable fields and recursive definitions", () => {
    expect(() => validateStrictJsonSchema({
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/$defs/item" },
        },
      },
      required: ["items"],
      additionalProperties: false,
      $defs: {
        item: {
          type: "object",
          properties: {
            label: { type: "string" },
            child: {
              anyOf: [{ $ref: "#/$defs/item" }, { type: "null" }],
            },
          },
          required: ["label", "child"],
          additionalProperties: false,
        },
      },
    })).not.toThrow();
  });

  it("rejects object properties omitted from required", () => {
    expect(() => validateStrictJsonSchema({
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
      required: ["success"],
      additionalProperties: false,
    })).toThrow("Missing: message");
  });

  it("rejects objects that allow additional properties", () => {
    expect(() => validateStrictJsonSchema({
      type: "object",
      properties: {},
      required: [],
    })).toThrow("additionalProperties must be false");
  });

  it("validates object schemas inside definitions", () => {
    expect(() => validateStrictJsonSchema({
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
      $defs: {
        invalid: {
          type: "object",
          properties: { value: { type: "string" } },
          required: [],
          additionalProperties: false,
        },
      },
    })).toThrow("$.$defs.invalid.required");
  });
});
