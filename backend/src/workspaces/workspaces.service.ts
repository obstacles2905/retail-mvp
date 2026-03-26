import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyTeam(userId: string): Promise<{
    users: Array<{ id: string; name: string; email: string; role: string; createdAt: Date }>;
    teamInviteToken: string;
    inviteUrl: string;
  }> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!currentUser?.workspaceId) {
      throw new BadRequestException('User is not linked to a workspace');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: currentUser.workspaceId },
      select: {
        id: true,
        teamInviteToken: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const teamInviteToken = workspace.teamInviteToken || (await this.ensureTeamInviteToken(workspace.id));
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    return {
      users: workspace.users,
      teamInviteToken,
      inviteUrl: `${frontendUrl}/join-team?token=${teamInviteToken}`,
    };
  }

  async getInviteInfo(token: string): Promise<{ workspaceName: string }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { teamInviteToken: token },
      select: { name: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return { workspaceName: workspace.name };
  }

  private async ensureTeamInviteToken(workspaceId: string): Promise<string> {
    let attempts = 0;
    while (attempts < 5) {
      attempts += 1;
      const token = randomUUID();

      try {
        const workspace = await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { teamInviteToken: token },
          select: { teamInviteToken: true },
        });

        if (workspace.teamInviteToken) {
          return workspace.teamInviteToken;
        }
      } catch {
        // token can collide because of unique constraint; retry with a new UUID
      }
    }

    throw new BadRequestException('Could not generate team invite token');
  }
}
