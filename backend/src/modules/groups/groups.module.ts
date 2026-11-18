import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../reviews/user-throttler.guard.js';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 5 }],
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, UserThrottlerGuard],
})
export class GroupsModule {}
