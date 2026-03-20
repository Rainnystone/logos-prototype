import { ZodError, type ZodTypeAny } from 'zod';

function formatIssuePath(label: string, path: Array<string | number>): string {
  if (path.length === 0) {
    return label;
  }

  return path.join('.');
}

export function formatZodError(label: string, error: ZodError): string {
  return error.issues
    .map((issue) => `${formatIssuePath(label, issue.path)} ${issue.message}`.trim())
    .join('; ');
}

export function parseWithSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  data: unknown,
  label: string,
): TSchema['_output'] {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  throw new Error(formatZodError(label, result.error));
}
