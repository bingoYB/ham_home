import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
console.log(StructuredOutputParser.fromZodSchema(z.object({ a: z.string() })));
