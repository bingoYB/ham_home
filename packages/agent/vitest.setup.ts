import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.test if available
dotenv.config({ path: path.resolve(__dirname, ".env.test") });
