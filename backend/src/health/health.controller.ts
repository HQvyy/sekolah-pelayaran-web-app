import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../common/envelope';
import { Public } from '../modules/auth/public.decorator';

// Liveness: proses aplikasi hidup. Tanpa dependency eksternal,
// tanpa data sensitif. Publik agar load balancer/monitoring bisa mengakses.
@Public()
@ApiTags('operational')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness check aplikasi' })
  health() {
    return ok({
      status: 'ok',
      time: new Date().toISOString(),
    });
  }
}
