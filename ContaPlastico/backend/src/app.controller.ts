import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'plastcontrol-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
