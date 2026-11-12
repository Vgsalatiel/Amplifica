import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ReviewPolicy } from './review.policy.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';
import { UserThrottlerGuard } from './user-throttler.guard.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
      // Os testes fazem dezenas de gravações seguidas na mesma conta.
      skipIf: () => process.env['NODE_ENV'] === 'test',
    }),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewPolicy, UserThrottlerGuard],
})
export class ReviewsModule {}
