import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MonthlyReportQueryDto, ScrapReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-kpis')
  @Roles('ADMIN', 'ALMACEN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Indicadores clave del dashboard principal' })
  async dashboardKpis(@Res() response: Response) {
    return response.json(await this.reportsService.dashboardKpis());
  }

  @Get('monthly-balance')
  @Roles('ADMIN', 'ALMACEN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Balance mensual de movimientos' })
  async monthlyBalance(@Query() query: MonthlyReportQueryDto, @Res() response: Response) {
    const format = query.format ?? 'json';
    if (format === 'excel') {
      const file = await this.reportsService.monthlyBalanceExcel(query.month, query.year);
      response.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      response.setHeader('Content-Disposition', `attachment; filename=balance-${query.year}-${query.month}.xlsx`);
      return response.send(file);
    }
    return response.json(await this.reportsService.monthlyBalance(query.month, query.year));
  }

  @Get('scrap-analysis')
  @Roles('ADMIN', 'PRODUCCION', 'SUPERVISOR')
  @ApiOperation({ summary: 'Analisis de consumo y merma' })
  async scrapAnalysis(@Query() query: ScrapReportQueryDto, @Res() response: Response) {
    const format = query.format ?? 'json';
    if (format === 'pdf') {
      const file = await this.reportsService.scrapAnalysisPdf(query.month, query.year);
      response.type('application/pdf');
      response.setHeader('Content-Disposition', 'attachment; filename=analisis-merma.pdf');
      return response.send(file);
    }
    return response.json(await this.reportsService.scrapAnalysis(query.month, query.year));
  }
}
