import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { DemandForecastingService } from './demand-forecasting.service';
import { PredictDemandDto, ForecastGranularity } from './dto/predict-demand.dto';
import { UpdateSaleRecordDto } from './dto/update-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { ProcessType } from '@prisma/client';
import * as fs from 'fs';

@ApiTags('demand-forecasting')
@Controller('demand-forecasting')
export class DemandForecastingController {
  constructor(private readonly forecastingService: DemandForecastingService) {}

  @Post('predict')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar pronóstico de demanda de ventas con Inteligencia Artificial',
    description:
      'Aplica algoritmos de series temporales (Holt-Winters, Regresión, Ensamble) sobre el histórico de ventas y traduce la demanda a kilogramos de resinas plásticas (MRP).',
  })
  @ApiResponse({ status: 200, description: 'Pronóstico calculado exitosamente.' })
  predict(@Body() dto: PredictDemandDto) {
    return this.forecastingService.predictDemand(dto);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Obtener métricas clave de demanda (KPIs, totales de plástico y crecimiento)',
  })
  @ApiQuery({ name: 'productCode', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ProcessType })
  getSummary(
    @Query('productCode') productCode?: string,
    @Query('category') category?: ProcessType,
  ) {
    return this.forecastingService.getSummary({ productCode, category });
  }

  @Get('history')
  @ApiOperation({
    summary: 'Consultar listado histórico de transacciones comerciales de 2 años',
  })
  getSalesHistory(@Query() query: QuerySalesDto) {
    return this.forecastingService.getSalesHistory(query);
  }

  @Get('aggregated')
  @ApiOperation({
    summary: 'Obtener serie temporal de ventas agregada (por Mes, Semana o Año)',
  })
  @ApiQuery({ name: 'granularity', enum: ForecastGranularity, required: false })
  @ApiQuery({ name: 'productCode', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ProcessType })
  getAggregated(
    @Query('granularity') granularity: ForecastGranularity = ForecastGranularity.MONTH,
    @Query('productCode') productCode?: string,
    @Query('category') category?: ProcessType,
  ) {
    return this.forecastingService.getAggregatedSeries(granularity, productCode, category);
  }

  @Get('download-csv')
  @ApiOperation({
    summary: 'Descargar archivo CSV estructurado con el histórico de ventas de 2 años',
  })
  downloadCsv(@Res() res: Response) {
    try {
      const filePath = this.forecastingService.getCsvFilePath();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="demand_sales_history_2years.csv"',
      );
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Archivo CSV no encontrado',
      });
    }
  }

  @Post('reseed')
  @ApiOperation({
    summary: 'Regenerar dataset de 2 años de ventas (simulación)',
  })
  async reseed() {
    return this.forecastingService.reseedSalesData();
  }

  @Patch('sales/:id')
  @ApiOperation({
    summary: 'Actualizar un registro individual de ventas históricas (para editar datos y simular)',
  })
  @ApiParam({ name: 'id', description: 'ID UUID del registro de venta' })
  @ApiResponse({ status: 200, description: 'Registro actualizado exitosamente.' })
  updateSaleRecord(
    @Param('id') id: string,
    @Body() dto: UpdateSaleRecordDto,
  ) {
    return this.forecastingService.updateSaleRecord(id, dto);
  }
}
