import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ApplicationsController } from "./applications.controller";
import { AuthGuard, RolesGuard } from "./auth";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JobsController } from "./jobs.controller";
import { PortalController } from "./portal.controller";
import { PrismaService } from "./prisma.service";
import { QueueService } from "./queue.service";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { StorageService } from "./storage.service";
import { WorkflowsController } from "./workflows.controller";
import { EventsGateway } from "./events.gateway";
@Module({
  imports: [JwtModule.register({})],
  controllers: [
    AuthController,
    JobsController,
    ApplicationsController,
    PortalController,
    WorkflowsController,
  ],
  providers: [
    PrismaService,
    AuthService,
    QueueService,
    RateLimitMiddleware,
    EventsGateway,
    StorageService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: any) => {
        req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
        res.setHeader("x-request-id", req.requestId);
        next();
      }, RateLimitMiddleware)
      .forRoutes("*");
  }
}
