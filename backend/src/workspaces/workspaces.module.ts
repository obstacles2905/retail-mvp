import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, PrismaService],
})
export class WorkspacesModule {}
