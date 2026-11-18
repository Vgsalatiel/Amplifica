import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import type { AuthUser } from '../users/user.types.js';
import {
  setAttendanceSchema,
  type SetAttendanceDto,
} from './attendance.schemas.js';
import {
  AttendanceService,
  type AttendanceSummary,
  type MyAttendance,
} from './attendance.service.js';

const WRITE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@Controller('shows/:slug/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Public()
  @Get()
  summary(@Param('slug') slug: string): Promise<AttendanceSummary> {
    return this.attendance.summary(slug);
  }

  /** Fica antes de qualquer rota com parâmetro: `me` é a própria pessoa. */
  @Can.Anyone()
  @Get('me')
  mine(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<MyAttendance> {
    return this.attendance.mine(user, slug);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @Put('me')
  set(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body({ schema: setAttendanceSchema }) body: SetAttendanceDto,
  ): Promise<MyAttendance> {
    return this.attendance.set(user, slug, body);
  }

  @Can.Anyone()
  @UseGuards(UserThrottlerGuard)
  @Throttle(WRITE_LIMIT)
  @HttpCode(204)
  @Delete('me')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<void> {
    return this.attendance.remove(user, slug);
  }
}
