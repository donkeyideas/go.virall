import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
}

type HandlerContext = {
  req: NextRequest;
  userId: string;
  params?: Record<string, string>;
  /** Supabase client that works for the current auth method (cookie or bearer) */
  supabase: ReturnType<typeof createAdminClient>;
};

type HandlerFn<T = unknown> = (ctx: HandlerContext) => Promise<T>;

/**
 * Wraps an API route handler with:
 * - Auth check (requires authenticated user)
 * - JSON response formatting
 * - Zod validation error handling
 * - ApiError handling
 * - Unexpected error catch-all
 */
export function handleRoute<T>(handler: HandlerFn<T>) {
  return async (req: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    try {
      let user: { id: string } | null = null;
      let dbClient: ReturnType<typeof createAdminClient> | null = null;

      // 1. Check for Bearer token (mobile app) — use admin client to bypass RLS
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const admin = createAdminClient();
        const { data, error } = await admin.auth.getUser(token);
        if (!error && data?.user) {
          user = data.user;
          dbClient = admin;
        }
      }

      // 2. Fallback to cookie-based auth (web app) — use server client with RLS
      if (!user) {
        const supabase = await createServerClient();
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
        if (user) dbClient = supabase as unknown as ReturnType<typeof createAdminClient>;
      }

      if (!user || !dbClient) {
        throw ApiError.unauthorized();
      }

      const params = routeContext?.params ? await routeContext.params : undefined;

      const result = await handler({
        req,
        userId: user.id,
        params,
        supabase: dbClient,
      });

      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              ...(err.details ? { details: err.details } : {}),
            },
          },
          { status: err.statusCode },
        );
      }

      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          { status: 400 },
        );
      }

      console.error('[API Error]', err);

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Wraps a handler that does NOT require auth (e.g., public media kit).
 */
export function handlePublicRoute<T>(handler: (req: NextRequest, params?: Record<string, string>) => Promise<T>) {
  return async (req: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    try {
      const params = routeContext?.params ? await routeContext.params : undefined;
      const result = await handler(req, params);
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: err.statusCode },
        );
      }

      console.error('[API Error]', err);

      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
        { status: 500 },
      );
    }
  };
}

type AdminHandlerContext = HandlerContext & {
  admin: ReturnType<typeof createAdminClient>;
};

type AdminHandlerFn<T = unknown> = (ctx: AdminHandlerContext) => Promise<T>;

/**
 * Wraps an API route handler with admin role check.
 * Provides both userId and admin (service-role) client.
 */
export function handleAdminRoute<T>(handler: AdminHandlerFn<T>) {
  return async (req: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    try {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw ApiError.unauthorized();
      }

      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw ApiError.forbidden('Admin access required');
      }

      const params = routeContext?.params ? await routeContext.params : undefined;

      const result = await handler({
        req,
        userId: user.id,
        params,
        supabase: admin as unknown as ReturnType<typeof createAdminClient>,
        admin,
      });

      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: err.statusCode },
        );
      }

      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          { status: 400 },
        );
      }

      console.error('[Admin API Error]', err);

      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
        { status: 500 },
      );
    }
  };
}

/** Parse and validate JSON body with a Zod schema */
export async function parseBody<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.output<S>> {
  const body = await req.json().catch(() => {
    throw ApiError.badRequest('Invalid JSON body');
  });
  return schema.parse(body);
}

/** Parse and validate query params with a Zod schema */
export function parseQuery<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): z.output<S> {
  const obj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return schema.parse(obj);
}
