import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "./http-exception.filter";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use(helmet());
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableCors({
    origin: process.env.WEB_ORIGIN || "http://localhost:5173",
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle("HireHub API")
    .setDescription("Recruitment platform API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, config),
  );
  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  await app.listen(port);
  console.log(
    `HireHub API: http://localhost:${port}/api`,
  );
}
bootstrap();
