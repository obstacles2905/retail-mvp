import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  sub: string;
  email: string;
  role: string;
  workspaceId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentUser;
  },
);

