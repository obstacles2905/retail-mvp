import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';

function createExecutionContext(client: Partial<Socket>): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => client,
    }),
  } as unknown as ExecutionContext;
}

describe('WsJwtGuard', () => {
  it('attaches user to client.data on valid token', async () => {
    expect.assertions(2);
    const token = 'token';
    const sub = 'userId';
    const role = 'BUYER' as const;

    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub, role }) } as unknown as JwtService;
    const guard = new WsJwtGuard(jwt);

    const client = {
      handshake: { auth: { token } },
      data: {},
    } as unknown as Socket;

    const ok = await guard.canActivate(createExecutionContext(client));
    expect(ok).toBe(true);
    expect((client.data as { user?: unknown }).user).toEqual({ sub, role });
  });

  it('throws UnauthorizedException on missing token', async () => {
    expect.assertions(1);
    const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
    const guard = new WsJwtGuard(jwt);
    const client = { handshake: { auth: {} }, data: {} } as unknown as Socket;

    await expect(guard.canActivate(createExecutionContext(client))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException on invalid token', async () => {
    expect.assertions(1);
    const token = 'token';
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad token')) } as unknown as JwtService;
    const guard = new WsJwtGuard(jwt);
    const client = { handshake: { auth: { token } }, data: {} } as unknown as Socket;

    await expect(guard.canActivate(createExecutionContext(client))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

