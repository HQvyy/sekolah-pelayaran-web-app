import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CohortsService } from './cohorts.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../../common/envelope';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly cohorts: CohortsService) {}

  @Get('enrollments')
  @Roles(Role.TARUNA)
  @ApiOperation({ summary: 'Enrollment milik Taruna aktif' })
  async myEnrollments(@CurrentUser() user: RequestUser) {
    return ok(await this.cohorts.myEnrollments(user.id));
  }
}
