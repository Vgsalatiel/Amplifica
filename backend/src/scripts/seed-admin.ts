/**
 * Cria (ou promove) o primeiro administrador. Uso:
 *
 *   ADMIN_EMAIL=... ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run seed:admin
 *
 * Os três valores também podem ficar no .env. Rodar de novo não duplica nada:
 * se a conta já existe, só garante o papel ADMIN, sem trocar a senha.
 */
import { NestFactory } from '@nestjs/core';
import { PasswordHasher } from '@nestjs/authentication';
import { AppModule } from '../app.module.js';
import { registerSchema } from '../modules/auth/auth.schemas.js';
import { PrismaService } from '../prisma/prisma.service.js';

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});

try {
  const input = registerSchema.safeParse({
    email: process.env['ADMIN_EMAIL'],
    username: process.env['ADMIN_USERNAME'],
    password: process.env['ADMIN_PASSWORD'],
  });
  if (!input.success) {
    const problems = input.error.issues
      .map(
        (issue) =>
          `- ADMIN_${String(issue.path[0]).toUpperCase()}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(
      `Defina ADMIN_EMAIL, ADMIN_USERNAME e ADMIN_PASSWORD.\n${problems}`,
    );
  }

  const prisma = app.get(PrismaService);
  const { email, username, password } = input.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log(
      `A conta ${email} já existia e agora é ADMIN. A senha não foi alterada.`,
    );
  } else {
    await prisma.user.create({
      data: {
        email,
        username,
        displayName: username,
        role: 'ADMIN',
        passwordHash: await app.get(PasswordHasher).hash(password),
      },
    });
    console.log(`Administrador ${email} criado.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
