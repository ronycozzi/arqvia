type LogContext = Record<string, boolean | number | string | null | undefined>;

function writeLog(
  level: "error" | "info" | "warn",
  event: string,
  context: LogContext = {},
) {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(context).filter(([, value]) => value !== undefined),
    ),
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export function logServerError(event: string, error: unknown, context?: LogContext) {
  writeLog("error", event, {
    ...context,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}

export function logServerWarning(event: string, context?: LogContext) {
  writeLog("warn", event, context);
}
