import { Inject, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { AuthUser } from "./auth";

@WebSocketGateway({
  namespace: "/events",
  cors: {
    origin: process.env.WEB_ORIGIN || "http://localhost:5173",
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventsGateway.name);
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token = String(
      client.handshake.auth?.token ||
        client.handshake.headers.authorization ||
        "",
    ).replace(/^Bearer /, "");
    try {
      const user = this.jwt.verify<AuthUser>(token, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          "dev-access-secret-change-me-32-characters",
      });
      client.data.user = user;
      void client.join(`user:${user.sub}`);
      if (user.companyId) void client.join(`company:${user.companyId}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect(true);
    }
  }

  emitToUser(userId: string, event: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit("hirehub:event", event);
  }
  emitToCompany(companyId: string, event: Record<string, unknown>) {
    this.server.to(`company:${companyId}`).emit("hirehub:event", event);
  }
}
