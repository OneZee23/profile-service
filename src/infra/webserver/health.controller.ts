import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('check')
  public healthCheck(): string {
    return 'I am ok';
  }
}
