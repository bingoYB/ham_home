import {
  TagInput as SharedTagInput,
  type TagInputProps,
} from "@hamhome/ui-business/common";

export type { TagInputProps };

export function TagInput(props: TagInputProps) {
  return <SharedTagInput {...props} />;
}
