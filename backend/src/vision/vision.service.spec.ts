import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VisionService } from './vision.service';

describe('VisionService', () => {
  const createService = (values: Record<string, string> = {}) => {
    const configService = {
      get: (key: string) => values[key],
    } as ConfigService;
    return new VisionService(configService);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires an image and does not call the worker when no image is supplied', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const service = createService();

    await expect(service.verifyEpp({})).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends base64 to the local worker and maps complete PPE predictions', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          predictions: [
            { class: 'Person', confidence: 0.98, x: 160, y: 120, width: 120, height: 220 },
            { class: 'helmet', confidence: 0.92, x: 10, y: 20, width: 30, height: 40 },
            { class: 'goggles', confidence: 0.88, x: 50, y: 60, width: 20, height: 10 },
            { class: 'vest', confidence: 0.95, x: 70, y: 80, width: 40, height: 60 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const service = createService({ PPE_INFERENCE_URL: 'http://127.0.0.1:8123/infer' });

    const result = await service.verifyEpp({
      imageBase64: 'data:image/jpeg;base64,dGVzdA==',
    });

    expect(result.accessGranted).toBe(true);
    expect(result.isConclusive).toBe(true);
    expect(result.status).toEqual({ helmet: true, goggles: true, vest: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:8123/infer',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: 'dGVzdA==' }),
      }),
    );
  });

  it('accepts worker-filtered detections in the notebook 0.25 confidence range', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          predictions: [
            { class: 'Person', confidence: 0.28, x: 160, y: 120, width: 120, height: 220 },
            { class: 'helmet', confidence: 0.27, x: 160, y: 35, width: 70, height: 55 },
            { class: 'goggles', confidence: 0.31, x: 160, y: 70, width: 45, height: 20 },
            { class: 'vest', confidence: 0.26, x: 160, y: 145, width: 100, height: 110 },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = createService();

    const result = await service.verifyEpp({ imageBase64: 'dGVzdA==' });

    expect(result.isConclusive).toBe(true);
    expect(result.accessGranted).toBe(true);
    expect(result.status).toEqual({ helmet: true, goggles: true, vest: true });
  });

  it('returns an inconclusive result instead of reporting missing PPE when no worker is detected', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ predictions: [] }), { status: 200 }),
    );
    const service = createService();

    const result = await service.verifyEpp({ imageBase64: 'dGVzdA==' });

    expect(result.accessGranted).toBe(false);
    expect(result.isConclusive).toBe(false);
    expect(result.missing).toEqual([]);
    expect(result.unverified).toHaveLength(3);
    expect(result.message).toContain('No se pudo identificar claramente');
  });

  it('blocks a clearly detected worker when the model reports missing PPE', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          predictions: [
            { class: 'Person', confidence: 0.98, x: 160, y: 120, width: 120, height: 220 },
            { class: 'no-helmet', confidence: 0.82, x: 160, y: 35, width: 70, height: 55 },
            { class: 'no-goggles', confidence: 0.78, x: 160, y: 70, width: 45, height: 20 },
            { class: 'no-vest', confidence: 0.88, x: 160, y: 145, width: 100, height: 110 },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = createService();

    const result = await service.verifyEpp({ imageBase64: 'dGVzdA==' });

    expect(result.isConclusive).toBe(true);
    expect(result.accessGranted).toBe(false);
    expect(result.missing).toEqual([
      'Casco de seguridad',
      'Lentes / Gafas de protección',
      'Chaleco reflectivo',
    ]);
  });

  it('keeps PPE unverified when the worker is found but the gear has no positive or negative prediction', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          predictions: [
            { class: 'Person', confidence: 0.98, x: 160, y: 120, width: 120, height: 220 },
            { class: 'helmet', confidence: 0.91, x: 160, y: 35, width: 70, height: 55 },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = createService();

    const result = await service.verifyEpp({ imageBase64: 'dGVzdA==' });

    expect(result.accessGranted).toBe(false);
    expect(result.isConclusive).toBe(false);
    expect(result.status.helmet).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.unverified).toEqual([
      'Lentes / Gafas de protección',
      'Chaleco reflectivo',
    ]);
  });

  it('does not fetch arbitrary image URLs', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const service = createService();

    await expect(
      service.verifyEpp({ imageUrl: 'http://127.0.0.1:3000/private' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports the local worker as unavailable without contacting any cloud service', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection refused'));
    const service = createService();

    await expect(
      service.verifyEpp({ imageBase64: 'dGVzdA==' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
