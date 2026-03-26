import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { Parser } from 'json2csv';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUYER')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  async getKpis(@CurrentUser() user: { workspaceId: string }) {
    return this.analyticsService.getKpis(user.workspaceId);
  }

  @Get('vendors')
  async getVendors(@CurrentUser() user: { workspaceId: string }) {
    return this.analyticsService.getVendorsPerformance(user.workspaceId);
  }

  @Get('export')
  async exportCsv(@CurrentUser() user: { workspaceId: string }, @Res() res: Response) {
    const data = await this.analyticsService.getExportData(user.workspaceId);
    
    if (data.length === 0) {
      return res.status(400).send('Немає даних для експорту');
    }

    try {
      const json2csvParser = new Parser({ withBOM: true });
      const csv = json2csvParser.parse(data);

      res.header('Content-Type', 'text/csv');
      res.attachment('deals_export.csv');
      return res.send(csv);
    } catch (err) {
      return res.status(500).send('Помилка генерації CSV');
    }
  }
}
