export type ImportFailureCode =
  | "invalidBookmark"
  | "missingUrl"
  | "invalidUrl"
  | "unsupportedUrl"
  | "missingTitle"
  | "writeFailed"
  | "aiFailed";

export interface ImportFailure {
  title: string;
  url: string;
  stage: "import" | "ai";
  code: ImportFailureCode;
  /** Original error message, when the failing service provides one. */
  message?: string;
}
