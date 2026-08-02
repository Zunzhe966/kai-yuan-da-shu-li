import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import projectSchema from "../../../schema/project-publication-v1.schema.json";
import {
  SECTION_KEYS,
  type ProjectPublication,
  type SectionKey,
} from "./project";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile<ProjectPublication>(projectSchema);

const REQUIRED_CONTENT_SECTIONS: readonly SectionKey[] = [
  "overview",
  "problem_and_positioning",
  "core_capabilities",
  "limitations_and_risks",
];

function formatSchemaError(error: ErrorObject): string {
  const path = error.instancePath.slice(1).replaceAll("/", ".") || "record";
  return `${path}: ${error.message ?? "is invalid"}`;
}

function isNonBlank(value: string): boolean {
  return value.trim().length > 0;
}

export function validateProject(value: unknown): ValidationResult {
  if (!validateSchema(value)) {
    return {
      ok: false,
      errors: (validateSchema.errors ?? []).map(formatSchemaError),
    };
  }

  const errors: string[] = [];
  const evidenceIds = new Set(value.evidence.map((item) => item.evidence_id));

  if (!isNonBlank(value.card.use_when)) {
    errors.push("card.use_when: publication requirement cannot be blank");
  }
  if (!isNonBlank(value.card.avoid_when)) {
    errors.push("card.avoid_when: publication requirement cannot be blank");
  }

  for (const key of REQUIRED_CONTENT_SECTIONS) {
    const section = value.sections[key];
    if (!isNonBlank(section.summary) && !isNonBlank(section.body)) {
      errors.push(`sections.${key}: publication requirement cannot be blank`);
    }
  }

  for (const key of SECTION_KEYS) {
    const section = value.sections[key];
    if (
      section.state === "verified" &&
      (section.evidence_ids.length === 0 ||
        section.evidence_ids.some((id) => !evidenceIds.has(id)))
    ) {
      errors.push(`sections.${key}: verified content requires evidence`);
    }
  }

  return { ok: errors.length === 0, errors };
}
