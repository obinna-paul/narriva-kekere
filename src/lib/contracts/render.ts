export function renderContractBody(
  templateBody: string,
  variables: Record<string, string>,
  expectedVariables: string[],
): { rendered?: string; missing?: string[] } {
  const missing: string[] = [];

  for (const variable of expectedVariables) {
    if (!(variable in variables) || !variables[variable]) {
      missing.push(variable);
    }
  }

  if (missing.length > 0) return { missing };

  let rendered = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return { rendered };
}
