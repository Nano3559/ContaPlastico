import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateScrapDto, ScrapCause } from './dto/create-scrap.dto';

describe('CreateScrapDto', () => {
  it('accepts an order code string and a valid scrap cause from the production flow', async () => {
    const dto = Object.assign(new CreateScrapDto(), {
      productionOrderId: 'OP-2026-101',
      consumedRawMaterialKg: 1200,
      producedGoodKg: 1110,
      scrapRecoverableKg: 50,
      scrapDiscardKg: 40,
      cause: ScrapCause.CAMBIO_COLOR,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
