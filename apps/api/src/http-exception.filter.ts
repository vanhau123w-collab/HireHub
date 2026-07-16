import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp(),
      response = context.getResponse<Response>(),
      request = context.getRequest<Request & { requestId?: string }>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR,
      code = "INTERNAL_ERROR",
      message = "An unexpected error occurred",
      fieldErrors: Record<string, string[]> | undefined;
    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = "VALIDATION_ERROR";
      message = "The request is invalid";
      fieldErrors = exception.issues.reduce<Record<string, string[]>>(
        (result, issue) => {
          const key = issue.path.join(".") || "root";
          (result[key] ||= []).push(issue.message);
          return result;
        },
        {},
      );
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code =
        status === 401
          ? "UNAUTHORIZED"
          : status === 403
            ? "FORBIDDEN"
            : status === 404
              ? "NOT_FOUND"
              : status === 409
                ? "CONFLICT"
                : "REQUEST_ERROR";
      const body = exception.getResponse();
      message =
        typeof body === "string"
          ? body
          : String(
              (body as { message?: string | string[] }).message ||
                exception.message,
            );
    }
    response.status(status).json({
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
      requestId: request.requestId || "unknown",
    });
  }
}
