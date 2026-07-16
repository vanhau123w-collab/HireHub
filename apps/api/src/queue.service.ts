import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
@Injectable()
export class QueueService implements OnModuleDestroy {
  private connection = new IORedis(
    process.env.REDIS_URL || "redis://localhost:6379",
    {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    },
  );
  private queues = new Map<string, Queue>();
  async add(
    name: "email" | "ai-match" | "resume",
    data: Record<string, unknown>,
    jobId?: string,
  ) {
    try {
      if (this.connection.status === "wait") await this.connection.connect();
      const queue =
        this.queues.get(name) ||
        new Queue(name, { connection: this.connection });
      this.queues.set(name, queue);
      await queue.add(name, data, {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      return true;
    } catch {
      return false;
    }
  }
  async failedCount() {
    try {
      if (this.connection.status === "wait") await this.connection.connect();
      const queues = ["email", "ai-match", "resume"].map((name) => {
        const queue =
          this.queues.get(name) ||
          new Queue(name, { connection: this.connection });
        this.queues.set(name, queue);
        return queue;
      });
      const counts = await Promise.all(
        queues.map((queue) => queue.getFailedCount()),
      );
      return counts.reduce((total, count) => total + count, 0);
    } catch {
      return 0;
    }
  }
  async onModuleDestroy() {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    if (this.connection.status === "ready") await this.connection.quit();
    else this.connection.disconnect();
  }
}
