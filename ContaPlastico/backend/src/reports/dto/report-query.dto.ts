import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class MonthlyReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @IsOptional()
  @IsIn(['json', 'excel', 'pdf'])
  format?: 'json' | 'excel' | 'pdf';
}

export class ScrapReportQueryDto {
  @IsOptional()
  @IsIn(['json', 'excel', 'pdf'])
  format?: 'json' | 'excel' | 'pdf';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
