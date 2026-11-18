import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, UserThrottlerGuard],
})
export class AttendanceModule {}
