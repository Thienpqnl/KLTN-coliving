import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]> | undefined
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const handleApiError = (error: unknown): ReturnType<typeof NextResponse.json> => {
  // eslint-disable-next-line no-console
  console.error("API Error:", error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        errors,
      } as ApiResponse,
      { status: 400 }
    );
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errors: error.errors,
      } as ApiResponse,
      { status: error.statusCode }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
    } as ApiResponse,
    { status: 500 }
  );
};

export const successResponse = <T>(data: T, statusCode = 200) => {
  return NextResponse.json(
    {
      success: true,
      data,
    } as ApiResponse<T>,
    { status: statusCode }
  );
};

export const errorResponse = (
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
) => {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errors,
    } as ApiResponse,
    { status: statusCode }
  );
};
